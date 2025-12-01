import * as THREE from 'three';
import { InputManager, InputState } from '../engine/InputManager';
import { Planet } from '../planet/Planet';
import { HexBlockType } from '../planet/HexBlock';
import { PlayerConfig } from '../config/PlayerConfig';

export interface CelestialBody {
  planet: Planet;
  gravityFullRadius?: number;    // Distance for 100% gravity (defaults to planet.radius * config)
  gravityFalloffRadius?: number; // Distance where gravity reaches 0% (defaults to planet.radius * config)
  gravityStrength?: number;      // Gravity multiplier (defaults to 1.0)
}

export class PlanetPlayer {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;

  private inputManager: InputManager;
  private planets: CelestialBody[] = [];
  private currentPlanet: Planet | null = null;

  // Local orientation on the planet surface
  private localUp: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private localForward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private localRight: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

  // Space flight mode - uses quaternion for full 6DOF
  private orientation: THREE.Quaternion = new THREE.Quaternion();
  private isInSpace: boolean = false;

  // Gravity transition - timed roll correction
  private transitionTimer: number = 0; // Counts down during transition

  private isGrounded: boolean = false;
  private isJetpacking: boolean = false;
  private isInWater: boolean = false;
  private hasDoubleJumped: boolean = false; // Track if double-jump/jetpack was activated this airborne session

  // Jump drift detection
  private jumpStartPosition: THREE.Vector3 | null = null;
  private jumpStartSpherical: { theta: number; phi: number } | null = null;
  private wasdPressedDuringJump: boolean = false;
  private jumpDirection: THREE.Vector3 | null = null; // Fixed direction for gravity during jump

  constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager, planet: Planet) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.addPlanet(planet); // Use default gravity config based on planet radius
    this.currentPlanet = planet;
    this.velocity = new THREE.Vector3();

    // Start on the surface of the planet
    this.position = new THREE.Vector3(0, planet.radius + 5, 0);
    this.updateLocalOrientation();
    this.updateOrientationFromLocal();
  }

  public addPlanet(
    planet: Planet,
    options?: { gravityFullRadius?: number; gravityFalloffRadius?: number; gravityStrength?: number }
  ): void {
    this.planets.push({
      planet,
      gravityFullRadius: options?.gravityFullRadius,
      gravityFalloffRadius: options?.gravityFalloffRadius,
      gravityStrength: options?.gravityStrength,
    });
  }

  private updateOrientationFromLocal(): void {
    // Build orientation quaternion from local axes
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(this.localRight, this.localUp, this.localForward.clone().negate());
    this.orientation.setFromRotationMatrix(matrix);
  }

  private updateLocalFromOrientation(): void {
    // Extract local axes from orientation quaternion
    const matrix = new THREE.Matrix4().makeRotationFromQuaternion(this.orientation);
    this.localRight.setFromMatrixColumn(matrix, 0);
    this.localUp.setFromMatrixColumn(matrix, 1);
    this.localForward.setFromMatrixColumn(matrix, 2).negate();
  }

  private updateLocalOrientation(): void {
    if (!this.currentPlanet) return;

    // Local "up" is away from planet center
    this.localUp = this.currentPlanet.getSurfaceNormal(this.position);

    // Maintain forward direction but keep it perpendicular to up
    const tempForward = this.localForward.clone();
    tempForward.sub(this.localUp.clone().multiplyScalar(tempForward.dot(this.localUp)));

    if (tempForward.lengthSq() > 0.001) {
      this.localForward = tempForward.normalize();
    } else {
      this.localForward = new THREE.Vector3(1, 0, 0);
      this.localForward.sub(this.localUp.clone().multiplyScalar(this.localForward.dot(this.localUp)));
      this.localForward.normalize();
    }

    this.localRight = new THREE.Vector3().crossVectors(this.localForward, this.localUp).normalize();
    this.localForward = new THREE.Vector3().crossVectors(this.localUp, this.localRight).normalize();
  }

  private getAltitudeFromPlanet(planet: Planet): number {
    return this.position.distanceTo(planet.center) - planet.radius;
  }

  // Convert position to spherical coordinates relative to planet center
  private positionToSpherical(position: THREE.Vector3, planet: Planet): { theta: number; phi: number; radius: number } {
    const relative = position.clone().sub(planet.center);
    const radius = relative.length();
    const theta = Math.atan2(relative.x, relative.z); // Azimuthal angle (around Y axis)
    const phi = Math.acos(relative.y / radius); // Polar angle (from Y axis)
    return { theta, phi, radius };
  }

  // Check for spherical coordinate drift after landing from a jump
  private checkJumpDrift(): void {
    // Only check if we have a valid jump start and WASD was never pressed
    if (!this.jumpStartPosition || !this.jumpStartSpherical || !this.currentPlanet) {
      return;
    }

    if (this.wasdPressedDuringJump) {
      // WASD was pressed, so any drift is expected - clear tracking
      this.jumpStartPosition = null;
      this.jumpStartSpherical = null;
      this.jumpDirection = null;
      return;
    }

    // Calculate landing spherical coordinates
    const landingSpherical = this.positionToSpherical(this.position, this.currentPlanet);

    // Calculate angular drift in degrees
    const thetaDrift = (landingSpherical.theta - this.jumpStartSpherical.theta) * (180 / Math.PI);
    const phiDrift = (landingSpherical.phi - this.jumpStartSpherical.phi) * (180 / Math.PI);

    // Calculate arc distance on the sphere (more intuitive metric)
    const arcDistance = this.jumpStartPosition.distanceTo(this.position);

    // Only log if there's meaningful drift (threshold: 0.01 degrees or 0.01 units)
    if (Math.abs(thetaDrift) > 0.01 || Math.abs(phiDrift) > 0.01 || arcDistance > 0.01) {
      console.log('=== JUMP DRIFT DETECTED ===');
      console.log('Jump start position:', {
        x: this.jumpStartPosition.x.toFixed(4),
        y: this.jumpStartPosition.y.toFixed(4),
        z: this.jumpStartPosition.z.toFixed(4),
      });
      console.log('Landing position:', {
        x: this.position.x.toFixed(4),
        y: this.position.y.toFixed(4),
        z: this.position.z.toFixed(4),
      });
      console.log('Spherical drift:', {
        theta: thetaDrift.toFixed(4) + '°',
        phi: phiDrift.toFixed(4) + '°',
      });
      console.log('Arc distance:', arcDistance.toFixed(4) + ' units');
      console.log('===========================');
    }

    // Clear tracking
    this.jumpStartPosition = null;
    this.jumpStartSpherical = null;
    this.jumpDirection = null;
  }

  private getAltitude(): number {
    if (!this.currentPlanet) return Infinity;
    return this.getAltitudeFromPlanet(this.currentPlanet);
  }

  // Find the closest planet and calculate gravity influence
  private findClosestPlanetAndGravity(): { planet: Planet | null; gravityMultiplier: number; altitude: number } {
    let closestPlanet: Planet | null = null;
    let closestGravity = 0;
    let closestAltitude = Infinity;

    for (const body of this.planets) {
      const distToCenter = this.position.distanceTo(body.planet.center);
      const altitude = distToCenter - body.planet.radius;

      // Use per-planet gravity radii, or fall back to config defaults (as multipliers of planet radius)
      const gravityFullRadius = body.gravityFullRadius ?? (body.planet.radius * PlayerConfig.GRAVITY_FULL_RADIUS);
      const gravityFalloffRadius = body.gravityFalloffRadius ?? (body.planet.radius * PlayerConfig.GRAVITY_FALLOFF_RADIUS);
      const gravityStrength = body.gravityStrength ?? 1.0;

      // Check if within gravity radius
      if (distToCenter < gravityFalloffRadius) {
        let gravityMult = 0;
        if (distToCenter <= gravityFullRadius) {
          gravityMult = 1.0;
        } else {
          const falloffRange = gravityFalloffRadius - gravityFullRadius;
          const distInFalloff = distToCenter - gravityFullRadius;
          const falloffProgress = Math.min(1, distInFalloff / falloffRange);
          gravityMult = 1.0 - falloffProgress;
        }

        // Apply per-planet gravity strength
        gravityMult *= gravityStrength;

        if (gravityMult > closestGravity) {
          closestGravity = gravityMult;
          closestPlanet = body.planet;
          closestAltitude = altitude;
        }
      }
    }

    return { planet: closestPlanet, gravityMultiplier: closestGravity, altitude: closestAltitude };
  }

  private getGravityMultiplier(): number {
    const { gravityMultiplier } = this.findClosestPlanetAndGravity();
    return gravityMultiplier;
  }

  public update(deltaTime: number): void {
    const input = this.inputManager.getState();

    // Check gravity and determine flight mode
    const { planet, gravityMultiplier } = this.findClosestPlanetAndGravity();

    const wasInSpace = this.isInSpace;
    this.isInSpace = gravityMultiplier === 0;

    // Transitioning from space to gravity well
    if (wasInSpace && !this.isInSpace && planet) {
      this.transitionTimer = PlayerConfig.ROLL_SLERP_DURATION;
      this.currentPlanet = planet;
      // No rotation changes - just start the timed roll slerp
    }

    // Transitioning from gravity to space
    if (!wasInSpace && this.isInSpace) {
      this.transitionTimer = 0; // Stop any ongoing transition
      // No rotation changes - just enable 6DOF controls
      this.updateOrientationFromLocal();
    }

    // Update current planet reference
    if (planet && !this.isInSpace) {
      this.currentPlanet = planet;
    }

    if (this.isInSpace) {
      // Space flight mode - 6DOF controls
      this.handleSpaceMouseLook(input, deltaTime);
      this.handleSpaceMovement(input, deltaTime);
      this.handleSpaceRoll(input, deltaTime);
      // Note: updateLocalFromOrientation is called within each handler
    } else {
      // Planet mode - mouse look, but up vector must align with gravity
      this.handleSpaceMouseLook(input, deltaTime);

      if (this.transitionTimer > 0) {
        // During transition: slerp roll to level
        this.transitionTimer -= deltaTime;
        this.slerpRollToLevel(deltaTime);
      } else {
        // After transition or already on planet: force immediate alignment
        this.alignUpWithGravity();
      }

      this.handleMovement(input, deltaTime);
      this.handleJetpack(input, deltaTime);
      this.applyGravity(deltaTime);
    }

    this.updateCamera();
    this.updateUI();
  }

  // Instantly align camera up with gravity direction, preserving look direction
  // Called every frame when inside gravity field (after transition is complete)
  private alignUpWithGravity(): void {
    if (!this.currentPlanet) return;

    // Get planet's "up" at our position (opposite of gravity direction)
    const planetUp = this.currentPlanet.getSurfaceNormal(this.position);

    // Get our current look direction (camera looks along -localForward)
    const lookDir = this.localForward.clone().negate();

    // Calculate what the camera's "up" should be to be level with planet
    // It should be perpendicular to look direction and as close to planetUp as possible
    const targetCameraUp = planetUp.clone();
    targetCameraUp.sub(lookDir.clone().multiplyScalar(planetUp.dot(lookDir)));

    if (targetCameraUp.lengthSq() < 0.001) {
      // Looking straight up or down relative to planet - can't determine roll
      return;
    }
    targetCameraUp.normalize();

    // Set up immediately to target (no slerp)
    this.localUp.copy(targetCameraUp);

    // Recompute right to maintain orthogonality (forward stays the same!)
    this.localRight = new THREE.Vector3().crossVectors(this.localForward, this.localUp).normalize();
    // Re-orthogonalize up to ensure perfect orthonormal basis
    this.localUp = new THREE.Vector3().crossVectors(this.localRight, this.localForward).normalize();

    // Update the orientation quaternion from our local axes
    this.updateOrientationFromLocal();
  }

  // Slerp only the roll component to level the camera relative to planet surface
  // This preserves look direction but smoothly corrects the "tilt"
  // Only called during transition period (transitionTimer > 0)
  private slerpRollToLevel(deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Get planet's "up" at our position
    const planetUp = this.currentPlanet.getSurfaceNormal(this.position);

    // Get our current look direction (camera looks along -localForward)
    const lookDir = this.localForward.clone().negate();

    // Calculate what the camera's "up" should be to be level
    // It should be perpendicular to look direction and as close to planetUp as possible
    // targetCameraUp = planetUp - (planetUp . lookDir) * lookDir, then normalize
    const targetCameraUp = planetUp.clone();
    targetCameraUp.sub(lookDir.clone().multiplyScalar(planetUp.dot(lookDir)));

    if (targetCameraUp.lengthSq() < 0.001) {
      // Looking straight up or down relative to planet - no roll correction needed
      this.transitionTimer = 0;
      return;
    }
    targetCameraUp.normalize();

    // Slerp our current up toward the target up
    const slerpFactor = Math.min(1, PlayerConfig.ROLL_SLERP_SPEED * deltaTime);
    this.localUp.lerp(targetCameraUp, slerpFactor).normalize();

    // Recompute right to maintain orthogonality (forward stays the same!)
    this.localRight = new THREE.Vector3().crossVectors(this.localForward, this.localUp).normalize();
    // Re-orthogonalize up to ensure perfect orthonormal basis
    this.localUp = new THREE.Vector3().crossVectors(this.localRight, this.localForward).normalize();

    // Update the orientation quaternion from our local axes
    this.updateOrientationFromLocal();

    // Check if we've reached level - stop early if already aligned
    const angleDiff = this.localUp.angleTo(targetCameraUp);
    if (angleDiff < 0.01) {
      this.transitionTimer = 0;
    }
  }

  private handleSpaceMouseLook(input: InputState, _deltaTime: number): void {
    if (!this.inputManager.isLocked()) return;

    // Yaw - rotate around local up axis
    const yawDelta = -input.mouseX * PlayerConfig.MOUSE_SENSITIVITY;
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(this.localUp, yawDelta);
    this.orientation.premultiply(yawQuat);

    // Pitch - rotate around local right axis (positive mouseY = look down)
    let pitchDelta = input.mouseY * PlayerConfig.MOUSE_SENSITIVITY;

    // Clamp pitch when inside gravity field (not in space)
    if (!this.isInSpace && this.currentPlanet) {
      const planetUp = this.currentPlanet.getSurfaceNormal(this.position);
      const lookDir = this.localForward.clone().negate(); // Camera looks along -localForward

      // Calculate current pitch angle relative to horizon (planetUp-perpendicular plane)
      // Pitch = angle between lookDir and horizon plane
      // sin(pitch) = lookDir . planetUp
      const currentPitchSin = lookDir.dot(planetUp);
      const currentPitch = Math.asin(Math.max(-1, Math.min(1, currentPitchSin)));

      // Clamp to ±89.5 degrees (in radians: ±1.5621 rad)
      const maxPitch = 89.5 * Math.PI / 180;
      const newPitch = currentPitch + pitchDelta;

      if (newPitch > maxPitch) {
        pitchDelta = maxPitch - currentPitch;
      } else if (newPitch < -maxPitch) {
        pitchDelta = -maxPitch - currentPitch;
      }
    }

    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(this.localRight, pitchDelta);
    this.orientation.premultiply(pitchQuat);

    this.orientation.normalize();
    this.updateLocalFromOrientation();
  }

  private handleSpaceRoll(input: InputState, deltaTime: number): void {
    let rollAmount = 0;
    if (input.rollLeft) rollAmount += PlayerConfig.ROLL_SPEED * deltaTime;
    if (input.rollRight) rollAmount -= PlayerConfig.ROLL_SPEED * deltaTime;

    if (rollAmount !== 0) {
      // Roll around the forward axis (the direction we're looking)
      // In space, forward is -localForward (camera looks down -Z in local space)
      const lookDir = this.localForward.clone().negate();
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(lookDir, rollAmount);
      this.orientation.premultiply(rollQuat);
      this.orientation.normalize();
      this.updateLocalFromOrientation();
    }
  }

  private handleSpaceMovement(input: InputState, deltaTime: number): void {
    const moveDir = new THREE.Vector3();

    // In space mode, localForward points backward from camera, so negate for look direction
    const lookDir = this.localForward.clone().negate();

    // Forward/backward in camera look direction
    if (input.forward) moveDir.add(lookDir);
    if (input.backward) moveDir.sub(lookDir);

    // Strafe left/right
    if (input.left) moveDir.add(this.localRight);
    if (input.right) moveDir.sub(this.localRight);

    // Up/down relative to local up (space/ctrl)
    if (input.jump) moveDir.add(this.localUp);
    if (input.crouch) moveDir.sub(this.localUp);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const speed = input.sprint ? PlayerConfig.SPRINT_SPEED : PlayerConfig.SPACE_THRUST;
      this.velocity.addScaledVector(moveDir, speed * deltaTime);
    }

    // Apply drag in space
    this.velocity.multiplyScalar(0.98);

    // Apply velocity
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
  }

  private handleMovement(input: InputState, deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Update water state at start of movement so swimming uses current frame's state
    // Check at eye level for more intuitive "head above water" detection
    const planetUp = this.currentPlanet.getSurfaceNormal(this.position);
    const eyePosition = this.position.clone().addScaledVector(planetUp, PlayerConfig.PLAYER_EYE_HEIGHT - PlayerConfig.PLAYER_HEIGHT);
    this.isInWater = this.currentPlanet.isInWater(eyePosition);

    const moveDir = new THREE.Vector3();

    // Get horizontal movement direction from camera orientation
    // Project localForward onto tangent plane (perpendicular to planet up)
    // planetUp already declared above for water detection

    // Get forward direction projected onto tangent plane
    let tangentForward = this.localForward.clone().negate(); // Camera looks along -localForward
    tangentForward.sub(planetUp.clone().multiplyScalar(tangentForward.dot(planetUp)));
    if (tangentForward.lengthSq() > 0.001) {
      tangentForward.normalize();
    } else {
      // Looking straight up/down, use localUp projected onto tangent
      tangentForward = this.localUp.clone();
      tangentForward.sub(planetUp.clone().multiplyScalar(tangentForward.dot(planetUp)));
      tangentForward.normalize();
    }

    // Right is perpendicular to forward and planet up
    const tangentRight = new THREE.Vector3().crossVectors(tangentForward, planetUp).normalize();

    // Build movement direction from input
    if (input.forward) moveDir.add(tangentForward);
    if (input.backward) moveDir.sub(tangentForward);
    if (input.left) moveDir.sub(tangentRight);
    if (input.right) moveDir.add(tangentRight);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      let speed = input.sprint ? PlayerConfig.SPRINT_SPEED : PlayerConfig.WALK_SPEED * PlayerConfig.WALK_SPEED_MULTIPLIER;

      // Slow down movement in water
      if (this.isInWater) {
        speed *= PlayerConfig.WATER_MOVEMENT_MULTIPLIER;
      }

      const movement = moveDir.clone().multiplyScalar(speed * deltaTime);

      // Try to move - use iterative collision resolution
      this.resolveMovement(movement);
    }

    // Handle swimming (space in water)
    if (input.jump && this.isInWater) {
      // Swim upward
      this.velocity.addScaledVector(planetUp, PlayerConfig.WATER_SWIM_FORCE * deltaTime);
    }

    // Handle jumping - two-stage system:
    // Stage 1: Regular jump when grounded (uses jumpJustPressed for single press)
    // Stage 2: Double-jump activates jetpack when airborne (uses jumpJustPressed)
    if (input.jumpJustPressed && !this.isInWater) {
      if (this.isGrounded) {
        // Stage 1: Regular jump from ground
        const jumpDir = planetUp;

        // Clear any existing horizontal velocity for a clean vertical jump
        const verticalComponent = this.velocity.dot(planetUp);
        this.velocity.copy(planetUp).multiplyScalar(verticalComponent);

        // Add jump force
        this.velocity.addScaledVector(jumpDir, PlayerConfig.JUMP_FORCE);
        this.isGrounded = false;
        this.hasDoubleJumped = false; // Reset double-jump flag

        // Track jump start for drift detection and fix gravity direction
        if (this.currentPlanet) {
          this.jumpStartPosition = this.position.clone();
          const spherical = this.positionToSpherical(this.position, this.currentPlanet);
          this.jumpStartSpherical = { theta: spherical.theta, phi: spherical.phi };
          this.wasdPressedDuringJump = false;
          this.jumpDirection = planetUp.clone();
        }
      } else if (PlayerConfig.DOUBLE_JUMP_ENABLED && !this.hasDoubleJumped) {
        // Stage 2: Double-jump while airborne - activates jetpack
        this.hasDoubleJumped = true;
        if (PlayerConfig.DOUBLE_JUMP_ACTIVATES_JETPACK) {
          this.isJetpacking = true;
        }
      }
    }

    // Track if WASD was pressed during jump (invalidates drift detection)
    if (!this.isGrounded && (input.forward || input.backward || input.left || input.right)) {
      this.wasdPressedDuringJump = true;
    }
  }

  // Simple axis-aligned collision resolution (like picotron_raycaster)
  // Try full movement first, then try each axis independently for sliding
  private resolveMovement(movement: THREE.Vector3): void {
    if (!this.currentPlanet) return;

    const newPosition = this.position.clone().add(movement);

    // Try full movement first
    if (!this.checkCollision(newPosition)) {
      this.position.copy(newPosition);
      return;
    }

    // Collision detected - decompose movement into two orthogonal tangent directions
    // and try each independently (this is what makes sliding frictionless)

    // Get movement in local tangent space
    // Use localRight and localForward as our two axes
    const moveForward = this.localForward.clone().multiplyScalar(movement.dot(this.localForward));
    const moveRight = this.localRight.clone().multiplyScalar(movement.dot(this.localRight));

    // Try forward/backward movement only
    const forwardPos = this.position.clone().add(moveForward);
    if (!this.checkCollision(forwardPos)) {
      this.position.copy(forwardPos);
      // Now try adding right movement
      const finalPos = this.position.clone().add(moveRight);
      if (!this.checkCollision(finalPos)) {
        this.position.copy(finalPos);
      }
    } else {
      // Forward blocked, try right/left movement only
      const rightPos = this.position.clone().add(moveRight);
      if (!this.checkCollision(rightPos)) {
        this.position.copy(rightPos);
      }
      // If both fail, player doesn't move (wall corner)
    }
  }

  // Simple collision check - returns true if position is blocked
  private checkCollision(newPosition: THREE.Vector3): boolean {
    if (!this.currentPlanet) return false;

    // Only check step height when grounded - when airborne, we can jump over steps
    if (this.isGrounded) {
      if (!this.checkStepHeight(newPosition)) {
        return true; // Blocked by step (only matters when walking on ground)
      }
    }

    // Check wall collision (uses actual capsule position, works for both grounded and airborne)
    return this.checkWallCollision(newPosition);
  }

  // Check if step height is valid
  private checkStepHeight(newPosition: THREE.Vector3): boolean {
    if (!this.currentPlanet) return true;

    // Get current ground level (solid blocks only - skip air and water)
    const currentTile = this.currentPlanet.getTileAtPoint(this.position);
    let currentGroundDepth = 0;
    if (currentTile) {
      for (let d = 0; d < 16; d++) {
        const block = this.currentPlanet.getBlock(currentTile.index, d);
        if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
          currentGroundDepth = d;
          break;
        }
      }
    }
    const currentGroundRadius = this.currentPlanet.radius - currentGroundDepth;

    // Get ground level at new position (solid blocks only)
    const newTile = this.currentPlanet.getTileAtPoint(newPosition);
    let newGroundDepth = 0;
    if (newTile) {
      for (let d = 0; d < 16; d++) {
        const block = this.currentPlanet.getBlock(newTile.index, d);
        if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
          newGroundDepth = d;
          break;
        }
      }
    }
    const newGroundRadius = this.currentPlanet.radius - newGroundDepth;

    // Check step height
    const heightDiff = newGroundRadius - currentGroundRadius;
    return heightDiff <= PlayerConfig.AUTO_STEP_HEIGHT;
  }

  // Wall collision check - based on player's actual capsule position
  // Returns true if blocked
  private checkWallCollision(newPosition: THREE.Vector3): boolean {
    if (!this.currentPlanet) return false;

    const newTile = this.currentPlanet.getTileAtPoint(newPosition);
    if (!newTile) return false;

    // Player's actual feet position (radius from planet center)
    const playerFeetRadius = newPosition.distanceTo(this.currentPlanet.center);
    const playerHeadRadius = playerFeetRadius + PlayerConfig.PLAYER_HEIGHT;

    // Check neighboring tiles for walls
    for (const neighborIndex of newTile.neighbors) {
      // Find neighbor's ground level (top of solid ground - skip air and water)
      let neighborGroundDepth = 0;
      for (let d = 0; d < 16; d++) {
        const block = this.currentPlanet.getBlock(neighborIndex, d);
        if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
          neighborGroundDepth = d;
          break;
        }
      }
      const neighborGroundRadius = this.currentPlanet.radius - neighborGroundDepth;

      // A neighbor is a wall if its ground surface is within our capsule's vertical range
      // i.e., neighbor ground is between our feet and head
      // If neighbor ground is BELOW our feet, we can walk/jump over it
      // If neighbor ground is ABOVE our head, it's a ceiling (not handled here)
      const wallBlocksUs = neighborGroundRadius > playerFeetRadius && neighborGroundRadius <= playerHeadRadius + 0.5;

      if (wallBlocksUs) {
        const neighborTile = this.currentPlanet.getPolyhedron().tiles[neighborIndex];
        if (!neighborTile) continue;

        // Check horizontal distance to neighbor
        const actualUp = this.currentPlanet.getSurfaceNormal(newPosition);
        const neighborCenter = neighborTile.center.clone().normalize()
          .multiplyScalar(playerFeetRadius).add(this.currentPlanet.center);

        // Project both positions onto horizontal plane for distance check
        const toNeighbor = neighborCenter.clone().sub(newPosition);
        toNeighbor.sub(actualUp.clone().multiplyScalar(toNeighbor.dot(actualUp)));
        const horizontalDist = toNeighbor.length();

        // Collision if within player radius + tile size
        if (horizontalDist < PlayerConfig.PLAYER_RADIUS + 1.5) {
          return true; // Blocked by wall
        }
      }
    }

    return false;
  }

  // Check if position is valid (no collision with terrain at any capsule height)
  // Water blocks are passable - only solid blocks block movement
  private isPositionValid(position: THREE.Vector3): boolean {
    if (!this.currentPlanet) return true;

    const actualUp = this.currentPlanet.getSurfaceNormal(position);
    const playerDist = position.distanceTo(this.currentPlanet.center);

    // Check collision at multiple heights along the capsule
    const checkOffsets = [0, PlayerConfig.PLAYER_HEIGHT * 0.5, PlayerConfig.PLAYER_HEIGHT - 0.1];

    for (const offset of checkOffsets) {
      const checkRadius = playerDist + offset;
      const checkPos = this.currentPlanet.center.clone()
        .add(actualUp.clone().multiplyScalar(checkRadius));

      const tile = this.currentPlanet.getTileAtPoint(checkPos);
      if (!tile) continue;

      const depth = Math.floor((this.currentPlanet.radius - checkRadius) / 1);
      if (depth < 0 || depth >= 16) continue;

      // Check if inside a solid block (not AIR and not WATER - water is passable)
      const block = this.currentPlanet.getBlock(tile.index, depth);
      if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
        const blockOuterRadius = this.currentPlanet.radius - depth;
        if (checkRadius < blockOuterRadius) {
          return false; // Inside a solid block
        }
      }
    }

    return true;
  }

  private handleJetpack(input: InputState, deltaTime: number): void {
    if (!this.currentPlanet) return;

    // No jetpack in water - swimming is handled in handleMovement
    if (this.isInWater) {
      this.isJetpacking = false;
      return;
    }

    // Use fixed jump direction if available and WASD wasn't pressed during jump,
    // otherwise use actual radial direction
    const thrustUp = (this.jumpDirection && !this.wasdPressedDuringJump)
      ? this.jumpDirection
      : this.currentPlanet.getSurfaceNormal(this.position);

    // Jetpack only activates after double-jump (hasDoubleJumped = true)
    // Once activated, holding space continues to thrust upward
    if (this.hasDoubleJumped && input.jump && !this.isGrounded) {
      this.isJetpacking = true;
      // Thrust upward using consistent direction to prevent drift
      this.velocity.addScaledVector(thrustUp, PlayerConfig.JETPACK_FORCE * deltaTime);
    } else if (!input.jump) {
      // Only turn off jetpacking when space is released (not when grounded)
      this.isJetpacking = false;
    }

    // Jetpack down / descend (Ctrl) - only when jetpack is active
    if (this.hasDoubleJumped && input.crouch) {
      // Thrust downward (toward planet) - use same direction for consistency
      this.velocity.addScaledVector(thrustUp, -PlayerConfig.JETPACK_DOWN_FORCE * deltaTime);
    }
  }

  private applyGravity(deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Get actual up direction from planet (not localUp which may lag behind)
    const actualUp = this.currentPlanet.getSurfaceNormal(this.position);
    const currentDist = this.position.distanceTo(this.currentPlanet.center);

    // Water state is already updated in handleMovement for current frame
    // Don't re-check here to avoid timing issues

    // Get the tile at current position
    const currentTile = this.currentPlanet.getTileAtPoint(this.position);

    // Find ground level at current tile (skip water blocks - they're passable)
    let groundDepth = -1;
    if (currentTile) {
      for (let d = 0; d < 16; d++) {
        const block = this.currentPlanet.getBlock(currentTile.index, d);
        // Ground is solid blocks only (not air, not water)
        if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
          groundDepth = d;
          break;
        }
      }
    }

    // Calculate ground position for current tile
    const groundRadius = groundDepth >= 0 ? this.currentPlanet.radius - groundDepth : 0;
    const targetRadius = groundRadius + PlayerConfig.PLAYER_HEIGHT;

    // Check if currently on ground (solid blocks only)
    const onGround = groundDepth >= 0 && currentDist <= targetRadius + 0.05;

    if (onGround && this.velocity.dot(actualUp) <= 0) {
      // On the ground - stop vertical movement
      this.isGrounded = true;
      this.hasDoubleJumped = false; // Reset double-jump when landing
      this.isJetpacking = false;

      // Snap to ground at the correct radial distance (natural landing position)
      this.position.copy(this.currentPlanet.center).addScaledVector(actualUp, targetRadius);

      // Check for jump drift after snapping
      this.checkJumpDrift();

      // Remove downward velocity component
      const upComponent = this.velocity.dot(actualUp);
      if (upComponent < 0) {
        this.velocity.sub(actualUp.clone().multiplyScalar(upComponent));
      }
    } else {
      // In the air or water - apply gravity and movement
      this.isGrounded = false;

      // Use fixed jump direction if available and WASD wasn't pressed
      // This prevents tangential drift from gravity direction changing as position changes
      let gravityDir: THREE.Vector3;
      if (this.jumpDirection && !this.wasdPressedDuringJump) {
        // Use the fixed direction from when we jumped (negated for gravity)
        gravityDir = this.jumpDirection.clone().negate();
      } else {
        // Normal gravity calculation (for jetpack, WASD movement, etc.)
        gravityDir = this.currentPlanet.getGravityDirection(this.position);
      }

      const gravityMultiplier = this.getGravityMultiplier();
      let effectiveGravity = PlayerConfig.BASE_GRAVITY * gravityMultiplier;

      // Water physics - reduced gravity (sink slowly)
      if (this.isInWater) {
        effectiveGravity *= PlayerConfig.WATER_GRAVITY_MULTIPLIER;

        // Apply water drag to slow down movement
        this.velocity.multiplyScalar(1 - PlayerConfig.WATER_DRAG * deltaTime);
      }

      // Apply gravity (purely radial toward planet center)
      this.velocity.addScaledVector(gravityDir, effectiveGravity * deltaTime);

      // Add some drag when high up to prevent infinite acceleration
      const altitude = this.getAltitude();
      if (altitude > 20 && !this.isInWater) {
        this.velocity.multiplyScalar(0.99);
      }

      // Apply velocity
      const newPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
      const newDist = newPosition.distanceTo(this.currentPlanet.center);

      // Get ground at NEW position (might be different tile)
      // Skip water blocks - player can sink through water to solid ground
      const newTile = this.currentPlanet.getTileAtPoint(newPosition);
      let newGroundDepth = -1;
      if (newTile) {
        for (let d = 0; d < 16; d++) {
          const block = this.currentPlanet.getBlock(newTile.index, d);
          if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
            newGroundDepth = d;
            break;
          }
        }
      }

      const newGroundRadius = newGroundDepth >= 0 ? this.currentPlanet.radius - newGroundDepth : 0;
      const newTargetRadius = newGroundRadius + PlayerConfig.PLAYER_HEIGHT;

      // Check if this would be stepping UP (blocked by AUTO_STEP_HEIGHT)
      const heightDiff = newGroundRadius - groundRadius;
      const wouldStepUp = heightDiff > PlayerConfig.AUTO_STEP_HEIGHT;

      // Check if we would go below ground
      if (newGroundDepth >= 0 && newDist <= newTargetRadius) {
        if (wouldStepUp) {
          // Can't step up - stay at current position, stop horizontal velocity
          const upComponent = this.velocity.dot(actualUp);
          if (upComponent < 0) {
            this.velocity.sub(actualUp.clone().multiplyScalar(upComponent));
          }
          // Also remove horizontal velocity toward the step
          this.velocity.multiplyScalar(0.5);
        } else {
          // Land on ground - use natural landing position
          const landingDir = newPosition.clone().sub(this.currentPlanet.center).normalize();

          this.position.copy(this.currentPlanet.center).addScaledVector(landingDir, newTargetRadius);

          // Remove downward velocity
          const upComponent = this.velocity.dot(landingDir);
          if (upComponent < 0) {
            this.velocity.sub(landingDir.clone().multiplyScalar(upComponent));
          }

          // Check for jump drift after snapping
          this.checkJumpDrift();
          this.isGrounded = true;
        }
      } else {
        // Continue falling/moving - but check capsule collision
        if (this.isPositionValid(newPosition)) {
          this.position.copy(newPosition);
        } else {
          // Blocked - stop velocity
          const upComponent = this.velocity.dot(actualUp);
          if (upComponent < 0) {
            this.velocity.sub(actualUp.clone().multiplyScalar(upComponent));
          }
        }
      }
    }
  }

  private updateCamera(): void {
    const eyePos = this.position.clone();
    const eyeOffset = this.localUp.clone().multiplyScalar(PlayerConfig.PLAYER_EYE_HEIGHT - PlayerConfig.PLAYER_HEIGHT);
    eyePos.add(eyeOffset);
    this.camera.position.copy(eyePos);

    // Both modes use orientation-based camera (camera looks along -localForward)
    const lookDir = this.localForward.clone().negate();
    const target = eyePos.clone().add(lookDir);
    this.camera.up.copy(this.localUp);
    this.camera.lookAt(target);
  }

  private updateUI(): void {
    const posElement = document.getElementById('position');
    if (posElement) {
      const { altitude, gravityMultiplier } = this.findClosestPlanetAndGravity();

      let status = '';
      if (this.isInSpace) {
        status = ' [SPACE FLIGHT]';
      } else if (this.transitionTimer > 0) {
        status = ' [ENTERING GRAVITY]';
      } else if (this.isJetpacking) {
        status = ' [JETPACK]';
      } else if (!this.isGrounded) {
        status = ' [AIRBORNE]';
      }

      const altText = altitude === Infinity ? '∞' : altitude.toFixed(1);
      posElement.textContent = `Alt: ${altText} | Grav: ${(gravityMultiplier * 100).toFixed(0)}%${status}`;
    }
  }

  public getCurrentPlanet(): Planet | null {
    return this.currentPlanet;
  }

  public getForwardVector(): THREE.Vector3 {
    // Camera looks along -localForward
    return this.localForward.clone().negate();
  }

  public getRaycastOrigin(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public getIsInWater(): boolean {
    return this.isInWater;
  }
}
