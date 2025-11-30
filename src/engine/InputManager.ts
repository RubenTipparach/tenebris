export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  mouseX: number;
  mouseY: number;
  leftClick: boolean;
  rightClick: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseMovement: { x: number; y: number } = { x: 0, y: 0 };
  private mouseButtons: { left: boolean; right: boolean } = { left: false, right: false };
  private isPointerLocked: boolean = false;
  private onPointerLockChange?: (locked: boolean) => void;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseMovement.x += e.movementX;
        this.mouseMovement.y += e.movementY;
      }
    });

    // Mouse buttons
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseButtons.left = true;
      if (e.button === 2) this.mouseButtons.right = true;
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseButtons.left = false;
      if (e.button === 2) this.mouseButtons.right = false;
    });

    // Prevent context menu
    document.addEventListener('contextmenu', (e) => {
      if (this.isPointerLocked) {
        e.preventDefault();
      }
    });

    // Pointer lock
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement !== null;
      if (this.onPointerLockChange) {
        this.onPointerLockChange(this.isPointerLocked);
      }
    });

    // Click to lock pointer
    document.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        document.body.requestPointerLock();
      }
    });
  }

  public setPointerLockCallback(callback: (locked: boolean) => void): void {
    this.onPointerLockChange = callback;
  }

  public getState(): InputState {
    const state: InputState = {
      forward: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      backward: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      left: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      right: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      jump: this.keys.has('Space'),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      mouseX: this.mouseMovement.x,
      mouseY: this.mouseMovement.y,
      leftClick: this.mouseButtons.left,
      rightClick: this.mouseButtons.right
    };

    // Reset mouse movement after reading
    this.mouseMovement.x = 0;
    this.mouseMovement.y = 0;

    return state;
  }

  public isKeyPressed(code: string): boolean {
    return this.keys.has(code);
  }

  public isLocked(): boolean {
    return this.isPointerLocked;
  }
}
