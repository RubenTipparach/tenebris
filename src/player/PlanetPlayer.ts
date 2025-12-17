import * as THREE from 'three';
import { InputManager, InputState } from '../engine/InputManager';
import { Planet } from '../planet/Planet';
import { HexBlockType } from '../planet/HexBlock';
import { PlayerConfig } from '../config/PlayerConfig';
import { AudioManager } from '../engine/AudioManager';
import {
  AUDIO_SETTINGS,
  SurfaceType,
  BLOCK_TO_SURFACE,
  SURFACE_TO_SOUND,
} from '../config/AudioConfig';

// Simple toast notification system
function showToast(message: string, duration: number = 3000): void {
  // Remove existing toast if any
  const existing = document.getElementById('transition-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'transition-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: #4CAF50;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'Jersey 10', monospace;
    font-size: 24px;
    border: 2px solid #4CAF50;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);

  // Fade in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Calculate max terrain depth for collision checks
const MAX_TERRAIN_DEPTH = PlayerConfig.TERRAIN_SEA_LEVEL + PlayerConfig.TERRAIN_MAX_DEPTH;

// Per-frame block column cache - stores block types for tiles already queried this frame
// Key: tileIndex, Value: array of block types indexed by depth
// This cache is cleared at the start of each update() call
let blockColumnCache: Map<number, HexBlockType[]> = new Map();
let blockColumnCachePlanet: Planet | null = null;

// Get block with caching - reduces redundant getBlock() calls per frame
function getCachedBlock(planet: Planet, tileIndex: number, depth: number): HexBlockType {
  // Invalidate cache if planet changed
  if (planet !== blockColumnCachePlanet) {
    blockColumnCache.clear();
    blockColumnCachePlanet = planet;
  }

  let column = blockColumnCache.get(tileIndex);
  if (!column) {
    // Cache miss - fetch entire column at once (more efficient than individual calls)
    column = new Array(MAX_TERRAIN_DEPTH);
    for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
      column[d] = planet.getBlock(tileIndex, d);
    }
    blockColumnCache.set(tileIndex, column);
  }

  return depth >= 0 && depth < MAX_TERRAIN_DEPTH ? column[depth] : HexBlockType.AIR;
}

// Clear the block column cache - called at start of each frame
function clearBlockCache(): void {
  blockColumnCache.clear();
}

// Helper: Find the walkable floor (air-to-solid transition) in a tile that's closest to a given radius
// Returns the depth of the best floor, or -1 if none found
// Depth system: 0 = bedrock, MAX_DEPTH-1 = sky
function findWalkableFloorAtRadius(planet: Planet, tileIndex: number, targetRadius: number): number {
  let bestDepth = -1;
  let bestDist = Infinity;

  for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
    // In new depth system: "above" is d+1 (toward sky), "below" is d-1 (toward bedrock)
    const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? getCachedBlock(planet, tileIndex, d + 1) : HexBlockType.AIR;
    const block = getCachedBlock(planet, tileIndex, d);

    const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
    const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;

    if (isAbovePassable && isCurrentSolid) {
      // This is a walkable floor at depth d
      const floorRadius = planet.depthToRadius(d);
      const dist = Math.abs(floorRadius - targetRadius);
      if (dist < bestDist) {
        bestDist = dist;
        bestDepth = d;
      }
    }
  }

  return bestDepth;
}

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

  // Surface camera angles (stable tracking to avoid gimbal lock issues)
  private surfacePitch: number = 0;
  // Horizontal look direction in world space (for yaw persistence as player walks)
  private surfaceForward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);

  // Gravity transition - timed roll correction
  private transitionTimer: number = 0; // Counts down during transition

  private isGrounded: boolean = false;
  private isJetpacking: boolean = false;
  private isInWater: boolean = false;       // True when eyes are underwater (for fog)
  private feetInWater: boolean = false;     // True when feet are underwater (for swimming physics)
  private isFloatingAtSurface: boolean = false; // True when player is floating at water surface (holding jump)
  private hasDoubleJumped: boolean = false; // Track if double-jump/jetpack was activated this airborne session
  private jetpackEnabled: boolean = true; // Whether jetpack/double-jump is available
  private isEnabled: boolean = true; // Whether player updates are enabled (disabled during rocket flight)

  // Stuck detection debug
  private lastPosition: THREE.Vector3 = new THREE.Vector3();
  private stuckFrameCount: number = 0;
  private wasdActiveFrames: number = 0;
  private lastStuckLogTime: number = 0;

  // Jump drift detection
  private jumpStartPosition: THREE.Vector3 | null = null;
  private jumpStartSpherical: { theta: number; phi: number } | null = null;
  private wasdPressedDuringJump: boolean = false;
  private jumpDirection: THREE.Vector3 | null = null; // Fixed direction for gravity during jump

  // Debug: Position logging after jump
  private jumpDebugTimer: number = 0;
  private jumpDebugStartPos: THREE.Vector3 | null = null;

  // Teleport detection (debug)
  private didJumpThisFrame: boolean = false;

  // Tech block data callback for Shift+X debug (set by PlanetBlockInteraction)
  private getTechBlockDataCallback: ((tileIndices: number[]) => {
    torches: { tileIndex: number }[];
    furnaces: { tileIndex: number }[];
    electricFurnaces: { tileIndex: number }[];
    electronicsWorkbenches: { tileIndex: number }[];
    storageChests: { tileIndex: number }[];
    steamEngines: { tileIndex: number }[];
    hydroGenerators: { tileIndex: number }[];
    copperPipes: { tileIndex: number; depth: number }[];
    cables: { tileIndex: number; depth: number }[];
  }) | null = null;

  // Audio state
  private lastFootstepTime: number = 0;
  private lastSwimSoundTime: number = 0;
  private lastDiveSoundTime: number = 0;
  private wasGrounded: boolean = true; // Track for landing detection
  private wasInWater: boolean = false; // Track for water entry detection

  constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager, planet: Planet) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.addPlanet(planet); // Use default gravity config based on planet radius
    this.currentPlanet = planet;
    this.velocity = new THREE.Vector3();

    // Start on the surface of the planet (1m above ground)
    // Use configured spawn lat/lon from PlayerConfig
    this.position = planet.getSpawnPositionAtLatLon(
      PlayerConfig.EARTH_SPAWN_LAT,
      PlayerConfig.EARTH_SPAWN_LON,
      1 // 1m above surface
    );
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

  // Check if player is near a tile edge and might be stuck on a higher neighbor
  // If so, nudge them toward the center of their current tile
  private checkEdgeNudge(): void {
    if (!this.currentPlanet) return;

    const currentTile = this.currentPlanet.getTileAtPointFast(this.position);
    if (!currentTile) return;

    // Get tile center
    const tileCenter = new THREE.Vector3(
      currentTile.center.x + this.currentPlanet.center.x,
      currentTile.center.y + this.currentPlanet.center.y,
      currentTile.center.z + this.currentPlanet.center.z
    );

    // Get player's current radius (feet level)
    const playerRadius = this.position.distanceTo(this.currentPlanet.center);

    // Find the walkable floor closest to player's current height
    // This is important during falling - we need the floor we're falling toward, not bedrock
    let currentGroundDepth = -1;
    let bestHeightDiff = Infinity;
    for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
      const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? getCachedBlock(this.currentPlanet, currentTile.index, d + 1) : HexBlockType.AIR;
      const block = getCachedBlock(this.currentPlanet, currentTile.index, d);
      const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
      const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;
      if (isAbovePassable && isCurrentSolid) {
        const floorRadius = this.currentPlanet.depthToRadius(d);
        const heightDiff = Math.abs(floorRadius - playerRadius);
        // Find the floor closest to player's current height (but below or at player level)
        if (floorRadius <= playerRadius + 0.5 && heightDiff < bestHeightDiff) {
          currentGroundDepth = d;
          bestHeightDiff = heightDiff;
        }
      }
    }

    if (currentGroundDepth < 0) return;
    const currentFloorRadius = this.currentPlanet.depthToRadius(currentGroundDepth);

    // Check neighbor tiles for higher floors that might trap the player
    const neighborIndices = currentTile.neighbors;
    if (!neighborIndices || neighborIndices.length === 0) return;

    // Get player position projected to surface (tangent plane)
    const actualUp = this.currentPlanet.getSurfaceNormal(this.position);
    const playerTangent = this.position.clone().sub(
      actualUp.clone().multiplyScalar(this.position.dot(actualUp) - tileCenter.dot(actualUp))
    );

    // Check if any neighbor has a higher floor and player body overlaps with it
    let needsNudge = false;
    const nudgeDir = new THREE.Vector3();

    for (const neighborIndex of neighborIndices) {
      // Get neighbor tile by index
      const neighborTile = this.currentPlanet.getTileByIndex(neighborIndex);
      if (!neighborTile) continue;

      // Find neighbor's walkable floor closest to player's height
      let neighborFloorDepth = -1;
      let neighborBestHeightDiff = Infinity;
      for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
        const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? getCachedBlock(this.currentPlanet, neighborIndex, d + 1) : HexBlockType.AIR;
        const block = getCachedBlock(this.currentPlanet, neighborIndex, d);
        const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
        const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;
        if (isAbovePassable && isCurrentSolid) {
          const floorRadius = this.currentPlanet.depthToRadius(d);
          const heightDiff = Math.abs(floorRadius - playerRadius);
          // Find the floor closest to player's current height (but below or at player level)
          if (floorRadius <= playerRadius + 0.5 && heightDiff < neighborBestHeightDiff) {
            neighborFloorDepth = d;
            neighborBestHeightDiff = heightDiff;
          }
        }
      }

      if (neighborFloorDepth < 0) continue;

      const neighborFloorRadius = this.currentPlanet.depthToRadius(neighborFloorDepth);

      // Check if neighbor floor is significantly higher (would block player)
      const heightDiff = neighborFloorRadius - currentFloorRadius;
      if (heightDiff <= PlayerConfig.AUTO_STEP_HEIGHT) continue; // Can step up, no problem

      // Calculate distance to neighbor tile center (on surface)
      const neighborCenter = new THREE.Vector3(
        neighborTile.center.x + this.currentPlanet.center.x,
        neighborTile.center.y + this.currentPlanet.center.y,
        neighborTile.center.z + this.currentPlanet.center.z
      );

      // Project neighbor center to same surface
      const neighborTangent = neighborCenter.clone().sub(
        actualUp.clone().multiplyScalar(neighborCenter.dot(actualUp) - tileCenter.dot(actualUp))
      );

      // Direction from current tile center to neighbor
      const toNeighbor = neighborTangent.clone().sub(tileCenter).normalize();

      // How far is player toward this neighbor?
      const playerFromCenter = playerTangent.clone().sub(tileCenter);
      const distTowardNeighbor = playerFromCenter.dot(toNeighbor);

      // Approximate tile radius (half the distance between tile centers)
      const tileRadius = tileCenter.distanceTo(neighborCenter) * 0.45;

      // If player is close to the edge toward this higher neighbor, nudge away
      if (distTowardNeighbor > tileRadius - PlayerConfig.PLAYER_RADIUS * 2) {
        needsNudge = true;
        // Nudge away from this neighbor (toward tile center)
        nudgeDir.sub(toNeighbor);
      }
    }

    if (needsNudge && nudgeDir.lengthSq() > 0.0001) {
      nudgeDir.normalize();

      // Apply a small nudge toward tile center (tangent to surface)
      const nudgeStrength = 0.075; // Subtle nudge
      const nudge = nudgeDir.multiplyScalar(nudgeStrength);

      // Project nudge onto tangent plane
      const nudgeTangent = nudge.clone().sub(actualUp.clone().multiplyScalar(nudge.dot(actualUp)));

      this.position.add(nudgeTangent);

      // Re-snap to maintain current height (don't change vertical position during falling)
      const newUp = this.currentPlanet.getSurfaceNormal(this.position);
      this.position.copy(this.currentPlanet.center).addScaledVector(newUp, playerRadius);
    }
  }

  private getAltitude(): number {
    if (!this.currentPlanet) return Infinity;
    return this.getAltitudeFromPlanet(this.currentPlanet);
  }

  // Get the surface type under the player for footstep sounds
  private getSurfaceTypeUnderPlayer(): SurfaceType {
    if (!this.currentPlanet) return SurfaceType.STONE;

    const currentTile = this.currentPlanet.getTileAtPointFast(this.position);
    if (!currentTile) return SurfaceType.STONE;

    const currentDist = this.position.distanceTo(this.currentPlanet.center);
    const groundDepth = findWalkableFloorAtRadius(this.currentPlanet, currentTile.index, currentDist);

    if (groundDepth < 0) return SurfaceType.STONE;

    const blockType = this.currentPlanet.getBlock(currentTile.index, groundDepth);
    return BLOCK_TO_SURFACE[blockType] ?? SurfaceType.STONE;
  }

  // Play footstep sound based on surface and movement speed
  private playFootstepSound(isSprinting: boolean): void {
    const now = performance.now() / 1000;
    const interval = isSprinting
      ? AUDIO_SETTINGS.FOOTSTEP_INTERVAL_SPRINT
      : AUDIO_SETTINGS.FOOTSTEP_INTERVAL_WALK;

    if (now - this.lastFootstepTime < interval) return;

    this.lastFootstepTime = now;
    const surfaceType = this.getSurfaceTypeUnderPlayer();
    const soundId = SURFACE_TO_SOUND[surfaceType];

    AudioManager.playWithVariation(soundId, {
      position: this.position.clone(),
    });
  }

  // Play swim sound when moving underwater
  private playSwimSound(): void {
    const now = performance.now() / 1000;
    const interval = AUDIO_SETTINGS.FOOTSTEP_INTERVAL_WALK * 1.5; // Slower interval for swimming

    if (now - this.lastSwimSoundTime < interval) return;

    this.lastSwimSoundTime = now;
    AudioManager.playWithVariation('swim', {
      position: this.position.clone(),
    });
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
    // Clear block column cache at start of each frame
    clearBlockCache();

    // Skip if player is disabled (e.g., in rocket flight mode)
    if (!this.isEnabled) {
      return;
    }

    // Skip movement updates when menu is open (pointer not locked)
    if (!this.inputManager.isLocked()) {
      // Still update camera position to match player
      this.updateCamera();
      return;
    }

    const input = this.inputManager.getState();

    // Check gravity and determine flight mode
    const { planet, gravityMultiplier } = this.findClosestPlanetAndGravity();

    const wasInSpace = this.isInSpace;
    this.isInSpace = gravityMultiplier === 0;

    // Helper to log rotation values
    const logRotation = (label: string) => {
      const euler = new THREE.Euler().setFromQuaternion(this.orientation, 'YXZ');
      const pitchDeg = (euler.x * 180 / Math.PI).toFixed(1);
      const yawDeg = (euler.y * 180 / Math.PI).toFixed(1);
      const rollDeg = (euler.z * 180 / Math.PI).toFixed(1);
      console.log(`[${label}] pitch: ${pitchDeg}° yaw: ${yawDeg}° roll: ${rollDeg}° | surfacePitch: ${(this.surfacePitch * 180 / Math.PI).toFixed(1)}°`);
    };

    // Transitioning from space to gravity well
    if (wasInSpace && !this.isInSpace && planet) {
      logRotation('ENTERING ATMOSPHERE - BEFORE');
      showToast('Entering Atmosphere', 3000);
      this.transitionTimer = PlayerConfig.ROLL_SLERP_DURATION;
      this.currentPlanet = planet;
      // No rotation changes - just start the timed roll slerp
      logRotation('ENTERING ATMOSPHERE - AFTER');
    }

    // Transitioning from gravity to space
    if (!wasInSpace && this.isInSpace) {
      logRotation('ENTERING SPACE - BEFORE');
      showToast('Entering Space', 3000);
      this.transitionTimer = 0; // Stop any ongoing transition
      // No rotation changes - just enable 6DOF controls
      this.updateOrientationFromLocal();
      logRotation('ENTERING SPACE - AFTER');
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
      if (this.transitionTimer > 0) {
        // During transition from space: slerp roll to level while allowing mouse look
        // Use space-style mouse look (modifies orientation directly) instead of
        // planet-style (which rebuilds from surfaceForward/surfacePitch)
        this.handleTransitionMouseLook(input, deltaTime);
        this.slerpRollToLevel(deltaTime);

        const euler = new THREE.Euler().setFromQuaternion(this.orientation, 'YXZ');
        const rollDeg = (euler.z * 180 / Math.PI).toFixed(1);
        const pitchDeg = (euler.x * 180 / Math.PI).toFixed(1);
        //console.log(`[TRANSITIONING] timer: ${this.transitionTimer.toFixed(2)}s | roll: ${rollDeg}° pitch: ${pitchDeg}°`);

        this.transitionTimer -= deltaTime;

        // When transition ends, sync surfaceForward from current orientation
        if (this.transitionTimer <= 0) {
          this.syncSurfaceStateFromOrientation();
          console.log('[TRANSITION COMPLETE] Synced surfaceForward from orientation');
        }
      } else {
        // Planet mode - mouse look handles gravity alignment via pitch/yaw
        this.handleSpaceMouseLook(input, deltaTime);
      }
      // Note: alignUpWithGravity is NOT called here because handleSpaceMouseLook
      // already handles gravity alignment through the pitch/yaw system

      // Track radius before movement for teleport detection
      const radiusBefore = this.currentPlanet
        ? this.position.distanceTo(this.currentPlanet.center)
        : 0;
      this.didJumpThisFrame = false;

      this.handleMovement(input, deltaTime);
      this.handleJetpack(input, deltaTime);
      this.applyGravity(deltaTime);

      // Debug: Detect unexpected upward teleports while holding W
      if (this.currentPlanet && input.forward && !this.didJumpThisFrame) {
        const radiusAfter = this.position.distanceTo(this.currentPlanet.center);
        const radiusChange = radiusAfter - radiusBefore;
        // Teleport detection: moved up more than 0.5 units without jumping
        if (radiusChange > 0.5) {
          const currentTile = this.currentPlanet.getTileAtPointFast(this.position);
          console.error(`========== UNEXPECTED UPWARD TELEPORT ==========`);
          console.error(`Radius change: ${radiusBefore.toFixed(2)} -> ${radiusAfter.toFixed(2)} (+${radiusChange.toFixed(2)})`);
          console.error(`Current tile: ${currentTile?.index}`);
          console.error(`isGrounded: ${this.isGrounded}, didJumpThisFrame: ${this.didJumpThisFrame}`);

          // Log the tile's block structure
          if (currentTile) {
            console.error(`Block column at current tile:`);
            for (let d = 0; d < 20; d++) {
              const block = this.currentPlanet.getBlock(currentTile.index, d);
              const blockRadius = this.currentPlanet.depthToRadius(d);
              let sym = block === 0 ? '.' : block === 4 ? '~' : '#';
              const marker = Math.abs(blockRadius - radiusAfter) < 1 ? ' <-- PLAYER' : '';
              console.error(`  d${d} (r${blockRadius}): ${sym}${marker}`);
            }
          }
          console.error(`================================================`);
        }
      }

      // Debug: Check if player is stuck
      this.checkIfStuck(input);

      // Debug: Shift+X to log cave structure
      if (input.sprint && this.inputManager.isKeyPressed('KeyX')) {
        this.logCaveStructure();
      }

      // Debug: Log position for 5 seconds after jump
      if (this.jumpDebugTimer > 0 && this.currentPlanet) {
        this.jumpDebugTimer -= deltaTime;
        const spherical = this.positionToSpherical(this.position, this.currentPlanet);
        const elapsed = (5.0 - this.jumpDebugTimer).toFixed(3);

        // Calculate drift from start position
        let driftInfo = '';
        if (this.jumpDebugStartPos) {
          const drift = this.position.distanceTo(this.jumpDebugStartPos);
          const startSpherical = this.positionToSpherical(this.jumpDebugStartPos, this.currentPlanet);
          const thetaDrift = ((spherical.theta - startSpherical.theta) * 180 / Math.PI).toFixed(4);
          const phiDrift = ((spherical.phi - startSpherical.phi) * 180 / Math.PI).toFixed(4);
          driftInfo = ` | drift=${drift.toFixed(4)} (θ:${thetaDrift}° φ:${phiDrift}°)`;
        }

        console.log(`[${elapsed}s] pos=(${this.position.x.toFixed(4)}, ${this.position.y.toFixed(4)}, ${this.position.z.toFixed(4)}) | θ=${(spherical.theta * 180 / Math.PI).toFixed(4)}° φ=${(spherical.phi * 180 / Math.PI).toFixed(4)}° r=${spherical.radius.toFixed(4)} | grounded=${this.isGrounded} vel=(${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})${driftInfo}`);

        if (this.jumpDebugTimer <= 0) {
          console.log('=== JUMP DEBUG END ===');
          this.jumpDebugStartPos = null;
        }
      }
    }

    this.updateCamera();
    this.updateUI();

    // Update audio state tracking for next frame
    this.wasGrounded = this.isGrounded;
    this.wasInWater = this.feetInWater;
  }

  // Debug: Detect if player is stuck and log detailed collision info
  private checkIfStuck(input: { forward: boolean; backward: boolean; left: boolean; right: boolean }): void {
    const wasdActive = input.forward || input.backward || input.left || input.right;
    const moved = this.position.distanceTo(this.lastPosition) > 0.01;

    if (wasdActive) {
      this.wasdActiveFrames++;
      if (!moved) {
        this.stuckFrameCount++;
      } else {
        this.stuckFrameCount = 0;
      }

      // If WASD held for 30+ frames and not moving, we're stuck
      const now = Date.now();
      if (this.stuckFrameCount > 30 && this.wasdActiveFrames > 30 && now - this.lastStuckLogTime > 2000) {
        this.lastStuckLogTime = now;
        this.logStuckDebugInfo();
      }
    } else {
      this.wasdActiveFrames = 0;
      this.stuckFrameCount = 0;
    }

    this.lastPosition.copy(this.position);
  }

  private logStuckDebugInfo(): void {
    if (!this.currentPlanet) return;

    console.log('========== STUCK DETECTED ==========');

    // Position is at feet level
    const playerFeetRadius = this.position.distanceTo(this.currentPlanet.center);
    const playerHeadRadius = playerFeetRadius + PlayerConfig.PLAYER_HEIGHT;

    console.log('Player State:');
    console.log(`  Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`);
    console.log(`  Feet radius: ${playerFeetRadius.toFixed(2)}`);
    console.log(`  Head radius: ${playerHeadRadius.toFixed(2)}`);
    console.log(`  Is in water: ${this.isInWater}`);
    console.log(`  Is grounded: ${this.isGrounded}`);
    console.log(`  Velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);

    const currentTile = this.currentPlanet.getTileAtPointFast(this.position);
    if (currentTile) {
      console.log('\nCurrent Tile:');
      console.log(`  Index: ${currentTile.index}`);

      // Find walkable floor closest to player's height (air above solid)
      let groundDepth = -1;
      let bestHeightDiff = Infinity;
      for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
        const block = this.currentPlanet.getBlock(currentTile.index, d);
        const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? this.currentPlanet.getBlock(currentTile.index, d + 1) : HexBlockType.AIR;
        const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;
        const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
        if (isCurrentSolid && isAbovePassable) {
          const floorRadius = this.currentPlanet.depthToRadius(d);
          const heightDiff = Math.abs(floorRadius - playerFeetRadius);
          if (floorRadius <= playerFeetRadius + 0.5 && heightDiff < bestHeightDiff) {
            groundDepth = d;
            bestHeightDiff = heightDiff;
          }
        }
      }
      const groundRadius = groundDepth >= 0 ? this.currentPlanet.depthToRadius(groundDepth) : 0;
      console.log(`  Ground depth: ${groundDepth} (radius: ${groundRadius.toFixed(2)})`);
      const heightAboveGround = playerFeetRadius - groundRadius;
      console.log(`  Player feet vs ground: ${heightAboveGround.toFixed(2)} (should be ~0 when grounded)`);
      console.log(`  In air (wall check skipped): ${heightAboveGround > PlayerConfig.PLAYER_HEIGHT + 0.5}`);

      // List all blocks in column
      console.log('  Blocks:');
      for (let d = 0; d < 8; d++) {
        const block = this.currentPlanet.getBlock(currentTile.index, d);
        const blockName = HexBlockType[block];
        const blockRadius = this.currentPlanet.depthToRadius(d);
        const inRange = blockRadius > playerFeetRadius && blockRadius < playerHeadRadius ? ' [IN CAPSULE RANGE]' : '';
        console.log(`    d=${d}: ${blockName} (r=${blockRadius.toFixed(1)})${inRange}`);
      }

      // Check neighbors
      console.log('\nNeighbor Tiles:');
      for (const neighborIndex of currentTile.neighbors) {
        const neighborTile = this.currentPlanet.getPolyhedron().tiles[neighborIndex];
        if (!neighborTile) continue;

        // Get neighbor ground level
        let neighborGroundDepth = -1;
        for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
          const block = this.currentPlanet.getBlock(neighborIndex, d);
          if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
            neighborGroundDepth = d;
            break;
          }
        }
        const neighborGroundRadius = neighborGroundDepth >= 0 ? this.currentPlanet.depthToRadius(neighborGroundDepth) : 0;
        const heightDiff = neighborGroundRadius - groundRadius;

        console.log(`  Neighbor ${neighborIndex}: ground_r=${neighborGroundRadius.toFixed(1)}, heightDiff=${heightDiff.toFixed(1)}`);
      }

      // Check collision functions
      console.log('\nCollision Checks:');
      console.log(`  isPositionValid: ${this.isPositionValid(this.position)}`);
      console.log(`  checkWallCollision: ${this.checkWallCollision(this.position)}`);
      console.log(`  checkStepHeight: ${this.checkStepHeight(this.position)}`);
      console.log(`  checkCollision: ${this.checkCollision(this.position)}`);
    }

    console.log('====================================');
  }

  // Debug: Log cave structure around player (Shift+X)
  // Shows tiles in rings around player and depth rows above standing level
  private lastCaveLogTime: number = 0;
  private logCaveStructure(): void {
    // Throttle to once per second
    const now = Date.now();
    if (now - this.lastCaveLogTime < 1000) return;
    this.lastCaveLogTime = now;

    if (!this.currentPlanet) return;

    const currentTile = this.currentPlanet.getTileAtPointFast(this.position);
    if (!currentTile) return;

    // Position is at feet level
    const playerFeetRadius = this.position.distanceTo(this.currentPlanet.center);
    const playerHeadRadius = playerFeetRadius + PlayerConfig.PLAYER_HEIGHT;

    // Find the walkable floor closest to player's radius (same logic as physics code)
    const groundDepth = findWalkableFloorAtRadius(this.currentPlanet, currentTile.index, playerFeetRadius);
    const groundRadius = groundDepth >= 0 ? this.currentPlanet.depthToRadius(groundDepth) : 0;

    console.log('========== Hex STRUCTURE (Shift+X) ==========');

    // Camera pitch/yaw info
    const planetUp = this.currentPlanet.getSurfaceNormal(this.position);
    const lookDir = this.localForward.clone().negate(); // Camera looks along -localForward
    const pitchSin = lookDir.dot(planetUp);
    const pitchRad = Math.asin(Math.max(-1, Math.min(1, pitchSin)));
    const pitchDeg = pitchRad * 180 / Math.PI;

    // Calculate yaw (horizontal angle relative to some reference)
    // Project lookDir onto horizontal plane
    const horizontalLook = lookDir.clone().sub(planetUp.clone().multiplyScalar(pitchSin)).normalize();
    // Use localRight as reference for yaw calculation
    const yawRad = Math.atan2(horizontalLook.dot(this.localRight), -horizontalLook.dot(this.localForward.clone().sub(planetUp.clone().multiplyScalar(this.localForward.dot(planetUp))).normalize()));
    const yawDeg = yawRad * 180 / Math.PI;

    // Calculate surface-relative roll (how tilted is the camera horizon relative to planet surface)
    // Roll = 0 when localRight is perpendicular to planetUp
    const rightDotUp = this.localRight.dot(planetUp);
    const surfaceRollRad = Math.asin(Math.max(-1, Math.min(1, rightDotUp)));
    const surfaceRollDeg = surfaceRollRad * 180 / Math.PI;

    console.log(`Camera pitch: ${pitchDeg.toFixed(2)}° yaw: ${yawDeg.toFixed(2)}° surface roll: ${surfaceRollDeg.toFixed(2)}°`);
    console.log(`lookDir: (${lookDir.x.toFixed(3)}, ${lookDir.y.toFixed(3)}, ${lookDir.z.toFixed(3)})`);
    console.log(`planetUp: (${planetUp.x.toFixed(3)}, ${planetUp.y.toFixed(3)}, ${planetUp.z.toFixed(3)})`);
    console.log(`localUp (camera): (${this.localUp.x.toFixed(3)}, ${this.localUp.y.toFixed(3)}, ${this.localUp.z.toFixed(3)})`);
    console.log(`localRight: (${this.localRight.x.toFixed(3)}, ${this.localRight.y.toFixed(3)}, ${this.localRight.z.toFixed(3)})`);
    const alignment = this.localUp.dot(planetUp);
    console.log(`localUp·planetUp: ${alignment.toFixed(3)} (1.0 = level), localRight·planetUp: ${rightDotUp.toFixed(3)} (0 = no roll)`);
    console.log('');

    console.log(`Player feet radius: ${playerFeetRadius.toFixed(2)}, head radius: ${playerHeadRadius.toFixed(2)}`);
    console.log(`Standing on tile ${currentTile.index}, ground depth: ${groundDepth} (radius: ${groundRadius.toFixed(2)})`);
    console.log(`isGrounded: ${this.isGrounded}, velocity: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)})`);
    console.log(`Planet radius: ${this.currentPlanet.radius}`);

    // LOD terrain detection
    const isDetailTerrain = this.currentPlanet.isTileInDetailRange(currentTile.index);
    const chunkIndex = this.currentPlanet.getTileChunkIndex(currentTile.index);
    console.log(`Terrain type: ${isDetailTerrain ? 'DETAILED' : 'LOD'} (chunk ${chunkIndex})`);
    console.log('');

    // Collect tiles: current + rings of neighbors
    const tileRings = PlayerConfig.DEBUG_CAVE_TILE_RINGS;
    const depthRows = PlayerConfig.DEBUG_CAVE_DEPTH_ROWS;
    const tilesToSample: Set<number> = new Set([currentTile.index]);
    let currentRing: Set<number> = new Set([currentTile.index]);

    for (let ring = 0; ring < tileRings; ring++) {
      const nextRing: Set<number> = new Set();
      for (const tileIdx of currentRing) {
        const tile = this.currentPlanet.getPolyhedron().tiles[tileIdx];
        if (tile) {
          for (const neighborIdx of tile.neighbors) {
            if (!tilesToSample.has(neighborIdx)) {
              tilesToSample.add(neighborIdx);
              nextRing.add(neighborIdx);
            }
          }
        }
      }
      currentRing = nextRing;
    }

    // Find the depth that corresponds to the player's feet radius
    // This ensures we show blocks around where the player actually is, not just the detected ground
    let playerDepth = 0;
    for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
      const depthRadius = this.currentPlanet.depthToRadius(d);
      if (depthRadius >= playerFeetRadius) {
        playerDepth = d;
        break;
      }
    }

    // Show depths centered around player position, with depthRows visible
    const halfRows = Math.floor(depthRows / 2);
    const startDepth = Math.max(0, playerDepth - halfRows);
    const endDepth = Math.min(MAX_TERRAIN_DEPTH - 1, playerDepth + halfRows);

    console.log(`Sampling ${tilesToSample.size} tiles, depths ${startDepth} to ${endDepth}`);
    console.log(`Legend: . = AIR, ~ = WATER, S = SAND, G = GRASS, # = SOLID, P = PIPE, C = CABLE, @ = PLAYER BODY OVERLAP`);
    console.log('(Higher depths = closer to sky, displayed at top)');
    console.log('');

    // Build a table: rows = depth (from high to low, sky at top), columns = tiles
    const tileArray = Array.from(tilesToSample);
    const headerRow = ['Depth/Radius'].concat(tileArray.map(t => `T${t}`));
    console.log(headerRow.join('\t'));

    // Get tech block data for pipe/cable display in grid
    const techData = this.getTechBlockDataCallback ? this.getTechBlockDataCallback(tileArray) : null;
    // Build lookup maps for quick checks: "tileIndex-depth" -> true
    const pipeLocations = new Set<string>();
    const cableLocations = new Set<string>();
    if (techData) {
      for (const pipe of techData.copperPipes) {
        pipeLocations.add(`${pipe.tileIndex}-${pipe.depth}`);
      }
      for (const cable of techData.cables) {
        cableLocations.add(`${cable.tileIndex}-${cable.depth}`);
      }
    }

    // Loop from high depth to low depth (sky at top, ground at bottom)
    for (let d = endDepth; d >= startDepth; d--) {
      const blockRadius = this.currentPlanet.depthToRadius(d);
      const blockBottomRadius = blockRadius - 1;

      // Check if player body overlaps this depth
      const playerOverlaps = blockRadius > playerFeetRadius && blockBottomRadius < playerHeadRadius;

      const rowData: string[] = [`d${d} (r${blockRadius.toFixed(0)})`];

      for (const tileIdx of tileArray) {
        const block = this.currentPlanet.getBlock(tileIdx, d);
        let symbol = '?';

        // Check for copper pipe or cable at this location first
        if (pipeLocations.has(`${tileIdx}-${d}`)) {
          symbol = 'P';
        } else if (cableLocations.has(`${tileIdx}-${d}`)) {
          symbol = 'C';
        } else if (block === HexBlockType.AIR) symbol = '.';
        else if (block === HexBlockType.WATER) symbol = '~';
        else if (block === HexBlockType.SAND) symbol = 'S';
        else if (block === HexBlockType.GRASS) symbol = 'G';
        else symbol = '#';

        // Mark if player body would overlap this block
        if (playerOverlaps && tileIdx === currentTile.index) {
          symbol = symbol === '.' ? '@' : symbol.toUpperCase();
        }

        rowData.push(symbol);
      }

      console.log(rowData.join('\t'));
    }

    console.log('');

    // Log tech blocks in sampled tiles (reuse techData if already fetched)
    if (techData) {
      const hasTechBlocks = techData.torches.length > 0 || techData.furnaces.length > 0 ||
        techData.electricFurnaces.length > 0 || techData.electronicsWorkbenches.length > 0 ||
        techData.storageChests.length > 0 || techData.steamEngines.length > 0 ||
        techData.hydroGenerators.length > 0 || techData.copperPipes.length > 0 ||
        techData.cables.length > 0;

      if (hasTechBlocks) {
        console.log('=== Tech Blocks in Area ===');
        if (techData.torches.length > 0) {
          console.log(`Torches: ${techData.torches.map(t => `T${t.tileIndex}`).join(', ')}`);
        }
        if (techData.furnaces.length > 0) {
          console.log(`Furnaces: ${techData.furnaces.map(f => `T${f.tileIndex}`).join(', ')}`);
        }
        if (techData.electricFurnaces.length > 0) {
          console.log(`Electric Furnaces: ${techData.electricFurnaces.map(f => `T${f.tileIndex}`).join(', ')}`);
        }
        if (techData.electronicsWorkbenches.length > 0) {
          console.log(`Electronics Workbenches: ${techData.electronicsWorkbenches.map(w => `T${w.tileIndex}`).join(', ')}`);
        }
        if (techData.storageChests.length > 0) {
          console.log(`Storage Chests: ${techData.storageChests.map(c => `T${c.tileIndex}`).join(', ')}`);
        }
        if (techData.steamEngines.length > 0) {
          console.log(`Steam Engines: ${techData.steamEngines.map(s => `T${s.tileIndex}`).join(', ')}`);
        }
        if (techData.hydroGenerators.length > 0) {
          console.log(`Hydro Generators: ${techData.hydroGenerators.map(h => `T${h.tileIndex}`).join(', ')}`);
        }
        if (techData.copperPipes.length > 0) {
          console.log(`Copper Pipes: ${techData.copperPipes.map(p => `T${p.tileIndex}@d${p.depth}`).join(', ')}`);
        }
        if (techData.cables.length > 0) {
          console.log(`Cables: ${techData.cables.map(c => `T${c.tileIndex}@d${c.depth}`).join(', ')}`);
        }

        // Show cable connection details for debugging
        const cableTiles = new Set(techData.cables.map(c => c.tileIndex));
        const powerConsumers = [
          ...techData.electricFurnaces.map(f => ({ type: 'E-Furnace', tileIndex: f.tileIndex })),
          ...techData.electronicsWorkbenches.map(w => ({ type: 'E-Workbench', tileIndex: w.tileIndex })),
        ];
        if (powerConsumers.length > 0 && techData.cables.length > 0) {
          console.log('--- Cable Connections ---');
          for (const consumer of powerConsumers) {
            const consumerTile = this.currentPlanet.getPolyhedron().tiles[consumer.tileIndex];
            if (consumerTile) {
              const neighbors = consumerTile.neighbors;
              const connectedCables = neighbors.filter(n => cableTiles.has(n));
              const sameTileCable = cableTiles.has(consumer.tileIndex);
              if (sameTileCable || connectedCables.length > 0) {
                console.log(`  ${consumer.type} T${consumer.tileIndex}: connected via ${sameTileCable ? 'same tile' : ''} ${connectedCables.map(n => `T${n}`).join(', ')}`);
              } else {
                console.log(`  ${consumer.type} T${consumer.tileIndex}: NOT CONNECTED (neighbors: ${neighbors.slice(0, 6).map(n => `T${n}`).join(', ')})`);
              }
            }
          }
        }
        console.log('');
      }
    }

    // Log collision check results for ALL neighbor tiles
    const currentGroundRadius = this.currentPlanet.depthToRadius(groundDepth);
    console.log(`Current ground depth: ${groundDepth} (r${currentGroundRadius.toFixed(0)})`);
    console.log('');
    console.log('Collision checks for neighbor tiles:');

    const polyTile = this.currentPlanet.getPolyhedron().tiles[currentTile.index];
    if (polyTile) {
      for (const neighborIdx of polyTile.neighbors) {
        const neighborTile = this.currentPlanet.getPolyhedron().tiles[neighborIdx];
        if (!neighborTile) continue;

        // Find walkable floors in this neighbor
        const walkableFloors: number[] = [];
        for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
          const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? this.currentPlanet.getBlock(neighborIdx, d + 1) : HexBlockType.AIR;
          const block = this.currentPlanet.getBlock(neighborIdx, d);
          const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
          const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;
          if (isAbovePassable && isCurrentSolid) {
            walkableFloors.push(d);
          }
        }

        // Create a test position in the center of the neighbor tile
        const neighborCenter = new THREE.Vector3(
          neighborTile.center.x,
          neighborTile.center.y,
          neighborTile.center.z
        ).normalize().multiplyScalar(this.currentPlanet.radius);

        const stepOK = this.checkStepHeight(neighborCenter);
        const headroomBlocked = this.checkHeadroomCollision(neighborCenter);
        const wallBlocked = this.checkWallCollision(neighborCenter);

        console.log(`  T${neighborIdx}: floors=[${walkableFloors.join(',')}] step=${stepOK} headroom=${headroomBlocked} wall=${wallBlocked}`);
      }
    }

    // Also log forward direction tile (might not be immediate neighbor)
    const forwardDir = this.localForward.clone().negate();

    // Test actual movement position (small step forward)
    const testMovePos = this.position.clone().addScaledVector(forwardDir, 0.5);
    const testMoveTile = this.currentPlanet.getTileAtPoint(testMovePos);

    console.log('');
    console.log('Movement test (actual forward step):');
    console.log(`  Move direction: (${forwardDir.x.toFixed(2)}, ${forwardDir.y.toFixed(2)}, ${forwardDir.z.toFixed(2)})`);
    console.log(`  Test position tile: ${testMoveTile ? testMoveTile.index : 'none'} (same=${testMoveTile?.index === currentTile.index})`);

    // Test checkCollision on actual movement
    const actualCollision = this.checkCollision(testMovePos);
    const actualStep = this.checkStepHeight(testMovePos);
    const actualHeadroom = this.checkHeadroomCollision(testMovePos);
    const actualWall = this.checkWallCollision(testMovePos);
    console.log(`  checkCollision: ${actualCollision}, step=${actualStep}, headroom=${actualHeadroom}, wall=${actualWall}`);

    const forwardTile = this.currentPlanet.getTileAtPoint(
      this.position.clone().addScaledVector(forwardDir, 2)
    );
    if (forwardTile && forwardTile.index !== currentTile.index) {
      console.log(`  Forward tile (2 units ahead): ${forwardTile.index}`);

      // Check collision for forward tile too
      const fwdPolyTile = this.currentPlanet.getPolyhedron().tiles[forwardTile.index];
      if (fwdPolyTile) {
        const walkableFloors: number[] = [];
        for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
          const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? this.currentPlanet.getBlock(forwardTile.index, d + 1) : HexBlockType.AIR;
          const block = this.currentPlanet.getBlock(forwardTile.index, d);
          const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
          const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;
          if (isAbovePassable && isCurrentSolid) {
            walkableFloors.push(d);
          }
        }

        const fwdCenter = new THREE.Vector3(
          fwdPolyTile.center.x,
          fwdPolyTile.center.y,
          fwdPolyTile.center.z
        ).normalize().multiplyScalar(this.currentPlanet.radius);

        const stepOK = this.checkStepHeight(fwdCenter);
        const headroomBlocked = this.checkHeadroomCollision(fwdCenter);
        const wallBlocked = this.checkWallCollision(fwdCenter);

        console.log(`  T${forwardTile.index} (center): floors=[${walkableFloors.join(',')}] step=${stepOK} headroom=${headroomBlocked} wall=${wallBlocked}`);
      }
    }

    console.log('==============================================');
  }

  // Slerp only the roll component to level the camera relative to planet surface
  // This preserves look direction but smoothly corrects the "tilt"
  // Only called during transition period (transitionTimer > 0)
  // Uses quaternion slerp for stable, drift-free interpolation
  private slerpRollToLevel(deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Get planet's "up" at our position
    const planetUp = this.currentPlanet.getSurfaceNormal(this.position);

    // Get our current forward direction
    const currentForward = this.localForward.clone();

    // Build target quaternion that aligns up with planetUp while preserving forward as much as possible
    // First compute what "right" should be (perpendicular to forward and planetUp)
    const targetRight = new THREE.Vector3().crossVectors(currentForward, planetUp);

    if (targetRight.lengthSq() < 0.001) {
      // Looking straight up or down relative to planet - no roll correction needed
      this.transitionTimer = 0;
      return;
    }
    targetRight.normalize();

    // Compute corrected forward (may differ slightly if forward wasn't perpendicular to planetUp)
    const correctedForward = new THREE.Vector3().crossVectors(planetUp, targetRight).normalize();

    // Build target rotation matrix from orthonormal basis
    // Note: Matrix4.makeBasis expects (right, up, -forward) for camera convention
    const targetMatrix = new THREE.Matrix4();
    targetMatrix.makeBasis(targetRight, planetUp, correctedForward.clone().negate());
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetMatrix);

    // Slerp current orientation toward target orientation
    const slerpFactor = Math.min(1, PlayerConfig.ROLL_SLERP_SPEED * deltaTime);
    this.orientation.slerp(targetQuat, slerpFactor);

    // Extract local vectors from the interpolated orientation
    this.updateLocalFromOrientation();

    // Note: We no longer exit early - let the full transition timer run
    // This ensures smooth, predictable transition duration
  }

  // Mouse look during transition - uses space-style direct orientation modification
  // This allows smooth slerping while still letting the player look around
  private handleTransitionMouseLook(input: InputState, _deltaTime: number): void {
    if (!this.inputManager.isLocked()) return;

    const yInvert = PlayerConfig.INVERT_Y_AXIS ? -1 : 1;
    const pitchDelta = input.mouseY * PlayerConfig.MOUSE_SENSITIVITY * yInvert;
    const yawDelta = -input.mouseX * PlayerConfig.MOUSE_SENSITIVITY;

    // Apply yaw around planet up (not local up, to be consistent with gravity)
    if (this.currentPlanet) {
      const planetUp = this.currentPlanet.getSurfaceNormal(this.position);
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(planetUp, yawDelta);
      this.orientation.premultiply(yawQuat);
    }

    // Apply pitch around local right
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(this.localRight, pitchDelta);
    this.orientation.premultiply(pitchQuat);

    // Update local axes from orientation
    this.updateLocalFromOrientation();
  }

  // Sync surfaceForward and surfacePitch from current orientation
  // Called when transition ends to ensure smooth handoff to planet controls
  private syncSurfaceStateFromOrientation(): void {
    if (!this.currentPlanet) return;

    const planetUp = this.currentPlanet.getSurfaceNormal(this.position);

    // Get current camera forward
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);

    // Project onto horizon plane to get surfaceForward
    this.surfaceForward.copy(camForward);
    this.surfaceForward.sub(planetUp.clone().multiplyScalar(camForward.dot(planetUp)));
    if (this.surfaceForward.lengthSq() < 0.001) {
      // Looking straight up/down - use localForward as fallback
      this.surfaceForward.copy(this.localForward).negate();
      this.surfaceForward.sub(planetUp.clone().multiplyScalar(this.surfaceForward.dot(planetUp)));
    }
    this.surfaceForward.normalize();

    // Calculate surfacePitch from camera forward's angle with horizon
    const pitchAngle = Math.asin(Math.max(-1, Math.min(1, camForward.dot(planetUp))));
    this.surfacePitch = pitchAngle;
  }

  private handleSpaceMouseLook(input: InputState, _deltaTime: number): void {
    if (!this.inputManager.isLocked()) return;

    const yInvert = PlayerConfig.INVERT_Y_AXIS ? -1 : 1;
    let pitchDelta = input.mouseY * PlayerConfig.MOUSE_SENSITIVITY * yInvert;
    const yawDelta = -input.mouseX * PlayerConfig.MOUSE_SENSITIVITY;

    // On planet surface, use planet-aligned axes to avoid gimbal lock
    if (!this.isInSpace && this.currentPlanet) {
      const planetUp = this.currentPlanet.getSurfaceNormal(this.position);

      // Use stored pitch angle (avoids gimbal lock issues)
      const maxPitch = 89.9 * Math.PI / 180;

      // Update stored pitch
      this.surfacePitch = (this.surfacePitch || 0) + pitchDelta;
      this.surfacePitch = Math.max(-maxPitch, Math.min(maxPitch, this.surfacePitch));

      // Project stored forward direction onto current tangent plane
      // This keeps the look direction consistent as the player walks around the planet
      let horizonForward = this.surfaceForward.clone();
      horizonForward.sub(planetUp.clone().multiplyScalar(horizonForward.dot(planetUp)));
      if (horizonForward.lengthSq() < 0.001) {
        // Forward is aligned with up, use fallback
        horizonForward = new THREE.Vector3(0, 0, -1);
        horizonForward.sub(planetUp.clone().multiplyScalar(horizonForward.dot(planetUp)));
        if (horizonForward.lengthSq() < 0.001) {
          horizonForward = new THREE.Vector3(1, 0, 0);
          horizonForward.sub(planetUp.clone().multiplyScalar(horizonForward.dot(planetUp)));
        }
      }
      horizonForward.normalize();

      // Apply yaw delta to rotate the horizontal forward direction
      if (yawDelta !== 0) {
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(planetUp, yawDelta);
        horizonForward.applyQuaternion(yawQuat);
      }

      // Store the updated horizontal forward direction for next frame
      this.surfaceForward.copy(horizonForward);

      // Compute right vector as cross(planetUp, horizonForward)
      const right = new THREE.Vector3().crossVectors(planetUp, horizonForward).normalize();

      // Apply pitch to get the final look direction
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, -this.surfacePitch);
      const forward = horizonForward.clone().applyQuaternion(pitchQuat);

      // Build camera orientation using lookAt-style matrix
      // Keep up = planetUp (don't tilt with pitch) so camera stays level with ground
      const eye = new THREE.Vector3(0, 0, 0);
      const target = forward.clone();
      const camMatrix = new THREE.Matrix4().lookAt(eye, target, planetUp);
      this.orientation.setFromRotationMatrix(camMatrix);
    } else {
      // In space, use local axes freely (6DOF)
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(this.localUp, yawDelta);
      this.orientation.premultiply(yawQuat);

      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(this.localRight, pitchDelta);
      this.orientation.premultiply(pitchQuat);
    }

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

    const planetUp = this.currentPlanet.getSurfaceNormal(this.position);

    // Check water at eye level for fog/visual effects
    const eyePosition = this.position.clone().addScaledVector(planetUp, PlayerConfig.PLAYER_EYE_HEIGHT);
    this.isInWater = this.currentPlanet.isInWater(eyePosition);

    // Check water at configurable height for swimming physics
    // This determines when swimming kicks in vs normal jumping
    const swimCheckPos = this.position.clone().addScaledVector(planetUp, PlayerConfig.WATER_BODY_CHECK_HEIGHT);
    const bodyInWater = this.currentPlanet.isInWater(swimCheckPos);

    // Check if feet are in water - used to allow swimming up even when body check is above water
    this.feetInWater = this.currentPlanet.isInWater(this.position);

    // Play water entry sound when entering water from above (not when already underwater)
    const now = performance.now() / 1000;
    if (this.feetInWater && !this.wasInWater && !this.isInWater && now - this.lastDiveSoundTime > 1.0) {
      AudioManager.play('dive', { position: this.position.clone() });
      this.lastDiveSoundTime = now;
    }

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

      // Slow down movement in water (use bodyInWater for physics)
      if (bodyInWater) {
        speed *= PlayerConfig.WATER_MOVEMENT_MULTIPLIER;
      }

      const movement = moveDir.clone().multiplyScalar(speed * deltaTime);

      // Try to move - use iterative collision resolution
      this.resolveMovement(movement);

      // Play footstep sounds when grounded and moving (not in water)
      if (this.isGrounded && !bodyInWater) {
        this.playFootstepSound(input.sprint);
      } else if (this.feetInWater && this.isGrounded && !this.isInWater) {
        // Play water footstep sounds when wading (feet in water but eyes above)
        this.playFootstepSound(input.sprint);
      } else if (this.isInWater) {
        // Play swim sounds when moving underwater (eyes submerged)
        this.playSwimSound();
      }
    }

    // Water states (when feet in water):
    // 1. Grounded + eyes above water (wading): can jump at AIR speed
    // 2. Grounded + eyes below water (underwater floor): can jump at WATER speed
    // 3. Not grounded (swimming): can swim up, float at WATER_SURFACE_FLOAT_HEIGHT

    // Case 3: Swimming (not grounded, feet in water)
    // Only apply swimming physics if player doesn't have strong upward velocity (from a jump)
    const upwardVelocity = this.velocity.dot(planetUp);
    const isJumpingOut = upwardVelocity > PlayerConfig.JUMP_FORCE * 0.5; // Has significant upward momentum

    if (input.jump && this.feetInWater && !this.isGrounded && !isJumpingOut) {
      const waterSurfaceRadius = this.currentPlanet.getWaterSurfaceRadius(this.position);
      const playerFeetRadius = this.position.distanceTo(this.currentPlanet.center);
      const floatTargetRadius = waterSurfaceRadius + PlayerConfig.WATER_SURFACE_FLOAT_HEIGHT;
      const distanceFromTarget = playerFeetRadius - floatTargetRadius;

      if (waterSurfaceRadius > 0 && distanceFromTarget <= 0.3) {
        if (distanceFromTarget >= -0.1) {
          // At float target - float stably
          this.isFloatingAtSurface = true;
          const upComponent = this.velocity.dot(planetUp);
          this.velocity.sub(planetUp.clone().multiplyScalar(upComponent));
        } else {
          // Below float target - swim upward
          this.isFloatingAtSurface = false;
          this.velocity.addScaledVector(planetUp, PlayerConfig.WATER_SWIM_FORCE * deltaTime);
        }
      } else {
        // Above float target or no water - stop floating
        this.isFloatingAtSurface = false;
      }
    } else {
      this.isFloatingAtSurface = false;
    }

    // Cases 1 & 2: Jumping (grounded)
    // Case 1: feet in water, grounded, eyes ABOVE water -> jump at AIR speed
    // Case 2: feet in water, grounded, eyes IN water -> jump at WATER speed
    if (input.jumpJustPressed) {
      console.log(`Jump pressed! isGrounded=${this.isGrounded}, feetInWater=${this.feetInWater}`);
      if (this.isGrounded) {
        // Jump from ground - speed depends on whether eyes are underwater
        const jumpDir = planetUp;

        // Clear any existing vertical velocity for a clean jump
        const verticalComponent = this.velocity.dot(planetUp);
        this.velocity.sub(planetUp.clone().multiplyScalar(verticalComponent));

        // Determine jump force: full force when wading (eyes above water), reduced when fully submerged
        let jumpForce = PlayerConfig.JUMP_FORCE;
        if (this.feetInWater && this.isInWater) {
          // Case 2: Underwater jump - much weaker, more like a swim push
          jumpForce = PlayerConfig.JUMP_FORCE * PlayerConfig.WATER_GRAVITY_MULTIPLIER;
        }
        // Case 1: Wading (feet in water but eyes above) uses full JUMP_FORCE

        // Check if player had significant horizontal velocity BEFORE adding jump force
        // This determines if drift is expected (walking momentum) or a bug
        // Must be done before adding jump force to avoid false positives
        let hadHorizontalVelocity = false;
        if (this.currentPlanet) {
          const preJumpUp = this.currentPlanet.getSurfaceNormal(this.position);
          const horizontalVel = this.velocity.clone();
          const vertComponent = preJumpUp.clone().multiplyScalar(this.velocity.dot(preJumpUp));
          horizontalVel.sub(vertComponent);
          const horizSpeed = horizontalVel.length();
          hadHorizontalVelocity = horizSpeed > 0.5; // threshold for "moving"
          if (PlayerConfig.DEBUG_JUMP_LOGGING) {
            console.log(`Pre-jump: horizontalVel=${horizSpeed.toFixed(3)}, hadHorizontalVelocity=${hadHorizontalVelocity}, isGrounded=${this.isGrounded}`);
          }
        }

        // Add jump force
        this.velocity.addScaledVector(jumpDir, jumpForce);
        if (PlayerConfig.DEBUG_JUMP_LOGGING) {
          console.log(`After jump: velocity=(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}, ${this.velocity.z.toFixed(2)}), jumpForce=${jumpForce}`);
        }
        this.isGrounded = false;
        this.hasDoubleJumped = false; // Reset double-jump flag
        this.didJumpThisFrame = true; // Mark for teleport detection

        // Play jump sound
        AudioManager.play('jump', { position: this.position.clone() });

        // Track jump start for drift detection and fix gravity direction
        if (this.currentPlanet) {
          this.jumpStartPosition = this.position.clone();
          const spherical = this.positionToSpherical(this.position, this.currentPlanet);
          this.jumpStartSpherical = { theta: spherical.theta, phi: spherical.phi };

          // Use the pre-calculated horizontal velocity check
          this.wasdPressedDuringJump = hadHorizontalVelocity;

          // Store the UP direction at jump start - use fresh calculation from current position
          this.jumpDirection = this.currentPlanet.getSurfaceNormal(this.position);

          // Start debug position logging for 5 seconds (if enabled)
          if (PlayerConfig.DEBUG_JUMP_LOGGING) {
            this.jumpDebugTimer = 5.0;
            this.jumpDebugStartPos = this.position.clone();
            console.log('=== JUMP DEBUG START ===');
            console.log(`Start pos: x=${this.position.x.toFixed(4)}, y=${this.position.y.toFixed(4)}, z=${this.position.z.toFixed(4)}`);
            console.log(`Start spherical: theta=${(spherical.theta * 180 / Math.PI).toFixed(4)}°, phi=${(spherical.phi * 180 / Math.PI).toFixed(4)}°, radius=${spherical.radius.toFixed(4)}`);
          }
        }
      } else if (PlayerConfig.DOUBLE_JUMP_ENABLED && this.jetpackEnabled && !this.hasDoubleJumped && !this.feetInWater) {
        // Stage 2: Double-jump while airborne - activates jetpack (not when in water - swimming handles that)
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

    // Only check step height and headroom when grounded AND actually changing tiles AND not underwater
    // This allows free movement within the current tile, and swimming over terrain underwater
    if (this.isGrounded && !this.isInWater) {
      const currentTile = this.currentPlanet.getTileAtPointFast(this.position);
      const newTile = this.currentPlanet.getTileAtPointFast(newPosition);

      // Only check step height and headroom if we're moving to a different tile
      if (currentTile && newTile && currentTile.index !== newTile.index) {
        if (!this.checkStepHeight(newPosition)) {
          return true; // Blocked by step (only matters when walking to different tile)
        }
        // Check if there's enough headroom (at least 2 blocks) at the target tile
        if (this.checkHeadroomCollision(newPosition)) {
          return true; // Blocked by ceiling - not enough headroom to walk there
        }
      }
    }

    // Check wall collision (uses actual capsule position, works for both grounded and airborne)
    return this.checkWallCollision(newPosition);
  }

  // Check if step height is valid - can the player walk to this position?
  // Returns true if player can walk there (step up/down within AUTO_STEP_HEIGHT, or fall off cliff)
  private checkStepHeight(newPosition: THREE.Vector3): boolean {
    if (!this.currentPlanet) return true;

    const newTile = this.currentPlanet.getTileAtPointFast(newPosition);
    if (!newTile) return true;

    // Get current ground level using correct depth calculation
    const currentGroundDepth = this.currentPlanet.getDepthAtPoint(this.position);
    const currentRadius = this.currentPlanet.depthToRadius(currentGroundDepth);

    // Find ALL walkable floors at destination, then check if any are reachable
    // A floor is reachable if it's within AUTO_STEP_HEIGHT above, OR any amount below
    let foundAnyFloor = false;
    let hasReachableFloor = false;

    for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
      const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? getCachedBlock(this.currentPlanet, newTile.index, d + 1) : HexBlockType.AIR;
      const block = getCachedBlock(this.currentPlanet, newTile.index, d);
      const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
      const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;

      if (isAbovePassable && isCurrentSolid) {
        // This is a walkable floor at depth d
        foundAnyFloor = true;
        const destRadius = this.currentPlanet.depthToRadius(d);
        const radiusDiff = destRadius - currentRadius;

        // Can step down any amount (gravity handles falling)
        // Can only step UP within AUTO_STEP_HEIGHT
        if (radiusDiff <= PlayerConfig.AUTO_STEP_HEIGHT) {
          hasReachableFloor = true;
          break; // Found a reachable floor, no need to keep searching
        }
      }
    }

    // If no floors exist at all, player can walk there (will fall into void or water)
    if (!foundAnyFloor) return true;

    // If floors exist but none are reachable (all too high), block movement
    return hasReachableFloor;
  }

  // Wall collision check - checks if solid blocks at the destination would block the player
  // Returns true if blocked by a solid wall
  //
  // Uses PLAYER_RADIUS to check not just the center tile, but also neighboring tiles
  // that the player's body might overlap with. This prevents camera clipping through walls.
  //
  // If verticalOnly is true, only checks the current tile (for vertical movement within a shaft)
  // This allows jumping/falling in narrow spaces surrounded by walls.
  //
  // Note: player.position is at FEET level (bottom of player)
  private checkWallCollision(newPosition: THREE.Vector3, verticalOnly: boolean = false): boolean {
    if (!this.currentPlanet) return false;

    const newTile = this.currentPlanet.getTileAtPointFast(newPosition);
    if (!newTile) return false;

    // Get the tile the player is currently standing on - we'll exclude it from wall checks
    // This prevents the ground we're standing on from blocking movement to adjacent tiles
    const standingTile = this.currentPlanet.getTileAtPointFast(this.position);
    const standingTileIndex = standingTile ? standingTile.index : -1;

    let playerBottomRadius: number;
    let playerTopRadius: number;

    if (this.isGrounded) {
      // Get current ground depth - use player's actual radius to find the floor they're on
      const playerFeetRadius = this.position.distanceTo(this.currentPlanet.center);
      const currentTile = this.currentPlanet.getTileAtPointFast(this.position);
      let currentGroundDepth = -1;
      if (currentTile) {
        currentGroundDepth = findWalkableFloorAtRadius(this.currentPlanet, currentTile.index, playerFeetRadius);
      }
      if (currentGroundDepth < 0) {
        // No current ground found - use actual position
        playerBottomRadius = newPosition.distanceTo(this.currentPlanet.center);
        playerTopRadius = playerBottomRadius + PlayerConfig.PLAYER_HEIGHT;
      } else {
        const currentGroundRadius = this.currentPlanet.depthToRadius(currentGroundDepth);

        // Find the WALKABLE ground at destination - the ground level closest to current
        // that we can step to (within AUTO_STEP_HEIGHT up, or any amount down)
        // Scan the destination column for air-to-solid transitions (potential floor surfaces)
        let bestDestGroundDepth = -1;
        let bestHeightDiff = Infinity;

        for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
          const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? getCachedBlock(this.currentPlanet, newTile.index, d + 1) : HexBlockType.AIR;
          const block = getCachedBlock(this.currentPlanet, newTile.index, d);

          // This is a walkable surface if: current block is solid AND block above is air/water
          const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
          const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;

          if (isAbovePassable && isCurrentSolid) {
            // This is a potential floor at depth d
            const groundRadius = this.currentPlanet.depthToRadius(d);
            const heightDiff = groundRadius - currentGroundRadius;

            // Can we step to this level? (within step height up, or any distance down)
            if (heightDiff <= PlayerConfig.AUTO_STEP_HEIGHT) {
              // Pick the closest ground to current level
              if (Math.abs(heightDiff) < Math.abs(bestHeightDiff)) {
                bestDestGroundDepth = d;
                bestHeightDiff = heightDiff;
              }
            }
          }
        }

        if (bestDestGroundDepth >= 0) {
          // Calculate player position at destination ground
          const destGroundRadius = this.currentPlanet.depthToRadius(bestDestGroundDepth);
          playerBottomRadius = destGroundRadius;
          playerTopRadius = destGroundRadius + PlayerConfig.PLAYER_HEIGHT;
        } else {
          // No walkable ground found - use actual position (will likely collide)
          playerBottomRadius = newPosition.distanceTo(this.currentPlanet.center);
          playerTopRadius = playerBottomRadius + PlayerConfig.PLAYER_HEIGHT;
        }
      }
    } else {
      // Airborne - use actual newPosition height
      playerBottomRadius = newPosition.distanceTo(this.currentPlanet.center);
      playerTopRadius = playerBottomRadius + PlayerConfig.PLAYER_HEIGHT;
    }

    // Get the surface normal at this position (radial direction from planet center)
    const surfaceNormal = this.currentPlanet.getSurfaceNormal(newPosition);

    // Collect tiles to check: current tile + neighbors within PLAYER_RADIUS
    // For vertical-only movement (jumping/falling in a shaft), only check the current tile
    const tilesToCheck: number[] = [newTile.index];

    // Only check neighboring tiles if not in vertical-only mode
    // This allows jumping/falling in narrow shafts surrounded by walls
    if (!verticalOnly) {
      // Check neighboring tiles that might be within player radius
      // Use the polyhedron to get neighbors
      const polyTile = this.currentPlanet.getPolyhedron().tiles[newTile.index];
      if (polyTile) {
        for (const neighborIdx of polyTile.neighbors) {
          const neighborTile = this.currentPlanet.getPolyhedron().tiles[neighborIdx];
          if (neighborTile) {
            // Calculate distance from player position to neighbor tile center (on the surface)
            // Project both onto the tangent plane for horizontal distance
            const neighborCenter = new THREE.Vector3(
              neighborTile.center.x,
              neighborTile.center.y,
              neighborTile.center.z
            ).add(this.currentPlanet.center);

            // Get the horizontal distance (tangent to planet surface)
            const toNeighbor = neighborCenter.clone().sub(newPosition);
            const verticalComponent = toNeighbor.dot(surfaceNormal);
            const horizontalDist = toNeighbor.clone().sub(surfaceNormal.clone().multiplyScalar(verticalComponent)).length();

            // If neighbor is within player radius, include it in collision check
            if (horizontalDist < PlayerConfig.PLAYER_RADIUS + 1.0) { // +1.0 for block size margin
              tilesToCheck.push(neighborIdx);
            }
          }
        }
      }
    }

    // Approximate tile radius (distance from center to edge)
    // Hex tiles vary in size, but we can estimate based on planet subdivisions
    const approxTileRadius = this.currentPlanet.radius * 0.02; // Rough estimate

    // Calculate the minimum radius threshold for wall detection
    // Use the HIGHER of current ground or destination ground, PLUS step height tolerance
    // Blocks within step height are walkable ground, not walls
    let currentGroundRadius = playerBottomRadius;
    if (standingTile) {
      const currentGroundDepth = findWalkableFloorAtRadius(this.currentPlanet, standingTileIndex,
        this.position.distanceTo(this.currentPlanet.center));
      if (currentGroundDepth >= 0) {
        currentGroundRadius = this.currentPlanet.depthToRadius(currentGroundDepth);
      }
    }
    // Add step height tolerance - blocks within auto-step range are not walls
    const wallThresholdRadius = Math.max(currentGroundRadius, playerBottomRadius) + PlayerConfig.AUTO_STEP_HEIGHT;

    // Check all tiles for collision
    for (const tileIdx of tilesToCheck) {
      // Skip the tile we're currently standing on - its ground can't be a wall blocking us
      // This allows walking off cliffs where the current tile's ground would otherwise block
      if (tileIdx === standingTileIndex) continue;

      const tile = this.currentPlanet.getPolyhedron().tiles[tileIdx];
      if (!tile) continue;

      // Find the HIGHEST walkable floor of this tile (search from sky toward bedrock)
      // This finds the surface, not underground caves
      let tileFloorDepth = -1;
      for (let d = MAX_TERRAIN_DEPTH - 2; d >= 0; d--) {
        const blockAbove = getCachedBlock(this.currentPlanet, tileIdx, d + 1);
        const block = getCachedBlock(this.currentPlanet, tileIdx, d);
        if ((blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER) &&
            block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
          tileFloorDepth = d;
          break;
        }
      }

      // Skip tiles whose floor is at or below the wall threshold (higher of current or dest ground)
      // These aren't walls - they're walkable ground at the same level or lower
      if (tileFloorDepth >= 0) {
        const tileFloorRadius = this.currentPlanet.depthToRadius(tileFloorDepth);
        if (tileFloorRadius <= wallThresholdRadius) continue;
      }

      // Calculate horizontal distance from player to this tile's center
      const tileCenter = new THREE.Vector3(tile.center.x, tile.center.y, tile.center.z)
        .add(this.currentPlanet.center);
      const toTile = tileCenter.clone().sub(newPosition);
      const verticalComponent = toTile.dot(surfaceNormal);
      const horizontalDistToCenter = toTile.clone().sub(surfaceNormal.clone().multiplyScalar(verticalComponent)).length();

      // Estimate distance to nearest edge of this tile's blocks
      // If we're outside the tile, distance to edge is (distToCenter - tileRadius)
      // If we're inside the tile, we're touching the block
      const horizontalDistToEdge = Math.max(0, horizontalDistToCenter - approxTileRadius);

      // Check if player body would collide with solid blocks in this tile
      // Only check blocks that could be WALLS (blocks whose top is above the wall threshold)
      // Blocks at or below the threshold are potential landing spots, not walls
      for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
        const block = getCachedBlock(this.currentPlanet, tileIdx, d);
        if (block === HexBlockType.AIR || block === HexBlockType.WATER) continue;

        const blockTopRadius = this.currentPlanet.depthToRadius(d);
        const blockBottomRadius = blockTopRadius - 1;

        // Skip blocks at or below the wall threshold - those are ground, not walls
        // This allows walking between tiles at the same level or to lower ground
        if (blockTopRadius <= wallThresholdRadius) continue;

        // Check if block overlaps with player body vertically (must overlap both top and bottom)
        const verticalOverlap = blockBottomRadius < playerTopRadius && blockTopRadius > playerBottomRadius;
        if (verticalOverlap) {
          // Skip the ground block (the one player would stand ON) - only for center tile
          // Use tolerance for floating point comparison
          const isGroundBlock = Math.abs(blockTopRadius - playerBottomRadius) < 0.1;
          if (this.isGrounded && tileIdx === newTile.index && isGroundBlock) continue;

          // Check if player radius overlaps with this block horizontally
          // Player collides if distance to block edge < PLAYER_RADIUS
          if (horizontalDistToEdge < PlayerConfig.PLAYER_RADIUS) {
            return true; // Would be too close to or inside solid terrain
          }
        }
      }
    }

    return false;
  }

  // Check if there's enough headroom at the target tile for the player to walk there
  // Returns true if there's NOT enough headroom (blocked by ceiling)
  //
  // This finds the WALKABLE ground level at destination (closest to current height that
  // we can step to), then checks if player would fit standing there.
  //
  // Note: player.position is at FEET level (bottom of player)
  private checkHeadroomCollision(newPosition: THREE.Vector3): boolean {
    if (!this.currentPlanet) return false;

    const newTile = this.currentPlanet.getTileAtPointFast(newPosition);
    if (!newTile) return false;

    // Get current ground depth - use player's actual radius to find the floor they're on
    const playerFeetRadius = this.position.distanceTo(this.currentPlanet.center);
    const currentTile = this.currentPlanet.getTileAtPointFast(this.position);
    let currentGroundDepth = -1;
    if (currentTile) {
      currentGroundDepth = findWalkableFloorAtRadius(this.currentPlanet, currentTile.index, playerFeetRadius);
    }
    if (currentGroundDepth < 0) return false; // No current ground, allow movement
    const currentGroundRadius = this.currentPlanet.depthToRadius(currentGroundDepth);

    // Find the WALKABLE ground at destination - scan for air-to-solid transitions
    let destGroundDepth = -1;
    let bestHeightDiff = Infinity;

    for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
      const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? getCachedBlock(this.currentPlanet, newTile.index, d + 1) : HexBlockType.AIR;
      const block = getCachedBlock(this.currentPlanet, newTile.index, d);

      const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
      const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;

      if (isAbovePassable && isCurrentSolid) {
        const groundRadius = this.currentPlanet.depthToRadius(d);
        const heightDiff = groundRadius - currentGroundRadius;

        // Can we step to this level?
        if (heightDiff <= PlayerConfig.AUTO_STEP_HEIGHT) {
          if (Math.abs(heightDiff) < Math.abs(bestHeightDiff)) {
            destGroundDepth = d;
            bestHeightDiff = heightDiff;
          }
        }
      }
    }

    if (destGroundDepth < 0) return false; // No walkable ground at destination

    // Calculate where player's feet and head would be if standing on destination ground
    const destGroundRadius = this.currentPlanet.depthToRadius(destGroundDepth);
    const playerFeetAtDest = destGroundRadius;
    const playerHeadAtDest = destGroundRadius + PlayerConfig.PLAYER_HEIGHT;

    // Check all blocks in the destination tile to see if any would collide with player's body
    for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
      const block = getCachedBlock(this.currentPlanet, newTile.index, d);
      if (block === HexBlockType.AIR || block === HexBlockType.WATER) continue;

      const blockTopRadius = this.currentPlanet.depthToRadius(d);
      const blockBottomRadius = blockTopRadius - 1;

      // They overlap if: blockTop > playerFeet AND blockBottom < playerHead
      if (blockTopRadius > playerFeetAtDest && blockBottomRadius < playerHeadAtDest) {
        // Skip the ground block itself
        if (d === destGroundDepth) continue;
        return true; // Player would collide with ceiling/wall block
      }
    }

    return false; // No collision, enough headroom
  }

  // Check if position is valid (no collision with terrain at any capsule height)
  // Water blocks are passable - only solid blocks block movement
  //
  // If verticalOnly is true, only check the tile at the feet position (for vertical movement in shafts)
  //
  // Note: player.position is at FEET level (bottom of player)
  private isPositionValid(position: THREE.Vector3, verticalOnly: boolean = false): boolean {
    if (!this.currentPlanet) return true;

    const actualUp = this.currentPlanet.getSurfaceNormal(position);
    // Position is at feet level (bottom of player)
    const playerBottomRadius = position.distanceTo(this.currentPlanet.center);

    // Find the SHALLOWEST (lowest depth) solid block to establish the absolute floor
    // Lower depth = closer to planet core, so first solid block from d=0 is the floor
    const tile = this.currentPlanet.getTileAtPoint(position);
    if (tile) {
      let floorDepth = -1;
      for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
        const block = getCachedBlock(this.currentPlanet, tile.index, d);
        if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
          floorDepth = d;
          break; // First solid block from bottom is the floor
        }
      }
      // If there's solid ground, ensure player's feet don't go below the bottom of it
      if (floorDepth >= 0) {
        const floorRadius = this.currentPlanet.depthToRadius(floorDepth) - 1; // Bottom of floor block
        if (playerBottomRadius < floorRadius) {
          console.log(`isPositionValid BLOCKED by floor: feetR=${playerBottomRadius.toFixed(2)}, floorR=${floorRadius.toFixed(2)}, floorD=${floorDepth}`);
          return false; // Feet below the absolute floor
        }
      }
    }

    // Check collision at multiple heights along the capsule (from feet to head)
    // Offsets are POSITIVE since we check from feet (position) up to head
    const checkOffsets = [0.1, PlayerConfig.PLAYER_HEIGHT * 0.5, PlayerConfig.PLAYER_HEIGHT];

    // For verticalOnly mode, only check the tile at the feet position
    // This allows jumping in narrow shafts where neighbor tiles have solid blocks
    const feetTile = tile;

    for (const offset of checkOffsets) {
      const checkRadius = playerBottomRadius + offset;

      // In verticalOnly mode, use the feet tile for all checks
      // Otherwise, find the tile at each check position (which may be a neighbor)
      let checkTile: ReturnType<typeof this.currentPlanet.getTileAtPoint>;
      let depth: number;

      if (verticalOnly && feetTile) {
        // Use feet tile and calculate depth from radius
        checkTile = feetTile;
        // Convert radius to depth
        for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
          const depthRadius = this.currentPlanet.depthToRadius(d);
          if (checkRadius <= depthRadius) {
            depth = d;
            break;
          }
        }
        depth = depth! ?? MAX_TERRAIN_DEPTH - 1;
      } else {
        const checkPos = this.currentPlanet.center.clone()
          .add(actualUp.clone().multiplyScalar(checkRadius));
        checkTile = this.currentPlanet.getTileAtPoint(checkPos);
        if (!checkTile) continue;
        depth = this.currentPlanet.getDepthAtPoint(checkPos);
      }

      if (depth < 0 || depth >= MAX_TERRAIN_DEPTH) continue;

      // Check if inside a solid block (not AIR and not WATER - water is passable)
      const block = getCachedBlock(this.currentPlanet, checkTile.index, depth);
      if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
        const blockOuterRadius = this.currentPlanet.depthToRadius(depth);
        if (checkRadius < blockOuterRadius) {
          console.log(`isPositionValid BLOCKED: offset=${offset.toFixed(2)}, checkR=${checkRadius.toFixed(2)}, depth=${depth}, blockTopR=${blockOuterRadius.toFixed(2)}, block=${block}, tile=${checkTile.index}`);
          return false; // Inside a solid block
        }
      }
    }

    return true;
  }

  // Push player out of solid geometry if they somehow got stuck
  // This is a safety net for edge cases where normal collision detection fails
  //
  // Note: player.position is at FEET level (bottom of player)
  private resolveStuckPosition(actualUp: THREE.Vector3): void {
    if (!this.currentPlanet) return;

    const tile = this.currentPlanet.getTileAtPointFast(this.position);
    if (!tile) return;

    // Position is at feet level, head is PLAYER_HEIGHT above
    const playerBottomRadius = this.position.distanceTo(this.currentPlanet.center);
    const playerTopRadius = playerBottomRadius + PlayerConfig.PLAYER_HEIGHT;

    // First, find all WALKABLE floors (air-to-solid transitions) in this tile
    // These are the valid places the player could stand
    const walkableFloors: { depth: number; radius: number }[] = [];
    for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
      const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? getCachedBlock(this.currentPlanet, tile.index, d + 1) : HexBlockType.AIR;
      const block = getCachedBlock(this.currentPlanet, tile.index, d);

      const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
      const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;

      if (isAbovePassable && isCurrentSolid) {
        const floorRadius = this.currentPlanet.depthToRadius(d);
        walkableFloors.push({ depth: d, radius: floorRadius });
      }
    }

    if (walkableFloors.length === 0) return; // No walkable surfaces

    // Find the walkable floor closest to player's current feet level
    // IMPORTANT: Prefer floors BELOW the player (that they can fall to) over floors ABOVE
    // This prevents teleporting players upward when they walk onto a tile with multiple floors
    let bestFloor = walkableFloors[0];
    let bestDist = Math.abs(playerBottomRadius - bestFloor.radius);
    let bestIsBelow = bestFloor.radius <= playerBottomRadius;

    for (const floor of walkableFloors) {
      const dist = Math.abs(playerBottomRadius - floor.radius);
      const isBelow = floor.radius <= playerBottomRadius;

      // Prefer floors below the player over floors above
      // Only switch to a floor above if there are no floors below
      if (isBelow && !bestIsBelow) {
        // This floor is below and best is above - always prefer below
        bestFloor = floor;
        bestDist = dist;
        bestIsBelow = true;
      } else if (isBelow === bestIsBelow && dist < bestDist) {
        // Same category (both above or both below) - pick closer one
        bestDist = dist;
        bestFloor = floor;
      }
    }

    // Check if player would fit standing on this floor (enough headroom)
    const feetAtFloor = bestFloor.radius;
    const headAtFloor = feetAtFloor + PlayerConfig.PLAYER_HEIGHT;

    // Check if any solid blocks would collide with player body at this floor
    let floorIsValid = true;
    for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
      const block = getCachedBlock(this.currentPlanet, tile.index, d);
      if (block === HexBlockType.AIR || block === HexBlockType.WATER) continue;

      const blockTopRadius = this.currentPlanet.depthToRadius(d);
      const blockBottomRadius = blockTopRadius - 1;

      // Skip the floor block itself
      if (d === bestFloor.depth) continue;

      // Check overlap with player body standing on this floor
      if (blockTopRadius > feetAtFloor && blockBottomRadius < headAtFloor) {
        floorIsValid = false;
        break;
      }
    }

    if (!floorIsValid) return; // Can't fit at best floor, don't force a move

    // Now check if player is actually stuck (overlapping solid blocks at current position)
    let isStuck = false;
    for (let d = 0; d < MAX_TERRAIN_DEPTH; d++) {
      const block = getCachedBlock(this.currentPlanet, tile.index, d);
      if (block === HexBlockType.AIR || block === HexBlockType.WATER) continue;

      const blockTopRadius = this.currentPlanet.depthToRadius(d);
      const blockBottomRadius = blockTopRadius - 1;

      // Player overlaps if: blockTop > playerBottom AND blockBottom < playerTop
      if (blockTopRadius > playerBottomRadius && blockBottomRadius < playerTopRadius) {
        // Skip the ground block player is standing on
        if (Math.abs(blockTopRadius - playerBottomRadius) < 0.2) continue;
        isStuck = true;
        break;
      }
    }

    if (!isStuck) return; // Not stuck, nothing to do

    // Move player to the best walkable floor
    const safeRadius = bestFloor.radius + 0.1;
    this.position.copy(this.currentPlanet.center).addScaledVector(actualUp, safeRadius);

    // When underwater, just stop downward velocity rather than all velocity
    // This allows continued horizontal swimming movement
    if (this.isInWater) {
      const upComponent = this.velocity.dot(actualUp);
      if (upComponent < 0) {
        this.velocity.sub(actualUp.clone().multiplyScalar(upComponent));
      }
    } else {
      this.velocity.set(0, 0, 0); // Reset velocity when unsticking on land
    }
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

    // Jetpack only activates after double-jump (hasDoubleJumped = true) and if enabled
    // Once activated, holding space continues to thrust upward
    if (this.jetpackEnabled && this.hasDoubleJumped && input.jump && !this.isGrounded) {
      this.isJetpacking = true;
      // Thrust upward using consistent direction to prevent drift
      this.velocity.addScaledVector(thrustUp, PlayerConfig.JETPACK_FORCE * deltaTime);
    } else if (!input.jump) {
      // Only turn off jetpacking when space is released (not when grounded)
      this.isJetpacking = false;
    }

    // Jetpack down / descend (Ctrl) - only when jetpack is active and enabled
    if (this.jetpackEnabled && this.hasDoubleJumped && input.crouch) {
      // Thrust downward (toward planet) - use same direction for consistency
      this.velocity.addScaledVector(thrustUp, -PlayerConfig.JETPACK_DOWN_FORCE * deltaTime);
    }
  }

  private applyGravity(deltaTime: number): void {
    if (!this.currentPlanet) return;

    // Get actual up direction from planet (not localUp which may lag behind)
    const actualUp = this.currentPlanet.getSurfaceNormal(this.position);
    const currentDist = this.position.distanceTo(this.currentPlanet.center);

    // FIRST: Check if player is stuck inside solid geometry and push them out
    // This handles edge cases where collision detection failed
    this.resolveStuckPosition(actualUp);

    // Water state is already updated in handleMovement for current frame
    // Don't re-check here to avoid timing issues

    // Get the tile at current position
    const currentTile = this.currentPlanet.getTileAtPointFast(this.position);

    // Find ground level at current tile - use player's actual position to find the
    // walkable floor closest to where they are (handles caves correctly)
    let groundDepth = -1;
    if (currentTile) {
      groundDepth = findWalkableFloorAtRadius(this.currentPlanet, currentTile.index, currentDist);
    }

    // Calculate ground position for current tile
    // Player position is at FEET level (bottom of player)
    const groundRadius = groundDepth >= 0 ? this.currentPlanet.depthToRadius(groundDepth) : 0;
    const targetRadius = groundRadius;

    // Check if currently on ground (solid blocks only)
    const onGround = groundDepth >= 0 && currentDist <= targetRadius + 0.05;

    if (onGround && this.velocity.dot(actualUp) <= 0) {
      // On the ground - stop vertical movement
      const wasAirborne = !this.wasGrounded;
      this.isGrounded = true;
      this.hasDoubleJumped = false; // Reset double-jump when landing
      this.isJetpacking = false;

      // Play landing sound when landing from air
      if (wasAirborne) {
        AudioManager.play('landing', { position: this.position.clone() });
      }

      // Snap to ground at the correct radial distance
      // Use jump direction if available and WASD wasn't pressed (pure vertical jump)
      // This prevents drift from the landing position being slightly different from jump start
      const snapDirection = (this.jumpDirection && !this.wasdPressedDuringJump)
        ? this.jumpDirection
        : actualUp;
      this.position.copy(this.currentPlanet.center).addScaledVector(snapDirection, targetRadius);

      // Check for jump drift after snapping
      this.checkJumpDrift();

      // Clear all velocity when landing on ground
      // This prevents residual horizontal velocity from causing drift after landing
      this.velocity.set(0, 0, 0);
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
      // Apply water physics when:
      // 1. Eyes are underwater (truly submerged)
      // 2. OR floating at surface (maintain float even with negative WATER_SURFACE_FLOAT_HEIGHT)
      if (this.feetInWater && (this.isInWater || this.isFloatingAtSurface)) {
        // When floating at surface, don't apply gravity at all
        if (this.isFloatingAtSurface) {
          effectiveGravity = 0;
        } else {
          effectiveGravity *= PlayerConfig.WATER_GRAVITY_MULTIPLIER;
        }

        // Apply water drag to slow down movement (but less when floating)
        if (!this.isFloatingAtSurface) {
          this.velocity.multiplyScalar(1 - PlayerConfig.WATER_DRAG * deltaTime);
        }
      }

      // Apply gravity (purely radial toward planet center)
      if (effectiveGravity > 0) {
        this.velocity.addScaledVector(gravityDir, effectiveGravity * deltaTime);
      }

      // Add some drag when high up to prevent infinite acceleration
      const altitude = this.getAltitude();
      if (altitude > 20 && !this.feetInWater) {
        this.velocity.multiplyScalar(0.99);
      }

      // Apply velocity
      const newPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
      const newDist = newPosition.distanceTo(this.currentPlanet.center);

      // Get WALKABLE ground at NEW position (might be different tile)
      // Find the walkable floor closest to current height (same logic as collision checks)
      const newTile = this.currentPlanet.getTileAtPointFast(newPosition);
      let newGroundDepth = -1;
      let bestHeightDiff = Infinity;

      if (newTile) {
        for (let d = 0; d < MAX_TERRAIN_DEPTH - 1; d++) {
          const blockAbove = d < MAX_TERRAIN_DEPTH - 1 ? getCachedBlock(this.currentPlanet, newTile.index, d + 1) : HexBlockType.AIR;
          const block = getCachedBlock(this.currentPlanet, newTile.index, d);

          // Walkable floor: solid block with air/water above
          const isAbovePassable = blockAbove === HexBlockType.AIR || blockAbove === HexBlockType.WATER;
          const isCurrentSolid = block !== HexBlockType.AIR && block !== HexBlockType.WATER;

          if (isAbovePassable && isCurrentSolid) {
            const floorRadius = this.currentPlanet.depthToRadius(d);
            const heightDiff = floorRadius - groundRadius;

            // Can we step/fall to this level? (within AUTO_STEP_HEIGHT up, or any amount down)
            if (heightDiff <= PlayerConfig.AUTO_STEP_HEIGHT) {
              if (Math.abs(heightDiff) < Math.abs(bestHeightDiff)) {
                newGroundDepth = d;
                bestHeightDiff = heightDiff;
              }
            }
          }
        }
      }

      const newGroundRadius = newGroundDepth >= 0 ? this.currentPlanet.depthToRadius(newGroundDepth) : 0;
      const newTargetRadius = newGroundRadius; // Position is at feet level

      // Check if this would be stepping UP (blocked by AUTO_STEP_HEIGHT)
      // But when underwater, disable step blocking - player should swim freely over terrain
      const heightDiff = newGroundRadius - groundRadius;
      const wouldStepUp = !this.isInWater && heightDiff > PlayerConfig.AUTO_STEP_HEIGHT;

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

          // Check for jump drift after snapping (only when not in water)
          if (!this.isInWater) {
            this.checkJumpDrift();
          }
          this.isGrounded = !this.isInWater; // Don't mark grounded when landing underwater
        }
      } else {
        // Continue falling/moving - check both capsule collision AND wall collision
        const positionValid = this.isPositionValid(newPosition);
        const wallBlocking = this.checkWallCollision(newPosition);

        if (positionValid && !wallBlocking) {
          // No collision - apply full movement
          this.position.copy(newPosition);
        } else {
          // Collision detected - try to slide along obstacles
          // Decompose velocity into vertical and horizontal components
          const verticalVel = actualUp.clone().multiplyScalar(this.velocity.dot(actualUp));
          const horizontalVel = this.velocity.clone().sub(verticalVel);

          // Try vertical movement only - use verticalOnly=true to allow movement in narrow shafts
          // This checks only the current tile's blocks, not neighbor tiles
          const verticalMove = verticalVel.clone().multiplyScalar(deltaTime);
          const verticalNewPos = this.position.clone().add(verticalMove);

          // Determine if we're moving up or down
          const movingUp = this.velocity.dot(actualUp) > 0;

          // For upward movement (jumping), check full body collision (head might hit ceiling)
          // For downward movement (falling), only check feet position - don't let ceiling block falling
          let verticalValid: boolean;
          if (movingUp) {
            // Jumping up - check if head would hit ceiling (only in current tile column)
            const posValid = this.isPositionValid(verticalNewPos, true);
            const wallBlock = this.checkWallCollision(verticalNewPos, true);
            verticalValid = posValid && !wallBlock;
            if (!verticalValid) {
              const newFeetRadius = verticalNewPos.distanceTo(this.currentPlanet.center);
              const newHeadRadius = newFeetRadius + PlayerConfig.PLAYER_HEIGHT;
              console.log(`Jump blocked: posValid=${posValid}, wallBlock=${wallBlock}, newFeetR=${newFeetRadius.toFixed(2)}, newHeadR=${newHeadRadius.toFixed(2)}`);
            }
          } else {
            // Falling down - only check if feet would enter solid block
            // Don't check full body (head) since we're moving away from the ceiling
            verticalValid = !this.checkWallCollision(verticalNewPos, true);

            // Also check we're not falling into solid ground (feet check only)
            if (verticalValid) {
              const tile = this.currentPlanet.getTileAtPoint(verticalNewPos);
              if (tile) {
                const feetRadius = verticalNewPos.distanceTo(this.currentPlanet.center);
                const feetDepth = this.currentPlanet.getDepthAtPoint(verticalNewPos);
                if (feetDepth >= 0 && feetDepth < MAX_TERRAIN_DEPTH) {
                  const block = getCachedBlock(this.currentPlanet, tile.index, feetDepth);
                  if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
                    const blockTop = this.currentPlanet.depthToRadius(feetDepth);
                    if (feetRadius < blockTop) {
                      verticalValid = false; // Would fall into solid block
                    }
                  }
                }
              }
            }
          }

          if (verticalValid) {
            this.position.copy(verticalNewPos);

            // During falling, check edge nudge each frame to push away from higher neighbors
            if (!movingUp) {
              this.checkEdgeNudge();
            }
          } else {
            // Vertical blocked - stop vertical velocity (both up and down)
            const upComponent = this.velocity.dot(actualUp);
            // Remove the vertical component of velocity entirely (ceiling or floor collision)
            this.velocity.sub(actualUp.clone().multiplyScalar(upComponent));
          }

          // Try horizontal movement (sliding along walls)
          if (horizontalVel.lengthSq() > 0.001) {
            const horizontalMove = horizontalVel.clone().multiplyScalar(deltaTime);
            const horizontalNewPos = this.position.clone().add(horizontalMove);

            if (this.isPositionValid(horizontalNewPos) && !this.checkWallCollision(horizontalNewPos)) {
              this.position.copy(horizontalNewPos);
            } else {
              // Horizontal blocked - reduce horizontal velocity
              this.velocity.sub(horizontalVel.clone().multiplyScalar(0.5));
            }
          }
        }
      }
    }
  }

  private updateCamera(): void {
    // Position is at feet level, so add EYE_HEIGHT to get eye position
    // Calculate radial direction directly from position (planet surface normal)
    const planetUp = this.currentPlanet
      ? this.position.clone().sub(this.currentPlanet.center).normalize()
      : this.localUp.clone();

    const eyePos = this.position.clone();
    const eyeOffset = planetUp.clone().multiplyScalar(PlayerConfig.PLAYER_EYE_HEIGHT);
    eyePos.add(eyeOffset);
    this.camera.position.copy(eyePos);

    // Use orientation-based look direction (consistent with movement)
    const lookDir = this.localForward.clone().negate();
    const target = eyePos.clone().add(lookDir);

    // On planet, force camera.up to be the planet surface normal (keeps horizon level)
    // In space, use localUp for 6DOF
    this.camera.up.copy(this.isInSpace ? this.localUp : planetUp);
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

    // Update coordinates display (top-right corner)
    const depthElement = document.getElementById('block-depth');
    if (depthElement && this.currentPlanet) {
      const coords = this.currentPlanet.getCoordinatesAtPoint(this.position);
      const latDir = coords.lat >= 0 ? 'N' : 'S';
      const lonDir = coords.lon >= 0 ? 'E' : 'W';
      depthElement.textContent = `${Math.abs(coords.lat).toFixed(1)}°${latDir} ${Math.abs(coords.lon).toFixed(1)}°${lonDir} D:${coords.depth}`;
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

  public setJetpackEnabled(enabled: boolean): void {
    this.jetpackEnabled = enabled;
    // If disabling jetpack while jetpacking, stop it
    if (!enabled) {
      this.isJetpacking = false;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      // Stop any ongoing actions
      this.isJetpacking = false;
      this.velocity.set(0, 0, 0);
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  // Set callback for tech block data (used by Shift+X debug)
  public setTechBlockDataCallback(callback: (tileIndices: number[]) => {
    torches: { tileIndex: number }[];
    furnaces: { tileIndex: number }[];
    electricFurnaces: { tileIndex: number }[];
    electronicsWorkbenches: { tileIndex: number }[];
    storageChests: { tileIndex: number }[];
    steamEngines: { tileIndex: number }[];
    hydroGenerators: { tileIndex: number }[];
    copperPipes: { tileIndex: number; depth: number }[];
    cables: { tileIndex: number; depth: number }[];
  }): void {
    this.getTechBlockDataCallback = callback;
  }

  // Export player state for saving
  public exportForSave(): {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
    velocity: { x: number; y: number; z: number };
  } {
    return {
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      orientation: { x: this.orientation.x, y: this.orientation.y, z: this.orientation.z, w: this.orientation.w },
      velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z }
    };
  }

  // Import player state from save
  public importFromSave(data: {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
    velocity: { x: number; y: number; z: number };
  }): void {
    this.position.set(data.position.x, data.position.y, data.position.z);
    this.orientation.set(data.orientation.x, data.orientation.y, data.orientation.z, data.orientation.w);
    this.velocity.set(data.velocity.x, data.velocity.y, data.velocity.z);
    // Update local axes from orientation
    this.updateLocalFromOrientation();
  }
}
