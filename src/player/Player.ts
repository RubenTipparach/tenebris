import * as THREE from 'three';
import { InputManager, InputState } from '../engine/InputManager';

export class Player {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;

  private inputManager: InputManager;
  private yaw: number = 0;
  private pitch: number = 0;

  // Movement constants
  private readonly WALK_SPEED = 8;
  private readonly SPRINT_SPEED = 14;
  private readonly JUMP_FORCE = 10;
  private readonly GRAVITY = 25;
  private readonly MOUSE_SENSITIVITY = 0.002;
  private readonly PLAYER_HEIGHT = 1.8;
  private readonly PLAYER_EYE_HEIGHT = 1.6;

  private isGrounded: boolean = false;
  private groundCheckCallback?: (position: THREE.Vector3, height: number) => boolean;
  private collisionCheckCallback?: (from: THREE.Vector3, to: THREE.Vector3, radius: number) => THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.position = new THREE.Vector3(0, 20, 0);
    this.velocity = new THREE.Vector3();

    // Initial camera rotation
    this.camera.rotation.order = 'YXZ';
  }

  public setGroundCheckCallback(callback: (position: THREE.Vector3, height: number) => boolean): void {
    this.groundCheckCallback = callback;
  }

  public setCollisionCheckCallback(callback: (from: THREE.Vector3, to: THREE.Vector3, radius: number) => THREE.Vector3): void {
    this.collisionCheckCallback = callback;
  }

  public update(deltaTime: number): void {
    const input = this.inputManager.getState();

    // Handle mouse look
    this.handleMouseLook(input);

    // Handle movement
    this.handleMovement(input, deltaTime);

    // Apply gravity
    this.applyGravity(deltaTime);

    // Update camera position
    this.camera.position.copy(this.position);
    this.camera.position.y += this.PLAYER_EYE_HEIGHT;

    // Update UI
    this.updateUI();
  }

  private handleMouseLook(input: InputState): void {
    if (!this.inputManager.isLocked()) return;

    this.yaw -= input.mouseX * this.MOUSE_SENSITIVITY;
    this.pitch -= input.mouseY * this.MOUSE_SENSITIVITY;

    // Clamp pitch to prevent flipping
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private handleMovement(input: InputState, deltaTime: number): void {
    // Get movement direction relative to camera
    const direction = new THREE.Vector3();

    if (input.forward) direction.z -= 1;
    if (input.backward) direction.z += 1;
    if (input.left) direction.x -= 1;
    if (input.right) direction.x += 1;

    // Normalize for consistent speed when moving diagonally
    if (direction.length() > 0) {
      direction.normalize();
    }

    // Rotate direction to match camera yaw
    const euler = new THREE.Euler(0, this.yaw, 0);
    direction.applyEuler(euler);

    // Apply movement speed
    const speed = input.sprint ? this.SPRINT_SPEED : this.WALK_SPEED;
    const moveVector = direction.multiplyScalar(speed * deltaTime);

    // Calculate new position
    const newPosition = this.position.clone().add(moveVector);

    // Check collision
    if (this.collisionCheckCallback) {
      const adjustedPosition = this.collisionCheckCallback(this.position, newPosition, 0.3);
      this.position.x = adjustedPosition.x;
      this.position.z = adjustedPosition.z;
    } else {
      this.position.x = newPosition.x;
      this.position.z = newPosition.z;
    }

    // Handle jumping
    if (input.jump && this.isGrounded) {
      this.velocity.y = this.JUMP_FORCE;
      this.isGrounded = false;
    }
  }

  private applyGravity(deltaTime: number): void {
    // Apply gravity
    this.velocity.y -= this.GRAVITY * deltaTime;

    // Calculate new Y position
    const newY = this.position.y + this.velocity.y * deltaTime;

    // Check if grounded
    if (this.groundCheckCallback) {
      const groundLevel = this.getGroundLevel();

      if (newY <= groundLevel) {
        this.position.y = groundLevel;
        this.velocity.y = 0;
        this.isGrounded = true;
      } else {
        this.position.y = newY;
        this.isGrounded = false;
      }
    } else {
      // Simple ground at y=0
      if (newY <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
        this.isGrounded = true;
      } else {
        this.position.y = newY;
        this.isGrounded = false;
      }
    }
  }

  private getGroundLevel(): number {
    if (!this.groundCheckCallback) return 0;

    // Check blocks below player
    const checkPos = this.position.clone();

    // Start from current position and check downward
    for (let y = Math.floor(this.position.y); y >= 0; y--) {
      checkPos.y = y;
      if (this.groundCheckCallback(checkPos, this.PLAYER_HEIGHT)) {
        return y + 1; // Return top of the block
      }
    }

    return 0;
  }

  private updateUI(): void {
    const posElement = document.getElementById('position');
    if (posElement) {
      posElement.textContent = `Position: ${Math.floor(this.position.x)}, ${Math.floor(this.position.y)}, ${Math.floor(this.position.z)}`;
    }
  }

  public getForwardVector(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    return forward;
  }

  public getRaycastOrigin(): THREE.Vector3 {
    return this.camera.position.clone();
  }
}
