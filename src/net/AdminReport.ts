import { ADMIN_REPORT_CONFIG as C } from '../config/AdminReportConfig';
import { netSync } from './NetSync';

/**
 * What an online client tells the server for the admin portal (openspec
 * admin-monitor): a status frame - its items, suit, whether it rides a
 * rocket, its missions - and a map of the planet it stands on, drawn by the
 * game's own map renderer. Both go through NetSync (the one sync path); the
 * server keeps the status per player (server-js/status.js checks it) and
 * the maps per world + planet. Offline it does nothing.
 */

/** One slot as the inventory saves it (Inventory.exportForSave). */
export interface SlotIn { itemType: number; quantity: number; uses?: number }

export interface StatusIn {
  slots: SlotIn[];                                   // hotbar, bag, then toolbox
  suit: { worn: boolean; tankS: number } | null;
  riding: boolean;
  missions: { done: string[]; now: string | null; prog: number[] } | null;
}

/** The frame on the wire (server-js/status.js reads it). */
export interface StatusFrame {
  v: 1;
  inv: number[][];                                   // [slot, item, count, uses?], non-empty slots only
  suit: { worn: boolean; tankS: number } | null;
  ride: 'walk' | 'rocket';
  m: { done: string[]; now: string | null; prog: number[] };
}

export function encodeStatus(s: StatusIn): StatusFrame {
  const inv: number[][] = [];
  s.slots.forEach((slot, i) => {
    if (!slot || slot.quantity <= 0 || !slot.itemType) return;
    inv.push(slot.uses === undefined ? [i, slot.itemType, slot.quantity] : [i, slot.itemType, slot.quantity, Math.max(0, Math.round(slot.uses))]);
  });
  return {
    v: 1,
    inv,
    suit: s.suit ? { worn: s.suit.worn, tankS: Math.round(s.suit.tankS / C.TANK_STEP_S) * C.TANK_STEP_S } : null,
    ride: s.riding ? 'rocket' : 'walk',
    m: s.missions ? { done: [...s.missions.done], now: s.missions.now, prog: [...s.missions.prog] } : { done: [], now: null, prog: [] },
  };
}

export interface ReportSource {
  status(): StatusIn;
  /** The planet the player stands on, or null (in space, in a rocket). */
  planet(): string | null;
  /** That planet's map from the game's map renderer, scaled, or null. */
  mapImage(planet: string, width: number, height: number): Promise<HTMLCanvasElement | null>;
  /** Call `fn` on every block edit on a planet. */
  onEdit(planet: string, fn: () => void): void;
  planets(): Iterable<string>;
}

export class AdminReport {
  private joinedAs = 0;
  private lastSent = '';
  private statusTimer = 0;
  private mapTimer = 0;
  private uploading = false;
  private edits = new Map<string, number>();        // block edits per planet, this session
  private editsAtUpload = new Map<string, number>();

  constructor(private src: ReportSource) {
    for (const id of src.planets()) src.onEdit(id, () => this.edits.set(id, (this.edits.get(id) ?? 0) + 1));
  }

  update(dt: number): void {
    if (!netSync.online()) { this.joinedAs = 0; return; }
    // a (re)join: the server has nothing from this connection yet
    if (netSync.myId() !== this.joinedAs) {
      this.joinedAs = netSync.myId();
      this.lastSent = '';
      this.statusTimer = 0;
      this.mapTimer = 0;
    }
    this.statusTimer -= dt;
    if (this.statusTimer <= 0) {
      this.statusTimer = C.SUMMARY_CHECK_S;
      const frame = encodeStatus(this.src.status());
      const json = JSON.stringify(frame);
      if (json !== this.lastSent) {
        this.lastSent = json;
        netSync.live(C.STATUS_CHANNEL, frame);
      }
    }
    this.mapTimer -= dt;
    if (this.mapTimer <= 0 && !this.uploading) {
      this.mapTimer = C.MAP_CHECK_S;
      const planet = this.src.planet();
      if (planet && this.mapDue(planet)) void this.uploadMap(planet);
    }
  }

  private mapDue(planet: string): boolean {
    const madeAt = netSync.serverMaps()[planet];
    if (madeAt === undefined) return true;
    if (Date.now() - madeAt > C.MAP_REFRESH_MIN * 60_000) return true;
    return (this.edits.get(planet) ?? 0) - (this.editsAtUpload.get(planet) ?? 0) >= C.MAP_REFRESH_EDITS;
  }

  private async uploadMap(planet: string): Promise<void> {
    this.uploading = true;
    const edits = this.edits.get(planet) ?? 0;
    try {
      const canvas = await this.src.mapImage(planet, C.MAP_UPLOAD_WIDTH, C.MAP_UPLOAD_WIDTH / 2);
      const img = canvas && await new Promise<Blob | null>(res => canvas.toBlob(res, C.MAP_UPLOAD_TYPE, C.MAP_UPLOAD_QUALITY));
      if (img && await netSync.uploadMap(planet, img)) {
        this.editsAtUpload.set(planet, edits);
      } else {
        this.mapTimer = C.MAP_RETRY_S;
      }
    } catch (e) {
      console.warn('[MP] map upload failed', e);
      this.mapTimer = C.MAP_RETRY_S;
    } finally {
      this.uploading = false;
    }
  }
}
