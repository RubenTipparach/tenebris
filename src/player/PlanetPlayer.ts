import * as THREE from 'three';
import { InputManager, InputState } from '../engine/InputManager';
import { Planet } from '../planet/Planet';
import { HexBlockType } from '../planet/HexBlock';
import { PlayerConfig } from '../config/PlayerConfig';

export interface CelestialBody {
  planet: Planet;
  gravityRadius: number;  // Distance at which gravity affects player
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
  private targetUp: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private isTransitioningToGravity: boolean = false;

  private yaw: number = 0;
  private pitch: number = 0;

  private isGrounded: boolean = false;
  private isJetpacking: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager, planet: Planet) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.addPlanet(planet, 120); // Earth with gravity radius of 120
    this.currentPlanet = planet;
    this.velocity = new THREE.Vector3();

    // Start on the surface of the planet
    this.position = new THREE.Vector3(0, planet.radius + 5, 0);
    this.updateLocalOrientation();
    this.updateOrientationFromLocal();
  }

  public addPlanet(planet: Planet, gravityRadius: number): void {
    this.planets.push({ planet, gravityRadius });
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

      // Check if within gravity radius
      if (distToCenter < body.gravityRadius) {
        // Calculate gravity strength based on distance
        const gravityFalloffStart = body.planet.radius + 20;
        const gravityFalloffEnd = body.gravityRadius;

        let gravityMult = 0;
        if (distToCenter <= gravityFalloffStart) {
          gravityMult = 1.0;
        } else {
          const falloffRange = gravityFalloffEnd - gravityFalloffStart;
          const distInFalloff = distToCenter - gravityFalloffStart;
          const falloffProgress = Math.min(1, distInFalloff / falloffRange);
          gravityMult = 1.0 - falloffProgress;
        }

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
      this.isTransitioningToGravity = true;
      this.currentPlanet = planet;
      // Set target up vector (away from planet)
      this.targetUp = planet.getSurfaceNormal(this.position);

      // Convert current space look direction to yaw/pitch for planet mode
      // This preserves where the player is looking during the transition
      this.convertSpaceOrientationToPlanetYawPitch();
    }

    // Transitioning from gravity to space
    if (!wasInSpace && this.isInSpace) {
      this.isTransitioningToGravity = false;
      // Keep current orientation, just enable 6DOF
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
      // Planet mode - traditional FPS controls
      this.handleMouseLook(input);
      this.updateLocalOrientation();

      // Slerp up vector when transitioning to gravity
      if (this.isTransitioningToGravity) {
        this.slerpUpVector(deltaTime);
      }

      this.handleMovement(input, deltaTime);
      this.handleJetpack(input, deltaTime);
      this.applyGravity(deltaTime);
    }

    this.updateCamera();
    this.updateUI();
  }

  // Convert current space orientation (6DOF) to planet yaw/pitch while preserving look direction
  private convertSpaceOrientationToPlanetYawPitch(): void {
    // Get current look direction from space mode
    // In space, camera looks along -localForward
    const spaceLookDir = this.localForward.clone().negate();

    // Get the target up (planet surface normal)
    const newUp = this.targetUp.clone();

    // Create a temporary forward that's perpendicular to the new up
    // Project spaceLookDir onto the plane perpendicular to newUp to get the horizontal component
    const horizontalLook = spaceLookDir.clone();
    horizontalLook.sub(newUp.clone().multiplyScalar(horizontalLook.dot(newUp)));

    let tempForward: THREE.Vector3;
    if (horizontalLook.lengthSq() > 0.001) {
      tempForward = horizontalLook.normalize();
    } else {
      // Looking straight up or down - pick an arbitrary forward
      tempForward = new THREE.Vector3(1, 0, 0);
      tempForward.sub(newUp.clone().multiplyScalar(tempForward.dot(newUp)));
      if (tempForward.lengthSq() < 0.001) {
        tempForward.set(0, 0, 1);
        tempForward.sub(newUp.clone().multiplyScalar(tempForward.dot(newUp)));
      }
      tempForward.normalize();
    }

    // Create right vector
    const tempRight = new THREE.Vector3().crossVectors(tempForward, newUp).normalize();
    // Ensure forward is perpendicular
    tempForward = new THREE.Vector3().crossVectors(newUp, tempRight).normalize();

    // Calculate pitch: angle between look direction and horizontal plane
    const verticalComponent = spaceLookDir.dot(newUp);
    this.pitch = Math.asin(Math.max(-1, Math.min(1, verticalComponent)));
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

    // Calculate yaw: angle between horizontal look direction and localForward
    // We need to express yaw relative to the new localForward
    if (horizontalLook.lengthSq() > 0.001) {
      const normalizedHorizontal = horizontalLook.clone().normalize();
      // Yaw is the angle from tempForward to horizontalLook, measured around newUp
      const forwardDot = normalizedHorizontal.dot(tempForward);
      const rightDot = normalizedHorizontal.dot(tempRight);
      this.yaw = Math.atan2(rightDot, forwardDot);
    } else {
      this.yaw = 0;
    }

    // Set localForward/localRight to the new basis (will be updated during slerp)
    this.localForward = tempForward;
    this.localRight = tempRight;
    // localUp will be slerped toward targetUp
  }

  private slerpUpVector(deltaTime: number): void {
    // Smoothly interpolate the up vector toward the target
    const slerpFactor = Math.min(1, PlayerConfig.ORIENTATION_SLERP_SPEED * deltaTime);

    // Slerp the up vector
    this.localUp.lerp(this.targetUp, slerpFactor).normalize();

    // Recompute forward and right to be perpendicular to new up
    // Project current forward onto plane perpendicular to new up
    const tempForward = this.localForward.clone();
    tempForward.sub(this.localUp.clone().multiplyScalar(tempForward.dot(this.localUp)));

    if (tempForward.lengthSq() > 0.001) {
      this.localForward = tempForward.normalize();
    } else {
      // Forward was parallel to up, pick arbitrary perpendicular
      this.localForward.set(1, 0, 0);
      this.localForward.sub(this.localUp.clone().multiplyScalar(this.localForward.dot(this.localUp)));
      this.localForward.normalize();
    }

    this.localRight = new THREE.Vector3().crossVectors(this.localForward, this.localUp).normalize();
    this.localForward = new THREE.Vector3().crossVectors(this.localUp, this.localRight).normalize();

    // Check if we've reached the target
    const angleDiff = this.localUp.angleTo(this.targetUp);
    if (angleDiff < 0.01) {
      this.isTransitioningToGravity = false;
    }
  }

  private handleSpaceMouseLook(input: InputState, _deltaTime: number): void {
    if (!this.inputManager.isLocked()) return;

    // Yaw - rotate around local up axis
    const yawDelta = -input.mouseX * PlayerConfig.MOUSE_SENSITIVITY;
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(this.localUp, yawDelta);
    this.orientation.premultiply(yawQuat);

    // Pitch - rotate around local right axis (positive mouseY = look down)
    const pitchDelta = input.mouseY * PlayerConfig.MOUSE_SENSITIVITY;
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
    if (input.left) moveDir.sub(this.localRight);
    if (input.right) moveDir.add(this.localRight);

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

  private handleMouseLook(input: InputState): void {
    if (!this.inputManager.isLocked()) return;

    this.yaw += input.mouseX * PlayerConfig.MOUSE_SENSITIVITY;
    this.pitch -= input.mouseY * PlayerConfig.MOUSE_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  private handleMovement(input: InputState, deltaTime: number): void {
    let moveX = 0;
    let moveZ = 0;

    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    if ((moveX !== 0 || moveZ !== 0) && this.currentPlanet) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= length;
      moveZ /= length;

      const cosYaw = Math.cos(this.yaw);
      const sinYaw = Math.sin(this.yaw);
      const rotatedX = moveX * cosYaw - moveZ * sinYaw;
      const rotatedZ = moveX * sinYaw + moveZ * cosYaw;

      const worldDir = new THREE.Vector3()
        .addScaledVector(this.localRight, rotatedX)
        .addScaledVector(this.localForward, -rotatedZ)
        .normalize();

      const speed = input.sprint ? PlayerConfig.SPRINT_SPEED : PlayerConfig.WALK_SPEED;
      const movement = worldDir.clone().multiplyScalar(speed * deltaTime);

      // Try to move - use iterative collision resolution
      this.resolveMovement(movement);
    }

    // Handle jumping (only when grounded)
    if (input.jump && this.isGrounded && this.currentPlanet) {
      // Use actual radial direction for jump to ensure straight-up motion
      const jumpDir = this.currentPlanet.getSurfaceNormal(this.position);
      this.velocity.addScaledVector(jumpDir, PlayerConfig.JUMP_FORCE);
      this.isGrounded = false;
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

    // Get current ground level
    const currentTile = this.currentPlanet.getTileAtPoint(this.position);
    let currentGroundDepth = 0;
    if (currentTile) {
      for (let d = 0; d < 16; d++) {
        if (this.currentPlanet.getBlock(currentTile.index, d) !== HexBlockType.AIR) {
          currentGroundDepth = d;
          break;
        }
      }
    }
    const currentGroundRadius = this.currentPlanet.radius - currentGroundDepth;

    // Get ground level at new position
    const newTile = this.currentPlanet.getTileAtPoint(newPosition);
    let newGroundDepth = 0;
    if (newTile) {
      for (let d = 0; d < 16; d++) {
        if (this.currentPlanet.getBlock(newTile.index, d) !== HexBlockType.AIR) {
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
      // Find neighbor's ground level (top of solid ground)
      let neighborGroundDepth = 0;
      for (let d = 0; d < 16; d++) {
        if (this.currentPlanet.getBlock(neighborIndex, d) !== HexBlockType.AIR) {
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

      // Check if inside a solid block
      const block = this.currentPlanet.getBlock(tile.index, depth);
      if (block !== HexBlockType.AIR) {
        const blockOuterRadius = this.currentPlanet.radius - depth;
        if (checkRadius < blockOuterRadius) {
          return false; // Inside a block
        }
      }
    }

    return true;
  }

  private handleJetpack(input: InputState, deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Get actual radial direction for consistent thrust
    const actualUp = this.currentPlanet.getSurfaceNormal(this.position);

    // Jetpack up (Space when not grounded)
    if (input.jump && !this.isGrounded) {
      this.isJetpacking = true;
      // Thrust upward (away from planet) using actual radial direction
      this.velocity.addScaledVector(actualUp, PlayerConfig.JETPACK_FORCE * deltaTime);
    } else {
      this.isJetpacking = false;
    }

    // Jetpack down / descend (Ctrl)
    if (input.crouch) {
      // Thrust downward (toward planet)
      this.velocity.addScaledVector(actualUp, -PlayerConfig.JETPACK_DOWN_FORCE * deltaTime);
    }
  }

  private applyGravity(deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Get actual up direction from planet (not localUp which may lag behind)
    const actualUp = this.currentPlanet.getSurfaceNormal(this.position);
    const currentDist = this.position.distanceTo(this.currentPlanet.center);

    // Get the tile at current position
    const currentTile = this.currentPlanet.getTileAtPoint(this.position);

    // Find ground level at current tile
    let groundDepth = -1;
    if (currentTile) {
      for (let d = 0; d < 16; d++) {
        const block = this.currentPlanet.getBlock(currentTile.index, d);
        if (block !== HexBlockType.AIR) {
          groundDepth = d;
          break;
        }
      }
    }

    // Calculate ground position for current tile
    const groundRadius = groundDepth >= 0 ? this.currentPlanet.radius - groundDepth : 0;
    const targetRadius = groundRadius + PlayerConfig.PLAYER_HEIGHT;

    // Check if currently on ground
    const onGround = groundDepth >= 0 && currentDist <= targetRadius + 0.05;

    if (onGround && this.velocity.dot(actualUp) <= 0) {
      // On the ground - stop vertical movement
      this.isGrounded = true;
      // Snap to ground at current horizontal position
      this.position.copy(this.currentPlanet.center).addScaledVector(actualUp, targetRadius);

      // Remove downward velocity component
      const upComponent = this.velocity.dot(actualUp);
      if (upComponent < 0) {
        this.velocity.sub(actualUp.clone().multiplyScalar(upComponent));
      }
    } else {
      // In the air - apply gravity and movement
      this.isGrounded = false;

      const gravityDir = this.currentPlanet.getGravityDirection(this.position);
      const gravityMultiplier = this.getGravityMultiplier();
      const effectiveGravity = PlayerConfig.BASE_GRAVITY * gravityMultiplier;

      // Apply gravity (purely radial toward planet center)
      this.velocity.addScaledVector(gravityDir, effectiveGravity * deltaTime);

      // Add some drag when high up to prevent infinite acceleration
      const altitude = this.getAltitude();
      if (altitude > 20) {
        this.velocity.multiplyScalar(0.99);
      }

      // Apply velocity
      const newPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
      const newDist = newPosition.distanceTo(this.currentPlanet.center);

      // Get ground at NEW position (might be different tile)
      const newTile = this.currentPlanet.getTileAtPoint(newPosition);
      let newGroundDepth = -1;
      if (newTile) {
        for (let d = 0; d < 16; d++) {
          const block = this.currentPlanet.getBlock(newTile.index, d);
          if (block !== HexBlockType.AIR) {
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
          // Land on ground - use the NEW position's direction
          const landingDir = newPosition.clone().sub(this.currentPlanet.center).normalize();
          this.position.copy(this.currentPlanet.center).addScaledVector(landingDir, newTargetRadius);

          // Remove downward velocity
          const upComponent = this.velocity.dot(landingDir);
          if (upComponent < 0) {
            this.velocity.sub(landingDir.clone().multiplyScalar(upComponent));
          }

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

    if (this.isInSpace) {
      // In space mode, camera looks along -localForward (forward is stored as -Z direction)
      const lookDir = this.localForward.clone().negate();
      const target = eyePos.clone().add(lookDir);
      this.camera.up.copy(this.localUp);
      this.camera.lookAt(target);
    } else {
      // Planet mode uses yaw/pitch
      const cosYaw = Math.cos(this.yaw);
      const sinYaw = Math.sin(this.yaw);
      const cosPitch = Math.cos(this.pitch);
      const sinPitch = Math.sin(this.pitch);

      const forward = new THREE.Vector3()
        .addScaledVector(this.localForward, cosYaw)
        .addScaledVector(this.localRight, sinYaw)
        .normalize();

      const lookDir = new THREE.Vector3()
        .addScaledVector(forward, cosPitch)
        .addScaledVector(this.localUp, sinPitch)
        .normalize();

      const target = eyePos.clone().add(lookDir);
      this.camera.up.copy(this.localUp);
      this.camera.lookAt(target);
    }
  }

  private updateUI(): void {
    const posElement = document.getElementById('position');
    if (posElement) {
      const { altitude, gravityMultiplier } = this.findClosestPlanetAndGravity();

      let status = '';
      if (this.isInSpace) {
        status = ' [SPACE FLIGHT]';
      } else if (this.isTransitioningToGravity) {
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
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    const forward = new THREE.Vector3()
      .addScaledVector(this.localForward, cosYaw)
      .addScaledVector(this.localRight, sinYaw)
      .normalize();

    return new THREE.Vector3()
      .addScaledVector(forward, cosPitch)
      .addScaledVector(this.localUp, sinPitch)
      .normalize();
  }

  public getRaycastOrigin(): THREE.Vector3 {
    return this.camera.position.clone();
  }
}
