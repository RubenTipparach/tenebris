import * as THREE from 'three';
import { InputManager, InputState } from '../engine/InputManager';
import { Planet } from '../planet/Planet';
import { HexBlockType } from '../planet/HexBlock';

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

  // Movement constants
  private readonly WALK_SPEED = 8;
  private readonly SPRINT_SPEED = 14;
  private readonly JUMP_FORCE = 12;
  private readonly BASE_GRAVITY = 20;
  private readonly MOUSE_SENSITIVITY = 0.002;
  private readonly ROLL_SPEED = 2;
  private readonly PLAYER_HEIGHT = 1.8;
  private readonly PLAYER_EYE_HEIGHT = 1.6;
  private readonly PLAYER_RADIUS = 0.4; // Collision radius for wall detection

  // Jetpack constants
  private readonly JETPACK_FORCE = 25;
  private readonly JETPACK_DOWN_FORCE = 30;
  private readonly SPACE_THRUST = 15;
  private readonly ORIENTATION_SLERP_SPEED = 2;

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
    const slerpFactor = Math.min(1, this.ORIENTATION_SLERP_SPEED * deltaTime);

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
    const yawDelta = -input.mouseX * this.MOUSE_SENSITIVITY;
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(this.localUp, yawDelta);
    this.orientation.premultiply(yawQuat);

    // Pitch - rotate around local right axis (positive mouseY = look down)
    const pitchDelta = input.mouseY * this.MOUSE_SENSITIVITY;
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(this.localRight, pitchDelta);
    this.orientation.premultiply(pitchQuat);

    this.orientation.normalize();
    this.updateLocalFromOrientation();
  }

  private handleSpaceRoll(input: InputState, deltaTime: number): void {
    let rollAmount = 0;
    if (input.rollLeft) rollAmount += this.ROLL_SPEED * deltaTime;
    if (input.rollRight) rollAmount -= this.ROLL_SPEED * deltaTime;

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
      const speed = input.sprint ? this.SPRINT_SPEED : this.SPACE_THRUST;
      this.velocity.addScaledVector(moveDir, speed * deltaTime);
    }

    // Apply drag in space
    this.velocity.multiplyScalar(0.98);

    // Apply velocity
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
  }

  private handleMouseLook(input: InputState): void {
    if (!this.inputManager.isLocked()) return;

    this.yaw += input.mouseX * this.MOUSE_SENSITIVITY;
    this.pitch -= input.mouseY * this.MOUSE_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  private handleMovement(input: InputState, deltaTime: number): void {
    let moveX = 0;
    let moveZ = 0;

    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
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

      const speed = input.sprint ? this.SPRINT_SPEED : this.WALK_SPEED;
      const movement = worldDir.multiplyScalar(speed * deltaTime);

      // Try to move and check for wall collisions
      const newPosition = this.position.clone().add(movement);

      // Check if new position would collide with a wall
      if (!this.checkWallCollision(newPosition)) {
        this.position.copy(newPosition);
      }
      // No surface snapping - let gravity handle falling off ledges
    }

    // Handle jumping (only when grounded)
    if (input.jump && this.isGrounded) {
      this.velocity.addScaledVector(this.localUp, this.JUMP_FORCE);
      this.isGrounded = false;
    }
  }

  // Check if position would collide with a solid block at the player's height
  private checkWallCollision(newPosition: THREE.Vector3): boolean {
    if (!this.currentPlanet) return false;

    const playerDist = newPosition.length();
    const playerDepth = this.currentPlanet.getDepthAtPoint(newPosition);

    // Check collision at feet level and chest level
    const checkDepths = [playerDepth, playerDepth - 1];

    for (const depth of checkDepths) {
      if (depth < 0) continue;

      // Get the tile at the new position
      const tile = this.currentPlanet.getTileAtPoint(newPosition);
      if (!tile) continue;

      // Check if there's a solid block at this depth
      const block = this.currentPlanet.getBlock(tile.index, depth);
      if (block !== HexBlockType.AIR) {
        // Calculate the surface radius at this depth
        const blockOuterRadius = this.currentPlanet.radius - depth;
        const blockInnerRadius = blockOuterRadius - 1;

        // If player would be inside this block, it's a collision
        if (playerDist > blockInnerRadius && playerDist < blockOuterRadius + this.PLAYER_RADIUS) {
          return true;
        }
      }

      // Also check neighboring tiles for wall collisions
      for (const neighborIndex of tile.neighbors) {
        const neighborBlock = this.currentPlanet.getBlock(neighborIndex, depth);
        if (neighborBlock !== HexBlockType.AIR) {
          // Get neighbor tile center to check distance
          const neighborTile = this.currentPlanet.getPolyhedron().tiles[neighborIndex];
          if (neighborTile) {
            const neighborCenter = neighborTile.center.clone().normalize().multiplyScalar(playerDist);
            const distToNeighbor = newPosition.distanceTo(neighborCenter);

            // If we're close to a solid neighbor block, check for collision
            if (distToNeighbor < this.PLAYER_RADIUS + 2) {
              const blockOuterRadius = this.currentPlanet.radius - depth;
              if (playerDist < blockOuterRadius + this.PLAYER_RADIUS && playerDist > blockOuterRadius - 1) {
                return true;
              }
            }
          }
        }
      }
    }

    return false;
  }

  private handleJetpack(input: InputState, deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Jetpack up (Space when not grounded)
    if (input.jump && !this.isGrounded) {
      this.isJetpacking = true;
      // Thrust upward (away from planet)
      this.velocity.addScaledVector(this.localUp, this.JETPACK_FORCE * deltaTime);
    } else {
      this.isJetpacking = false;
    }

    // Jetpack down / descend (Ctrl)
    if (input.crouch) {
      // Thrust downward (toward planet)
      const gravityDir = this.currentPlanet.getGravityDirection(this.position);
      this.velocity.addScaledVector(gravityDir, this.JETPACK_DOWN_FORCE * deltaTime);
    }
  }

  private applyGravity(deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Get the tile at current position first
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

    // Calculate ground position
    const groundRadius = groundDepth >= 0 ? this.currentPlanet.radius - groundDepth : 0;
    const targetRadius = groundRadius + this.PLAYER_HEIGHT;
    const currentDist = this.position.distanceTo(this.currentPlanet.center);

    // Check if currently on ground
    const onGround = groundDepth >= 0 && currentDist <= targetRadius + 0.05;

    if (onGround && this.velocity.dot(this.localUp) <= 0) {
      // On the ground - stop vertical movement, allow horizontal
      this.isGrounded = true;
      const dirFromCenter = this.position.clone().sub(this.currentPlanet.center).normalize();
      this.position.copy(this.currentPlanet.center).addScaledVector(dirFromCenter, targetRadius);

      // Remove downward velocity component
      const upComponent = this.velocity.dot(this.localUp);
      if (upComponent < 0) {
        this.velocity.sub(this.localUp.clone().multiplyScalar(upComponent));
      }
    } else {
      // In the air - apply gravity and movement
      this.isGrounded = false;

      const gravityDir = this.currentPlanet.getGravityDirection(this.position);
      const gravityMultiplier = this.getGravityMultiplier();
      const effectiveGravity = this.BASE_GRAVITY * gravityMultiplier;

      this.velocity.addScaledVector(gravityDir, effectiveGravity * deltaTime);

      // Add some drag when high up to prevent infinite acceleration
      const altitude = this.getAltitude();
      if (altitude > 20) {
        this.velocity.multiplyScalar(0.99);
      }

      // Apply velocity
      const newPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
      const newDist = newPosition.distanceTo(this.currentPlanet.center);

      // Check if we would go below ground
      if (groundDepth >= 0 && newDist <= targetRadius) {
        // Land on ground
        const dirFromCenter = this.position.clone().sub(this.currentPlanet.center).normalize();
        this.position.copy(this.currentPlanet.center).addScaledVector(dirFromCenter, targetRadius);

        // Remove downward velocity
        const upComponent = this.velocity.dot(this.localUp);
        if (upComponent < 0) {
          this.velocity.sub(this.localUp.clone().multiplyScalar(upComponent));
        }

        this.isGrounded = true;
      } else {
        // Continue falling/moving
        this.position.copy(newPosition);
      }
    }
  }

  private updateCamera(): void {
    const eyePos = this.position.clone();
    const eyeOffset = this.localUp.clone().multiplyScalar(this.PLAYER_EYE_HEIGHT - this.PLAYER_HEIGHT);
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
