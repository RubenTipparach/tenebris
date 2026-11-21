import { AIR } from '../config/SurvivalConfig';
import { gameStorage } from '../engine/GameStorage';
import { emitGameEvent } from '../engine/GameEvents';
import { showToast } from '../utils/toast';
import { Inventory, ItemType } from './Inventory';
import { AirState, ExposureInput, airGauge, isExposed, newAirState, tickAir } from './Survival';

/**
 * The player's air in play (openspec wool-air-and-reentry, design 4): the
 * worn space suit, the tank being drawn, the AIR chip and the death screen.
 * The rules are the pure src/player/Survival.ts; this applies them to the
 * inventory (an oxygen tank that runs out becomes an empty tank), saves the
 * suit per world, and draws the HUD. mainPlanet feeds it where the player is
 * each frame and respawns them when it reports a death.
 */

interface SavedSuit {
  worn: boolean;
  tankS: number;
}

export class AirSystem {
  private air: AirState = newAirState();
  private worn = false;
  private dead = false;
  private saveTimer = AIR.SAVE_EVERY_S;
  private tankAirBank = 0;  // tank seconds not yet sent as 'suited' events
  private chip: HTMLElement | null = null;
  private chipFill: HTMLElement | null = null;
  private chipLabel: HTMLElement | null = null;
  private deathPanel: HTMLElement | null = null;
  private suitListeners: ((worn: boolean) => void)[] = [];

  constructor(private inventory: Inventory, private onInventoryChanged: () => void) {
    const saved = gameStorage.getSuit<SavedSuit>();
    if (saved) {
      this.worn = !!saved.worn;
      if (typeof saved.tankS === 'number' && saved.tankS > 0 && saved.tankS <= AIR.TANK_AIR_S) this.air.tankS = saved.tankS;
    }
  }

  // ---- the suit ----

  public isSuitWorn(): boolean {
    return this.worn;
  }

  /** Called when the suit goes on or comes off (the avatar, the suit slot). */
  public onSuitChanged(listener: (worn: boolean) => void): void {
    this.suitListeners.push(listener);
  }

  /** Put on the space suit in hand: it leaves the inventory for the suit slot. */
  public wearSuitInHand(): boolean {
    if (this.worn || this.inventory.getSelectedItem().itemType !== ItemType.SPACE_SUIT) return false;
    if (!this.inventory.useSelectedItem()) return false;
    this.setWorn(true);
    showToast('Space suit on', { duration: 2000 });
    return true;
  }

  /** Take the suit off: back into the inventory, hotbar first. */
  public takeOffSuit(): boolean {
    if (!this.worn) return false;
    if (this.inventory.addItem(ItemType.SPACE_SUIT, 1) > 0) {
      showToast('No room for the suit', { duration: 2000 });
      return false;
    }
    this.setWorn(false);
    return true;
  }

  private setWorn(worn: boolean): void {
    this.worn = worn;
    this.save();
    this.onInventoryChanged();
    for (const l of this.suitListeners) l(worn);
  }

  private save(): void {
    gameStorage.saveSuit({ worn: this.worn, tankS: this.air.tankS } satisfies SavedSuit);
    this.saveTimer = AIR.SAVE_EVERY_S;
  }

  // ---- breathing ----

  /** For tests and the console. */
  public getState(): Readonly<AirState> & { worn: boolean; dead: boolean } {
    return { ...this.air, worn: this.worn, dead: this.dead };
  }

  /**
   * One frame. `where` is null while the player can't be judged (a teleport
   * in progress). Returns true on the frame the player runs out of air.
   */
  public update(dt: number, where: ExposureInput | null): boolean {
    if (this.dead || !where) return false;
    const exposed = isExposed(where);
    const fx = tickAir(this.air, dt, {
      exposed,
      suitWorn: this.worn,
      oxygenTanks: this.inventory.getItemCount(ItemType.OXYGEN_TANK),
    });
    if (fx.tanksEmptied > 0) {
      this.inventory.removeItem(ItemType.OXYGEN_TANK, fx.tanksEmptied);
      const left = this.inventory.addItem(ItemType.EMPTY_TANK, fx.tanksEmptied);
      if (left > 0) showToast('No room for the empty tank', { duration: 2000 });
      const more = this.inventory.getItemCount(ItemType.OXYGEN_TANK);
      showToast(more > 0 ? `Tank empty - ${more} left` : 'Last tank empty', { duration: 2500 });
      this.onInventoryChanged();
      this.save();
    }
    if (fx.onTank) {
      this.saveTimer -= dt;
      if (this.saveTimer <= 0) this.save();
    }
    // The 'suited' mission counts whole seconds of tank air
    this.tankAirBank += fx.tankAirS;
    if (this.tankAirBank >= 1) {
      const whole = Math.floor(this.tankAirBank);
      this.tankAirBank -= whole;
      emitGameEvent('suited', undefined, whole);
    }
    this.renderChip(exposed || fx.onTank, fx.onTank);
    if (fx.died) this.dead = true;
    return fx.died;
  }

  /**
   * The death screen for AIR.DEATH_SCREEN_S, then `respawn` runs and the
   * player breathes again.
   */
  public showDeath(respawn: () => void): void {
    this.renderChip(false, false);
    const panel = this.deathPanelEl();
    panel.style.display = 'flex';
    window.setTimeout(() => {
      panel.style.display = 'none';
      try {
        respawn();
      } finally {
        this.air.breathS = AIR.BREATH_S;
        this.dead = false;
      }
    }, AIR.DEATH_SCREEN_S * 1000);
  }

  // ---- HUD ----

  // The AIR chip: a bar over the hotbar, beside where "Well fed" sits
  private renderChip(show: boolean, onTank: boolean): void {
    if (!this.chip) {
      this.chip = document.createElement('div');
      this.chip.id = 'air-chip';
      this.chip.className = 'air-chip';
      this.chipLabel = document.createElement('span');
      this.chipLabel.className = 'air-chip-label';
      const bar = document.createElement('div');
      bar.className = 'air-chip-bar';
      this.chipFill = document.createElement('div');
      this.chipFill.className = 'air-chip-fill';
      bar.appendChild(this.chipFill);
      this.chip.append(this.chipLabel, bar);
      document.body.appendChild(this.chip);
    }
    if (!show) {
      this.chip.style.display = 'none';
      return;
    }
    const g = airGauge(this.air, onTank);
    const tanks = this.inventory.getItemCount(ItemType.OXYGEN_TANK);
    this.chipLabel!.textContent = onTank ? `AIR ${Math.ceil(g.seconds)}s  TANKS ${tanks}` : `AIR ${Math.ceil(g.seconds)}s  HOLD BREATH`;
    this.chipFill!.style.width = `${Math.max(0, Math.min(1, g.fraction)) * 100}%`;
    this.chip.classList.toggle('low', g.low);
    this.chip.style.display = 'flex';
  }

  private deathPanelEl(): HTMLElement {
    if (!this.deathPanel) {
      this.deathPanel = document.createElement('div');
      this.deathPanel.id = 'air-death';
      this.deathPanel.className = 'air-death';
      this.deathPanel.innerHTML = '<div class="air-death-panel"><h1>You ran out of air</h1><p>Back to the spawn on Earth - you keep your things.</p></div>';
      document.body.appendChild(this.deathPanel);
    }
    return this.deathPanel;
  }
}
