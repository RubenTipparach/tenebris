export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustPressed: boolean; // True only on the frame jump was pressed
  sprint: boolean;
  crouch: boolean;  // Ctrl - for descending/jetpack down
  rollLeft: boolean;  // Q - roll left in space
  rollRight: boolean; // E - roll right in space
  mouseX: number;
  mouseY: number;
  leftClick: boolean;
  rightClick: boolean;
}

// Mobile detection utility
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && /Macintosh/.test(navigator.userAgent)); // iPad detection
}

export class InputManager {
  private keys: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set(); // Keys pressed this frame
  private mouseMovement: { x: number; y: number } = { x: 0, y: 0 };
  private mouseButtons: { left: boolean; right: boolean } = { left: false, right: false };
  private mouseWheelDelta: number = 0; // Accumulated wheel delta
  private isPointerLocked: boolean = false;
  private onPointerLockChange?: (locked: boolean) => void;
  private onInventoryToggle?: () => void;
  private onPauseToggle?: () => void;

  // Mobile touch state
  public readonly isMobile: boolean;
  private mobileGameActive: boolean = false;
  private touchLookMovement: { x: number; y: number } = { x: 0, y: 0 };
  private touchMoveInput: { forward: boolean; backward: boolean; left: boolean; right: boolean } = {
    forward: false,
    backward: false,
    left: false,
    right: false
  };
  private touchJump: boolean = false;
  private touchJumpJustPressed: boolean = false;
  private touchCrouch: boolean = false;
  private touchLeftClick: boolean = false;
  private touchRightClick: boolean = false;

  // Touch tracking for joysticks
  private moveJoystickTouch: { id: number; startX: number; startY: number } | null = null;
  private lookJoystickTouch: { id: number; lastX: number; lastY: number } | null = null;

