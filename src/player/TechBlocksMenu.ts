/**
 * TechBlocksMenu - F2 modal menu for viewing and managing all tech blocks
 *
 * Shows all placed tech blocks (furnaces, steam engines, hydro generators, storage chests)
 * with their real-time status. Click on any block to open its UI.
 */

import { BaseModalMenu } from './BaseModalMenu';
import { TechBlockRegistry, TechBlockInfo } from '../engine/TechBlockRegistry';

export class TechBlocksMenu extends BaseModalMenu {
  private updateInterval: number | null = null;
  private readonly UPDATE_INTERVAL_MS = 200; // Update every 200ms

  constructor() {
    super({
      id: 'tech-blocks-menu',
      title: 'Tech Blocks',
      closeOnE: true
    });

    this.addCustomStyles();
  }

  private addCustomStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #tech-blocks-menu .modal-menu-panel {
        min-width: 400px;
        border-color: #4f8;
      }

      #tech-blocks-menu .modal-menu-title {
        color: #4f8;
      }

      .tech-blocks-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .tech-block-type-group {
        margin-bottom: 10px;
      }

      .tech-block-type-header {
        color: #4f8;
        font-size: 14px;
        font-weight: bold;
        padding: 6px 10px;
        background: rgba(79, 255, 136, 0.1);
        border-radius: 4px;
        margin-bottom: 6px;
      }

      .tech-block-entry {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        border: 1px solid transparent;
      }

      .tech-block-entry:hover {
        background: rgba(79, 255, 136, 0.15);
        border-color: #4f8;
      }

      .tech-block-entry-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .tech-block-entry-tile {
        color: #aaa;
        font-size: 12px;
      }

      .tech-block-entry-type {
        color: #fff;
        font-size: 13px;
      }

      .tech-block-entry-status {
        font-size: 12px;
        padding: 3px 8px;
        border-radius: 3px;
        font-weight: bold;
      }

      .tech-block-entry-status.active {
        color: #4f4;
        background: rgba(68, 255, 68, 0.15);
      }

      .tech-block-entry-status.idle {
        color: #888;
        background: rgba(136, 136, 136, 0.15);
      }

      .tech-block-entry-status.warning {
        color: #f84;
        background: rgba(255, 136, 68, 0.15);
      }

      .tech-blocks-empty {
        text-align: center;
        color: #666;
        padding: 30px;
        font-style: italic;
      }

      .tech-blocks-summary {
        display: flex;
        justify-content: center;
        gap: 20px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        margin-bottom: 15px;
      }

      .tech-blocks-summary-item {
        text-align: center;
      }

      .tech-blocks-summary-count {
        font-size: 20px;
        font-weight: bold;
        color: #4f8;
      }

      .tech-blocks-summary-label {
        font-size: 10px;
        color: #888;
        text-transform: uppercase;
      }
    `;
    document.head.appendChild(style);
  }

  protected onOpen(): void {
    this.updateContent();
    // Start periodic updates
    this.updateInterval = window.setInterval(() => {
      if (this.isMenuOpen) {
        this.updateContent();
      }
    }, this.UPDATE_INTERVAL_MS);
  }

  protected onClose(): void {
    // Stop periodic updates
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public updateContent(): void {
    const content = this.getContentElement();
    if (!content) return;

    const blocks = TechBlockRegistry.getAllBlocks();

    if (blocks.length === 0) {
      content.innerHTML = `
        <div class="tech-blocks-empty">
          No tech blocks placed yet.<br>
          Build furnaces, steam engines, hydro generators, storage chests, or copper pipes!
        </div>
      `;
      return;
    }

    // Group blocks by type
    const blocksByType = new Map<string, TechBlockInfo[]>();
    for (const block of blocks) {
      const existing = blocksByType.get(block.type) || [];
      existing.push(block);
      blocksByType.set(block.type, existing);
    }

    // Count summary
    const summaryHtml = this.renderSummary(blocksByType);

    // Render blocks by type
    let blocksHtml = '<div class="tech-blocks-list">';
    for (const [type, typeBlocks] of blocksByType) {
      blocksHtml += this.renderTypeGroup(type, typeBlocks);
    }
    blocksHtml += '</div>';

    content.innerHTML = summaryHtml + blocksHtml;

    // Attach click handlers
    this.attachClickHandlers(content, blocks);
  }

  private renderSummary(blocksByType: Map<string, TechBlockInfo[]>): string {
    const types = ['Furnace', 'Steam Engine', 'Hydro Generator', 'Storage Chest', 'Copper Pipe'];
    let html = '<div class="tech-blocks-summary">';

    for (const type of types) {
      const count = blocksByType.get(type)?.length || 0;
      const shortName = type.split(' ')[0]; // First word only
      html += `
        <div class="tech-blocks-summary-item">
          <div class="tech-blocks-summary-count">${count}</div>
          <div class="tech-blocks-summary-label">${shortName}${count !== 1 ? 's' : ''}</div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  private renderTypeGroup(type: string, blocks: TechBlockInfo[]): string {
    let html = `
      <div class="tech-block-type-group">
        <div class="tech-block-type-header">${type} (${blocks.length})</div>
    `;

    for (const block of blocks) {
      const status = block.getStatus();
      const statusClass = this.getStatusClass(status);

      html += `
        <div class="tech-block-entry" data-block-id="${block.id}">
          <div class="tech-block-entry-info">
            <span class="tech-block-entry-tile">Tile ${block.tileIndex}</span>
          </div>
          <span class="tech-block-entry-status ${statusClass}">${status}</span>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  private getStatusClass(status: string): string {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('running') || lowerStatus.includes('active') || lowerStatus.includes('smelting')) {
      return 'active';
    } else if (lowerStatus.includes('no fuel') || lowerStatus.includes('no water')) {
      return 'warning';
    }
    return 'idle';
  }

  private attachClickHandlers(content: HTMLElement, blocks: TechBlockInfo[]): void {
    const entries = content.querySelectorAll('.tech-block-entry');
    entries.forEach((entry) => {
      entry.addEventListener('click', () => {
        const blockId = entry.getAttribute('data-block-id');
        if (blockId) {
          const block = blocks.find(b => b.id === blockId);
          if (block) {
            // Close this menu first
            this.close();
            // Then open the block's UI
            block.openUI();
          }
        }
      });
    });
  }
}

// Singleton instance
let techBlocksMenuInstance: TechBlocksMenu | null = null;

export function getTechBlocksMenu(): TechBlocksMenu {
  if (!techBlocksMenuInstance) {
    techBlocksMenuInstance = new TechBlocksMenu();
  }
  return techBlocksMenuInstance;
}
