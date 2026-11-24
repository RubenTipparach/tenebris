import { AIR, ENVIRONMENT, ENVIRONMENT_CHIP, SUITS } from '../config/SurvivalConfig';
import { gameStorage } from '../engine/GameStorage';
import { emitGameEvent } from '../engine/GameEvents';
import { showToast } from '../utils/toast';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { AirState, EnvState, ExposureInput, HAZARDS, Hazard, airGauge, environmentExposure, isExposed, newAirState, newEnvState, tickAir, tickEnvironment } from './Survival';

/** What the HUD calls each hazard's gauge, and what the death screen says it did */
const HAZARD_TEXT: Record<Hazard, { chip: string; death: string }> = {
  heat: { chip: 'HEAT', death: 'The heat got you' },
  cold: { chip: 'COLD', death: 'You froze' },
  radiation: { chip: 'RADIATION', death: 'Radiation got you' },
};

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
  /** Which suit (older saves: the space suit) */
  item?: number;
}

export class AirSystem {
  private air: AirState = newAirState();
  private env: EnvState = newEnvState();
  // The suit worn (a SUITS item), or null
  private suit: ItemType | null = null;
  // What the last death was from: 'air' or a hazard
  private deathCause: 'air' | Hazard = 'air';
  private hazardChips = new Map<Hazard, { el: HTMLElement; fill: HTMLElement; label: HTMLElement }>();
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
      this.suit = saved.worn ? ((saved.item !== undefined && SUITS[saved.item as ItemType]) ? saved.item as ItemType : ItemType.SPACE_SUIT) : null;
      if (typeof saved.tankS === 'number' && saved.tankS > 0 && saved.tankS <= AIR.TANK_AIR_S) this.air.tankS = saved.tankS;
    }
  }

  // ---- the suit ----

  public isSuitWorn(): boolean {
    return this.suit !== null;
  }

  /** The suit worn, or null */
  public getSuitItem(): ItemType | null {
    return this.suit;
  }

  /** Called when the suit goes on or comes off (the avatar, the suit slot). */
  public onSuitChanged(listener: (worn: boolean) => void): void {
    this.suitListeners.push(listener);
  }

  /** Put on the suit in hand (any SUITS item): it leaves the inventory for the suit slot. */
  public wearSuitInHand(): boolean {
    const item = this.inventory.getSelectedItem().itemType;
    if (this.suit !== null || !SUITS[item]) return false;
    if (!this.inventory.useSelectedItem()) return false;
    this.setSuit(item);
    showToast(`${ITEM_DATA[item]?.name ?? 'Suit'} on`, { duration: 2000 });
    return true;
  }

  /** Take the suit off: back into the inventory, hotbar first. */
  public takeOffSuit(): boolean {
    if (this.suit === null) return false;
    if (this.inventory.addItem(this.suit, 1) > 0) {
      showToast('No room for the suit', { duration: 2000 });
      return false;
    }
    this.setSuit(null);
    return true;
  }

  private setSuit(suit: ItemType | null): void {
    this.suit = suit;
    this.save();
    this.onInventoryChanged();
    for (const l of this.suitListeners) l(suit !== null);
  }

  private save(): void {
    gameStorage.saveSuit({ worn: this.suit !== null, tankS: this.air.tankS, item: this.suit ?? undefined } satisfies SavedSuit);
    this.saveTimer = AIR.SAVE_EVERY_S;
  }

  // ---- breathing ----

  /** For tests and the console. */
  public getState(): Readonly<AirState> & { worn: boolean; dead: boolean; env: Readonly<EnvState> } {
    return { ...this.air, worn: this.suit !== null, dead: this.dead, env: { ...this.env } };
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
      suitWorn: this.suit !== null,
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
    // Heat, cold and radiation: their own gauges (body-environments)
    const hazards = environmentExposure(where, this.suit);
    const killedBy = tickEnvironment(this.env, dt, hazards);
    for (const h of HAZARDS) this.renderHazardChip(h, hazards[h] || this.env[h] < ENVIRONMENT.GAUGE_S);
    if (fx.died) { this.dead = true; this.deathCause = 'air'; }
    else if (killedBy) { this.dead = true; this.deathCause = killedBy; }
    return this.dead;
  }

  /**
   * The death screen for AIR.DEATH_SCREEN_S, then `respawn` runs and the
   * player breathes again.
   */
  public showDeath(respawn: () => void): void {
    this.renderChip(false, false);
    for (const h of HAZARDS) this.renderHazardChip(h, false);
    const panel = this.deathPanelEl();
    const title = panel.querySelector('h1');
    if (title) title.textContent = this.deathCause === 'air' ? 'You ran out of air' : HAZARD_TEXT[this.deathCause].death;
    panel.style.display = 'flex';
    window.setTimeout(() => {
      panel.style.display = 'none';
      try {
        respawn();
      } finally {
        this.air.breathS = AIR.BREATH_S;
        this.env = newEnvState();
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

  // A hazard's chip (HEAT / COLD / RADIATION): stacked above the AIR chip while it drains or refills
  private renderHazardChip(h: Hazard, show: boolean): void {
    let chip = this.hazardChips.get(h);
    if (!chip) {
      const el = document.createElement('div');
      el.className = `air-chip hazard-chip hazard-${h}`;
      el.style.bottom = `${ENVIRONMENT_CHIP.BOTTOM_PX + (HAZARDS.indexOf(h) + 1) * ENVIRONMENT_CHIP.STEP_PX}px`;
      const label = document.createElement('span');
      label.className = 'air-chip-label';
      const bar = document.createElement('div');
      bar.className = 'air-chip-bar';
      const fill = document.createElement('div');
      fill.className = 'air-chip-fill';
      bar.appendChild(fill);
      el.append(label, bar);
      document.body.appendChild(el);
      chip = { el, fill, label };
      this.hazardChips.set(h, chip);
    }
    if (!show) { chip.el.style.display = 'none'; return; }
    const fraction = this.env[h] / ENVIRONMENT.GAUGE_S;
    chip.label.textContent = `${HAZARD_TEXT[h].chip} ${Math.ceil(this.env[h])}s`;
    chip.fill.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
    chip.el.classList.toggle('low', fraction < ENVIRONMENT.LOW_FRACTION);
    chip.el.style.display = 'flex';
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