  // Continuous look joystick position (for applying rotation each frame)
  private lookJoystickPosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.isMobile = isMobileDevice();
    this.setupEventListeners();
    if (this.isMobile) {
      this.setupMobileControls();
    }
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.keysJustPressed.add(e.code); // Track newly pressed keys
      }
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

    // Mouse wheel
    document.addEventListener('wheel', (e) => {
      if (this.isPointerLocked) {
        this.mouseWheelDelta += e.deltaY;
      }
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

    // Click start button to lock pointer (desktop) or start game (mobile)
    const startButton = document.getElementById('start-button');
    if (startButton) {
      startButton.addEventListener('click', () => {
        if (this.isMobile) {
          this.startMobileGame();
        } else if (!this.isPointerLocked) {
          document.body.requestPointerLock();
        }
      });
    }
  }

  // Mobile game start - hides instructions and shows mobile controls
  private startMobileGame(): void {
    this.mobileGameActive = true;
    const instructions = document.getElementById('instructions');
    const crosshair = document.getElementById('crosshair');
    const mobileControls = document.getElementById('mobile-controls');

    if (instructions) instructions.style.display = 'none';
    if (crosshair) crosshair.style.display = 'block';
    if (mobileControls) mobileControls.style.display = 'block';

    // Request fullscreen on mobile
    this.requestFullscreen();

    // Trigger the pointer lock callback to notify the game
    if (this.onPointerLockChange) {
      this.onPointerLockChange(true);
    }
  }

  private requestFullscreen(): void {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    }
  }

  // Setup mobile controls UI and touch handlers
  private setupMobileControls(): void {
    // Create mobile controls container
    const mobileControls = document.createElement('div');
    mobileControls.id = 'mobile-controls';
    mobileControls.innerHTML = `
      <!-- Top corner buttons -->
      <button id="btn-pause" class="action-btn pause top-left">| |</button>
      <button id="btn-inventory" class="action-btn inventory top-right">INV</button>

      <!-- Left side controls -->
      <div id="left-controls">
        <!-- Left action buttons: Break/Place -->
        <div id="left-buttons">
          <button id="btn-break" class="action-btn attack">BREAK</button>
          <button id="btn-place" class="action-btn">PLACE</button>
        </div>
        <!-- Left joystick for movement (WASD) -->
        <div id="move-joystick" class="joystick-container">
          <div class="joystick-base">
            <div class="joystick-thumb"></div>
          </div>
        </div>
      </div>

      <!-- Right side controls -->
      <div id="right-controls">
        <!-- Right action buttons: Jump/Down -->
        <div id="right-buttons">
          <button id="btn-jump" class="action-btn">JUMP</button>
          <button id="btn-crouch" class="action-btn">DOWN</button>
        </div>
        <!-- Right joystick for looking around -->
        <div id="look-joystick" class="joystick-container">
          <div class="joystick-base">
            <div class="joystick-thumb"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(mobileControls);

    // Hide desktop-specific instructions on mobile
    const instructionsContent = document.getElementById('instructions');
    if (instructionsContent) {
      // Update instructions for mobile
      const paragraphs = instructionsContent.querySelectorAll('p');
      paragraphs.forEach(p => p.style.display = 'none');

      const mobileInstructions = document.createElement('p');
      mobileInstructions.innerHTML = 'Touch controls enabled<br>Left joystick: Move<br>Right side: Look around<br>Buttons: Jump, Descend, Break, Place';
      mobileInstructions.style.fontSize = '12px';
      instructionsContent.querySelector('h1')?.after(mobileInstructions);
    }

    this.setupMobileTouchHandlers();
  }

  private setupMobileTouchHandlers(): void {
    const moveJoystick = document.getElementById('move-joystick');
    const lookJoystick = document.getElementById('look-joystick');
    const btnJump = document.getElementById('btn-jump');
    const btnCrouch = document.getElementById('btn-crouch');
    const btnBreak = document.getElementById('btn-break');
    const btnPlace = document.getElementById('btn-place');

    // Move joystick handling
    if (moveJoystick) {
      const joystickBase = moveJoystick.querySelector('.joystick-base') as HTMLElement;
      const joystickThumb = moveJoystick.querySelector('.joystick-thumb') as HTMLElement;
      const maxDistance = 35;

      const updateMoveJoystick = (touch: Touch) => {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const clampedDistance = Math.min(distance, maxDistance);
        const angle = Math.atan2(dy, dx);

        const thumbX = Math.cos(angle) * clampedDistance;
        const thumbY = Math.sin(angle) * clampedDistance;
        joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

        // Convert to movement input (normalized -1 to 1)
        const normalizedX = thumbX / maxDistance;
        const normalizedY = thumbY / maxDistance;
        const deadzone = 0.2;

        this.touchMoveInput.forward = normalizedY < -deadzone;
        this.touchMoveInput.backward = normalizedY > deadzone;
        this.touchMoveInput.left = normalizedX < -deadzone;
        this.touchMoveInput.right = normalizedX > deadzone;
      };

      moveJoystick.addEventListener('touchstart', (e: TouchEvent) => {
        e.preventDefault();
        // Find the touch that started on this element
        const touch = e.changedTouches[0];
        this.moveJoystickTouch = { id: touch.identifier, startX: 0, startY: 0 };
        updateMoveJoystick(touch);
      }, { passive: false });

      moveJoystick.addEventListener('touchmove', (e: TouchEvent) => {
        e.preventDefault();
        if (!this.moveJoystickTouch) return;

        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (touch.identifier === this.moveJoystickTouch.id) {
            updateMoveJoystick(touch);
            break;
          }
        }
      }, { passive: false });

      const resetMoveJoystick = (e: TouchEvent) => {
        // Only reset if our tracked touch ended
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (this.moveJoystickTouch && e.changedTouches[i].identifier === this.moveJoystickTouch.id) {
            this.moveJoystickTouch = null;
            joystickThumb.style.transform = 'translate(0, 0)';
            this.touchMoveInput = { forward: false, backward: false, left: false, right: false };
            break;
          }
        }
      };

      moveJoystick.addEventListener('touchend', resetMoveJoystick);
      moveJoystick.addEventListener('touchcancel', resetMoveJoystick);
    }

    // Look joystick handling (right side) - same pattern as move joystick
    if (lookJoystick) {
      const joystickBase = lookJoystick.querySelector('.joystick-base') as HTMLElement;
      const joystickThumb = lookJoystick.querySelector('.joystick-thumb') as HTMLElement;
      const maxDistance = 35;

      const updateLookJoystick = (touch: Touch) => {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const clampedDistance = Math.min(distance, maxDistance);
        const angle = Math.atan2(dy, dx);

        const thumbX = Math.cos(angle) * clampedDistance;
        const thumbY = Math.sin(angle) * clampedDistance;
        joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

        // Store normalized joystick position for continuous rotation
        const normalizedX = thumbX / maxDistance;
        const normalizedY = thumbY / maxDistance;
        const deadzone = 0.15;

        if (Math.abs(normalizedX) > deadzone || Math.abs(normalizedY) > deadzone) {
          this.lookJoystickPosition.x = normalizedX;
          this.lookJoystickPosition.y = normalizedY;
        } else {
          this.lookJoystickPosition.x = 0;
          this.lookJoystickPosition.y = 0;
        }
      };

      lookJoystick.addEventListener('touchstart', (e: TouchEvent) => {
        e.preventDefault();
        // Use changedTouches to get the new touch that triggered this event
        const touch = e.changedTouches[0];
        this.lookJoystickTouch = { id: touch.identifier, lastX: 0, lastY: 0 };
        // Don't update position on start - wait for movement to avoid snap
      }, { passive: false });

      lookJoystick.addEventListener('touchmove', (e: TouchEvent) => {
        e.preventDefault();
        if (!this.lookJoystickTouch) return;

        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          if (touch.identifier === this.lookJoystickTouch.id) {
            updateLookJoystick(touch);
            break;
          }
        }
      }, { passive: false });

      const resetLookJoystick = (e: TouchEvent) => {
        // Only reset if our tracked touch ended
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (this.lookJoystickTouch && e.changedTouches[i].identifier === this.lookJoystickTouch.id) {
            this.lookJoystickTouch = null;
            this.lookJoystickPosition = { x: 0, y: 0 };
            joystickThumb.style.transform = 'translate(0, 0)';
            break;
          }
        }
      };

      lookJoystick.addEventListener('touchend', resetLookJoystick);
      lookJoystick.addEventListener('touchcancel', resetLookJoystick);
    }

    // Action buttons
    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!this.touchJump) {
          this.touchJumpJustPressed = true;
        }
        this.touchJump = true;
      }, { passive: false });
      btnJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.touchJump = false;
      }, { passive: false });
    }

    if (btnCrouch) {
      btnCrouch.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.touchCrouch = true;
      }, { passive: false });
      btnCrouch.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.touchCrouch = false;
      }, { passive: false });
    }

    if (btnBreak) {
      btnBreak.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.touchLeftClick = true;
      }, { passive: false });
      btnBreak.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.touchLeftClick = false;
      }, { passive: false });
    }

    if (btnPlace) {
      btnPlace.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.touchRightClick = true;
      }, { passive: false });
      btnPlace.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.touchRightClick = false;
      }, { passive: false });
    }

    // Inventory button
    const btnInventory = document.getElementById('btn-inventory');
    if (btnInventory) {
      btnInventory.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.onInventoryToggle) {
          this.onInventoryToggle();
        }
      }, { passive: false });
    }

    // Pause button
    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
      btnPause.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.onPauseToggle) {
          this.onPauseToggle();
        }
      }, { passive: false });
    }
  }

  public setPointerLockCallback(callback: (locked: boolean) => void): void {
    this.onPointerLockChange = callback;
  }

  public setInventoryToggleCallback(callback: () => void): void {
    this.onInventoryToggle = callback;
  }

  public setPauseToggleCallback(callback: () => void): void {
    this.onPauseToggle = callback;
  }

  public getState(): InputState {
    const state: InputState = {
      forward: this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.touchMoveInput.forward,
      backward: this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.touchMoveInput.backward,
      left: this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.touchMoveInput.left,
      right: this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.touchMoveInput.right,
      jump: this.keys.has('Space') || this.touchJump,
      jumpJustPressed: this.keysJustPressed.has('Space') || this.touchJumpJustPressed,
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      crouch: this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.touchCrouch,
      rollLeft: this.keys.has('KeyQ'),
      rollRight: this.keys.has('KeyE'),
      mouseX: this.mouseMovement.x + this.touchLookMovement.x + this.lookJoystickPosition.x * 5,
      mouseY: this.mouseMovement.y + this.touchLookMovement.y + this.lookJoystickPosition.y * 5,
      leftClick: this.mouseButtons.left || this.touchLeftClick,
      rightClick: this.mouseButtons.right || this.touchRightClick
    };

    // Reset mouse movement and just-pressed keys after reading
    this.mouseMovement.x = 0;
    this.mouseMovement.y = 0;
    this.touchLookMovement.x = 0;
    this.touchLookMovement.y = 0;
    this.keysJustPressed.clear();
    this.touchJumpJustPressed = false;

    return state;
  }

  public isKeyPressed(code: string): boolean {
    return this.keys.has(code);
  }

  public isLocked(): boolean {
    return this.isPointerLocked || this.mobileGameActive;
  }

  // Get mouse wheel delta and reset it
  public getWheelDelta(): number {
    const delta = this.mouseWheelDelta;
    this.mouseWheelDelta = 0;
    return delta;
  }
}
