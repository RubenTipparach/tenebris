/**
 * BaseModalMenu - Base class for modal menus that overlay the game
 *
 * Features:
 * - ESC or E key to close
 * - X button to close
 * - Proper pointer lock management
 * - Automatic registration with MenuManager
 * - Game continues running while menu is open
 */

import { MenuManager } from './MenuManager';

export interface ModalMenuConfig {
  id: string;
  title: string;
  closeOnE?: boolean; // Whether E key also closes the menu (default: true)
}

export abstract class BaseModalMenu {
  protected menuElement: HTMLElement | null = null;
  protected contentElement: HTMLElement | null = null;
  protected isMenuOpen: boolean = false;
  protected config: ModalMenuConfig;
  protected onCloseCallback: (() => void) | null = null;

  constructor(config: ModalMenuConfig) {
    this.config = {
      closeOnE: true,
      ...config
    };
    this.createBaseUI();
    this.setupKeyboardHandler();
    this.registerWithMenuManager();
  }

  /**
   * Create the base modal UI structure
   */
  private createBaseUI(): void {
    this.menuElement = document.createElement('div');
    this.menuElement.id = this.config.id;
    this.menuElement.className = 'modal-menu';
    this.menuElement.innerHTML = `
      <div class="modal-menu-panel">
        <button class="modal-menu-close">&times;</button>
        <h2 class="modal-menu-title">${this.config.title}</h2>
        <div class="modal-menu-content"></div>
        <p class="modal-menu-hint">Press ${this.config.closeOnE ? 'E or ' : ''}ESC to close</p>
      </div>
    `;

    this.menuElement.style.display = 'none';
    document.body.appendChild(this.menuElement);

    // Get content container
    this.contentElement = this.menuElement.querySelector('.modal-menu-content');

    // Setup close button
    const closeBtn = this.menuElement.querySelector('.modal-menu-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
        MenuManager.restorePointerLockOnClick();
      });
    }

    // Add base styles if not already added
    this.addBaseStyles();
  }

  /**
   * Add base CSS styles for modal menus
   */
  private addBaseStyles(): void {
    if (document.getElementById('modal-menu-base-styles')) return;

    const style = document.createElement('style');
    style.id = 'modal-menu-base-styles';
    style.textContent = `
      .modal-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
      }

      .modal-menu-panel {
        position: relative;
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid #555;
        border-radius: 8px;
        padding: 20px;
        min-width: 300px;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        color: #fff;
        font-family: 'Courier New', monospace;
      }

      .modal-menu-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        color: #888;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        transition: color 0.2s;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-menu-close:hover {
        color: #fff;
      }

      .modal-menu-title {
        margin: 0 0 15px 0;
        padding-right: 30px;
        text-align: center;
        color: #4f8;
        font-size: 18px;
        border-bottom: 1px solid #444;
        padding-bottom: 10px;
      }

      .modal-menu-content {
        margin-bottom: 15px;
      }

      .modal-menu-hint {
        text-align: center;
        color: #666;
        font-size: 11px;
        margin: 15px 0 0 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup keyboard handler for ESC/E to close
   */
  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.isMenuOpen) return;

      const key = event.key.toLowerCase();
      if (key === 'escape' || (this.config.closeOnE && key === 'e')) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
        MenuManager.closeMenuViaKeyboard();
      }
    });
  }

  /**
   * Register this menu with MenuManager
   */
  private registerWithMenuManager(): void {
    MenuManager.registerMenu(this.config.id, {
      isOpen: () => this.isMenuOpen,
      close: () => this.close()
    });
  }

  /**
   * Open the menu
   */
  public open(): void {
    if (this.isMenuOpen) return;

    this.isMenuOpen = true;
    if (this.menuElement) {
      this.menuElement.style.display = 'flex';
    }
    MenuManager.openMenu();
    this.onOpen();
  }

  /**
   * Close the menu
   */
  public close(): void {
    if (!this.isMenuOpen) return;

    this.isMenuOpen = false;
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
    }
    this.onClose();

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  /**
   * Toggle the menu open/closed
   */
  public toggle(): void {
    if (this.isMenuOpen) {
      this.close();
      MenuManager.closeMenuViaKeyboard();
    } else {
      this.open();
    }
  }

  /**
   * Check if menu is open
   */
  public isOpen(): boolean {
    return this.isMenuOpen;
  }

  /**
   * Set callback for when menu closes
   */
  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  /**
   * Get the content container element
   */
  protected getContentElement(): HTMLElement | null {
    return this.contentElement;
  }

  /**
   * Get the menu element
   */
  protected getMenuElement(): HTMLElement | null {
    return this.menuElement;
  }

  /**
   * Override to perform actions when menu opens
   */
  protected onOpen(): void {}

  /**
   * Override to perform actions when menu closes
   */
  protected onClose(): void {}

  /**
   * Override to update the menu content
   */
  public abstract updateContent(): void;
}
