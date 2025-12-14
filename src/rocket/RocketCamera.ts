import * as THREE from 'three';
import { ROCKET_CONFIG } from '../config/RocketConfig';

/**
 * Orbit camera for rocket flight mode
 * Camera orbits around the rocket's center, controlled by mouse movement
 */
export class RocketCamera {
  private camera: THREE.PerspectiveCamera;

  // Target values (what user is aiming for)
  private targetDistance: number;
  private targetAzimuth: number;      // Horizontal angle (radians)
  private targetElevation: number;    // Vertical angle (radians)

  // Current smoothed values
  private currentDistance: number;
  private currentAzimuth: number;
  private currentElevation: number;

  // Rocket tracking
  private rocketCenter: THREE.Vector3 = new THREE.Vector3();
  private rocketUp: THREE.Vector3 = new THREE.Vector3(0, 1, 0);  // Rocket's local up

  // Configuration
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly minElevation: number;
  private readonly maxElevation: number;
  private readonly smoothSpeed: number;
  private readonly mouseSensitivity: number;
  private readonly zoomSpeed: number;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    // Initialize from config
    const cfg = ROCKET_CONFIG.CAMERA;
    this.targetDistance = cfg.defaultDistance;
    this.currentDistance = cfg.defaultDistance;
    this.targetAzimuth = 0;
    this.currentAzimuth = 0;
    this.targetElevation = 0.3;  // Slightly above horizontal
    this.currentElevation = 0.3;

    this.minDistance = cfg.minDistance;
    this.maxDistance = cfg.maxDistance;
    this.minElevation = cfg.minElevation;
    this.maxElevation = cfg.maxElevation;
    this.smoothSpeed = cfg.smoothSpeed;
    this.mouseSensitivity = cfg.mouseSensitivity;
    this.zoomSpeed = cfg.zoomSpeed;
  }

  /**
   * Handle mouse movement for camera rotation
   * @param deltaX Mouse movement in X (pixels)
   * @param deltaY Mouse movement in Y (pixels)
   */
  public handleMouseMove(deltaX: number, deltaY: number): void {
    // Update target angles based on mouse movement
    // Invert deltaX so dragging left rotates camera left (more intuitive)
    this.targetAzimuth += deltaX * this.mouseSensitivity;
    this.targetElevation += deltaY * this.mouseSensitivity;

    // Clamp elevation to prevent gimbal lock
    this.targetElevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.targetElevation));

    // Keep azimuth in -PI to PI range
    while (this.targetAzimuth > Math.PI) this.targetAzimuth -= Math.PI * 2;
    while (this.targetAzimuth < -Math.PI) this.targetAzimuth += Math.PI * 2;
  }

  /**
   * Handle scroll wheel for zoom
   * @param delta Scroll delta (positive = zoom out, negative = zoom in)
   */
  public handleScroll(delta: number): void {
    // Multiplicative zoom for natural feel
    this.targetDistance *= (1 + delta * this.zoomSpeed);
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
  }

  /**
   * Set the rocket's center position and up vector
   * Call this each frame with the rocket's current transform
   */
  public setRocketTransform(center: THREE.Vector3, up: THREE.Vector3): void {
    this.rocketCenter.copy(center);
    this.rocketUp.copy(up).normalize();
  }

  /**
   * Update camera position and orientation
   * @param deltaTime Time since last frame in seconds
   */
  public update(deltaTime: number): void {
    // Smooth interpolation toward target values
    const lerpFactor = 1 - Math.exp(-this.smoothSpeed * deltaTime);

    this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, this.targetDistance, lerpFactor);
    this.currentElevation = THREE.MathUtils.lerp(this.currentElevation, this.targetElevation, lerpFactor);

    // Angle lerping needs to handle wraparound
    this.currentAzimuth = this.lerpAngle(this.currentAzimuth, this.targetAzimuth, lerpFactor);

    // Calculate camera position in rocket's local space
    // Elevation: 0 = horizontal, positive = above, negative = below
    // Azimuth: 0 = behind rocket, positive = right, negative = left
    const cosElev = Math.cos(this.currentElevation);
    const sinElev = Math.sin(this.currentElevation);
    const cosAzi = Math.cos(this.currentAzimuth);
    const sinAzi = Math.sin(this.currentAzimuth);

    // Build orthonormal basis around rocket's up vector
    // We need forward and right vectors relative to rocket
    const worldUp = new THREE.Vector3(0, 1, 0);
    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    // If rocket up is nearly aligned with world up, use world forward
    if (Math.abs(this.rocketUp.dot(worldUp)) > 0.99) {
      forward.set(0, 0, -1);
    } else {
      forward.crossVectors(worldUp, this.rocketUp).normalize();
    }
    right.crossVectors(this.rocketUp, forward).normalize();
    forward.crossVectors(right, this.rocketUp).normalize();

    // Calculate offset from rocket center
    // Local coordinates: x = right, y = up, z = forward (behind is -z)
    const localOffset = new THREE.Vector3(
      sinAzi * cosElev,   // Right component
      sinElev,            // Up component
      -cosAzi * cosElev   // Forward component (negative = behind)
    );

    // Transform to world space
    const worldOffset = new THREE.Vector3(
      right.x * localOffset.x + this.rocketUp.x * localOffset.y + forward.x * localOffset.z,
      right.y * localOffset.x + this.rocketUp.y * localOffset.y + forward.y * localOffset.z,
      right.z * localOffset.x + this.rocketUp.z * localOffset.y + forward.z * localOffset.z
    );

    // Calculate desired camera position
    const desiredPosition = this.rocketCenter.clone().addScaledVector(worldOffset, this.currentDistance);

    // Position camera
    this.camera.position.copy(desiredPosition);

    // Align camera up with rocket up and look at rocket center
    this.camera.up.copy(this.rocketUp);
    this.camera.lookAt(this.rocketCenter);
  }

  /**
   * Lerp between two angles, handling wraparound
   */
  private lerpAngle(from: number, to: number, t: number): number {
    let diff = to - from;

    // Handle wraparound
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    return from + diff * t;
  }

  /**
   * Reset camera to default position behind rocket
   */
  public reset(): void {
    this.targetAzimuth = 0;
    this.targetElevation = 0.3;
    this.targetDistance = ROCKET_CONFIG.CAMERA.defaultDistance;
  }

  /**
   * Snap camera immediately to target (no smoothing)
   */
  public snap(): void {
    this.currentAzimuth = this.targetAzimuth;
    this.currentElevation = this.targetElevation;
    this.currentDistance = this.targetDistance;
  }

  /**
   * Get the camera's forward direction (for UI orientation hints)
   */
  public getCameraForward(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    return forward;
  }

  /**
   * Get current zoom level as 0-1 (0 = closest, 1 = furthest)
   */
  public getZoomLevel(): number {
    return (this.currentDistance - this.minDistance) / (this.maxDistance - this.minDistance);
  }

  /**
   * Set zoom to specific level (0-1)
   */
  public setZoomLevel(level: number): void {
    this.targetDistance = this.minDistance + level * (this.maxDistance - this.minDistance);
  }
}
