/**
 * MenuManager - Centralized handler for menu open/close behavior
 *
 * Handles:
 * - Pointer lock management when menus open/close
 * - ESC key handling for closing menus
 * - X button close with pointer lock restore
 * - Preventing pause menu from showing when game UIs are open
 */

type MenuCloseHandler = () => void;

interface RegisteredMenu {
  isOpen: () => boolean;
  close: () => void;
}

class MenuManagerSingleton {
  private static instance: MenuManagerSingleton | null = null;
  private registeredMenus: Map<string, RegisteredMenu> = new Map();
  private pendingPointerLock = false;
  private initialized = false;

  private constructor() {}

  public static getInstance(): MenuManagerSingleton {
    if (!MenuManagerSingleton.instance) {
      MenuManagerSingleton.instance = new MenuManagerSingleton();
    }
    return MenuManagerSingleton.instance;
  }

  /**
   * Initialize the menu manager - call once at game startup
   */
  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Handle keyup for pointer lock restoration
    document.addEventListener('keyup', (e) => {
      if (this.pendingPointerLock && (e.key === 'e' || e.key === 'E' || e.key === 'Escape')) {
        this.pendingPointerLock = false;

        // Only re-lock if no menus are open
        if (!this.isAnyMenuOpen()) {
          this.requestPointerLock();
        }
      }
    });
  }

  /**
   * Register a menu with the manager
   */
  public registerMenu(id: string, menu: RegisteredMenu): void {
    this.registeredMenus.set(id, menu);
  }

  /**
   * Unregister a menu
   */
  public unregisterMenu(id: string): void {
    this.registeredMenus.delete(id);
  }

  /**
   * Check if any registered menu is currently open
   */
  public isAnyMenuOpen(): boolean {
    for (const menu of this.registeredMenus.values()) {
      if (menu.isOpen()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Request pointer lock on the game container
   */
  public requestPointerLock(): void {
    const container = document.getElementById('game-container');
    if (container) {
      container.requestPointerLock();
    }
  }

  /**
   * Call this when closing a menu via keyboard (ESC or E)
   * Sets up pointer lock to be restored on keyup
   */
  public schedulePointerLockOnKeyup(): void {
    this.pendingPointerLock = true;
  }

  /**
   * Call this when closing a menu via click (X button)
   * Immediately requests pointer lock since click is a valid user gesture
   */
  public restorePointerLockOnClick(): void {
    // Small delay to ensure menu is fully closed
    setTimeout(() => {
      if (!this.isAnyMenuOpen()) {
        this.requestPointerLock();
      }
    }, 0);
  }

  /**
   * Setup close button with pointer lock restoration
   */
  public setupCloseButton(buttonSelector: string, menuElement: HTMLElement | null, closeHandler: MenuCloseHandler): void {
    if (!menuElement) return;

    const closeBtn = menuElement.querySelector(buttonSelector);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeHandler();
        this.restorePointerLockOnClick();
      });
    }
  }

  /**
   * Open a menu - exits pointer lock
   */
  public openMenu(): void {
    document.exitPointerLock();
  }

  /**
   * Close a menu via keyboard - schedules pointer lock restore
   */
  public closeMenuViaKeyboard(): void {
    this.schedulePointerLockOnKeyup();
  }
}

// Export singleton instance
export const MenuManager = MenuManagerSingleton.getInstance();
