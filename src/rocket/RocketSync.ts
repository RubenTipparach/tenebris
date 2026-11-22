import * as THREE from 'three';
import { netSync } from '../net/NetSync';
import { RocketPart } from '../planet/RocketPart';
import { ITEM_DATA, InventorySlot, ItemType } from '../player/Inventory';
import { RocketExhaust } from './RocketExhaust';
import { RocketFlightManager } from './RocketFlightManager';
import { LandedRocket, LandedRocketManager } from './LandedRocket';

/**
 * Other players' rockets, over NetSync.
 *
 * - In flight: the pilot sends a live 'ship' frame (pose, parts, exhaust) at
 *   SHIP_HZ; everyone else draws that rocket at the interpolated pose, built
 *   from the same part models the launch pad uses. A final { gone: true }
 *   frame (or SHIP_TIMEOUT_S of silence, e.g. the pilot left) removes it.
 * - Landed: a rocket left standing somewhere is world state - a
 *   'landedRocket' record (pose, parts, fuel, cargo) keyed by its netKey.
 *   Every client's LandedRocketManager holds it, so anyone can walk up,
 *   open its cargo and board it; boarding removes the record (null) for
 *   everyone. Remote records go through the same createLandedRocket /
 *   removeLandedRocket as a local landing - one code path.
 *
 * Poses are main-scene world coordinates, the same frame the avatar poses
 * use (the floating origin only rebases the far layer).
 */

const SHIP_HZ = 10;
const SHIP_TIMEOUT_S = 3;
const SHIP_SMOOTHING = 12;           // follow rate toward the reported pose (1/s)
const LANDED_CHECK_S = 1;            // how often fuel / cargo changes are looked for
const EXHAUST_DROP = 0.5;            // exhaust point below an engine's centre (as RocketController)

/** A part on the wire: [itemType, local x, y, z, scale x, y, z] in the rocket's pivot */
type WirePart = [number, number, number, number, number, number, number];

type PartAssets = { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial };
type AssetLoader = (itemType: ItemType) => Promise<PartAssets | null>;

const r3 = (v: number): number => Math.round(v * 1000) / 1000;

export function partsToWire(parts: RocketPart[]): WirePart[] {
  return parts.map(p => {
    const m = p.mesh;
    return [p.itemType, r3(m.position.x), r3(m.position.y), r3(m.position.z), r3(m.scale.x), r3(m.scale.y), r3(m.scale.z)];
  });
}

const isWire = (v: unknown): v is WirePart[] =>
  Array.isArray(v) && v.length <= 32 && v.every(p => Array.isArray(p) && p.length === 7 && p.every(n => typeof n === 'number' && Number.isFinite(n)));

const isVec = (v: unknown, n: number): v is number[] =>
  Array.isArray(v) && v.length === n && v.every(x => typeof x === 'number' && Number.isFinite(x));

interface RemoteShip {
  pivot: THREE.Group;
  parts: RocketPart[];
  sig: string;
  target: THREE.Vector3;
  targetQ: THREE.Quaternion;
  exhaust: RocketExhaust;
  burning: boolean;
  throttle: number;
  lastHeard: number;
  building: boolean;
}

export class RocketSync {
  private ships = new Map<number, RemoteShip>();
  private shipTimer = 0;
  private wasFlying = false;
  private landedTimer = 0;
  // netKey -> the record last sent or received, so changes republish once
  // and a remote apply is not echoed back
  private landedSig = new Map<string, string>();
  // netKeys being built from a remote record: their createLandedRocket is not published
  private applying = new Set<string>();
  private clock = 0;

  constructor(
    private scene: THREE.Scene,
    private flight: RocketFlightManager,
    private loadAssets: AssetLoader,
    private planetIdAt: (position: THREE.Vector3) => string,
  ) {
    const landed = flight.getLandedRocketManager();
    landed.setListener({
      created: (rocket) => {
        if (this.applying.has(rocket.netKey)) return;
        this.publishLanded(rocket);
      },
      removed: (rocket) => {
        this.landedSig.delete(rocket.netKey);
        if (this.applying.has(rocket.netKey)) return;
        netSync.record('landedRocket', this.planetIdAt(rocket.position), rocket.netKey, null);
      },
    });
    netSync.onLive('ship', (id, data) => this.onShip(id, data));
    netSync.onRecord('landedRocket', (planet, key, data) => this.onLanded(landed, planet, key, data));
  }

  public update(dt: number): void {
    this.clock += dt;
    this.sendShip(dt);
    this.updateShips(dt);
    this.landedTimer -= dt;
    if (this.landedTimer <= 0) {
      this.landedTimer = LANDED_CHECK_S;
      // Fuel, cargo or charge changed (refuelled, cargo moved, battery swapped): republish
      for (const rocket of this.flight.getLandedRocketManager().getAllLandedRockets()) {
        if (this.landedSig.has(rocket.netKey) && this.landedSig.get(rocket.netKey) !== this.landedState(rocket)) {
          this.publishLanded(rocket);
        }
      }
    }
  }

  // ---- in flight ------------------------------------------------------

  private sendShip(dt: number): void {
    const rocket = this.flight.isInFlight() ? this.flight.getRocketController() : null;
    if (!rocket) {
      if (this.wasFlying) netSync.live('ship', { gone: true });
      this.wasFlying = false;
      return;
    }
    this.wasFlying = true;
    this.shipTimer -= dt;
    if (this.shipTimer > 0) return;
    this.shipTimer = 1 / SHIP_HZ;
    const p = rocket.getPosition(), q = rocket.getOrientation();
    netSync.live('ship', {
      p: [p.x, p.y, p.z],
      q: [q.x, q.y, q.z, q.w],
      parts: partsToWire(rocket.getParts()),
      on: rocket.isExhaustActive(),
      th: r3(rocket.getThrottle()),
    });
  }

  private onShip(id: number, data: any): void {
    if (!data || data.gone) {
      this.dropShip(id);
      return;
    }
    if (!isVec(data.p, 3) || !isVec(data.q, 4) || !isWire(data.parts)) return;
    let ship = this.ships.get(id);
    const sig = JSON.stringify(data.parts);
    if (ship && ship.sig !== sig && !ship.building) {
      // restacked (a stage dropped, say): rebuild
      this.dropShip(id);
      ship = undefined;
    }
    if (!ship) {
      ship = {
        pivot: new THREE.Group(),
        parts: [],
        sig,
        target: new THREE.Vector3().fromArray(data.p),
        targetQ: new THREE.Quaternion().fromArray(data.q).normalize(),
        exhaust: new RocketExhaust(this.scene),
        burning: false,
        throttle: 0,
        lastHeard: this.clock,
        building: true,
      };
      ship.pivot.position.copy(ship.target);
      ship.pivot.quaternion.copy(ship.targetQ);
      this.ships.set(id, ship);
      this.scene.add(ship.pivot);
      const s = ship;
      this.buildParts(data.parts, s.pivot).then(parts => {
        s.parts = parts;
        s.building = false;
        if (this.ships.get(id) !== s) {
          parts.forEach(p => p.dispose());
          return;
        }
        s.exhaust.initialize(s.pivot, engineOffsets(parts));
      });
    }
    ship.target.fromArray(data.p);
    ship.targetQ.fromArray(data.q).normalize();
    ship.burning = data.on === true;
    ship.throttle = typeof data.th === 'number' ? data.th : 1;
    ship.lastHeard = this.clock;
  }

  private updateShips(dt: number): void {
    const k = Math.min(1, dt * SHIP_SMOOTHING);
    for (const [id, ship] of this.ships) {
      if (this.clock - ship.lastHeard > SHIP_TIMEOUT_S) {
        this.dropShip(id);
        continue;
      }
      ship.pivot.position.lerp(ship.target, k);
      ship.pivot.quaternion.slerp(ship.targetQ, k);
      if (!ship.building) {
        ship.exhaust.setActive(ship.burning);
        ship.exhaust.setThrottle(ship.throttle);
        ship.exhaust.update(dt);
      }
    }
  }

  private dropShip(id: number): void {
    const ship = this.ships.get(id);
    if (!ship) return;
    this.ships.delete(id);
    this.scene.remove(ship.pivot);
    ship.exhaust.dispose();
    ship.parts.forEach(p => p.dispose());
  }

  /** Rocket parts from the wire, attached to `pivot` the way a flying rocket holds them */
  private async buildParts(wire: WirePart[], pivot: THREE.Group): Promise<RocketPart[]> {
    const parts: RocketPart[] = [];
    for (const [itemType, x, y, z, sx, sy, sz] of wire) {
      const info = ITEM_DATA[itemType as ItemType]?.rocketPart;
      if (!info) continue;
      const assets = await this.loadAssets(itemType as ItemType);
      if (!assets) continue;
      const material = assets.material.clone();
      if (material.uniforms.sunBrightness) material.uniforms.sunBrightness.value = 1;
      const group = new THREE.Group();
      group.add(new THREE.Mesh(assets.geometry, material));
      group.position.set(x, y, z);
      group.scale.set(sx, sy, sz);
      pivot.add(group);
      parts.push(new RocketPart(itemType as ItemType, info.partType, group, material, parts.length));
    }
    return parts;
  }

  // ---- landed ---------------------------------------------------------

  private landedState(rocket: LandedRocket): string {
    return JSON.stringify([r3(rocket.fuelPercent), (rocket.cargo ?? []).map(s => [s.itemType, s.quantity]), rocket.engineMode ?? null,
      rocket.chargeWh === undefined ? null : Math.round(rocket.chargeWh), !!rocket.chuteSpent]);
  }

  private publishLanded(rocket: LandedRocket): void {
    if (!netSync.online()) return;
    const p = rocket.position, q = rocket.orientation, n = rocket.groundNormal;
    this.landedSig.set(rocket.netKey, this.landedState(rocket));
    netSync.record('landedRocket', this.planetIdAt(p), rocket.netKey, {
      p: [p.x, p.y, p.z],
      q: [q.x, q.y, q.z, q.w],
      n: [n.x, n.y, n.z],
      parts: partsToWire(rocket.parts),
      fuel: r3(rocket.fuelPercent),
      cargo: rocket.cargo ? rocket.cargo.map(s => [s.itemType, s.quantity]) : null,
      mode: rocket.engineMode ?? null,
      wh: rocket.chargeWh === undefined ? null : Math.round(rocket.chargeWh),  // battery charge (null = full)
      cs: !!rocket.chuteSpent,                                                  // parachute spent
    });
  }

  private onLanded(manager: LandedRocketManager, _planet: string, key: string, data: any): void {
    const existing = manager.getByNetKey(key);
    if (data === null) {
      if (!existing) return;
      this.applying.add(key);
      try {
        manager.destroyLandedRocket(existing.id);
      } finally {
        this.applying.delete(key);
      }
      return;
    }
    if (!isVec(data.p, 3) || !isVec(data.q, 4) || !isVec(data.n, 3) || !isWire(data.parts)) return;
    const fuel = typeof data.fuel === 'number' ? Math.max(0, Math.min(100, data.fuel)) : 100;
    const cargo = toCargo(data.cargo);
    const chargeWh = typeof data.wh === 'number' && Number.isFinite(data.wh) ? Math.max(0, data.wh) : null;
    const chuteSpent = data.cs === true;
    if (existing) {
      // Same rocket, new fuel / cargo: update in place (the hold may be a
      // pad's shared array, so fill it rather than replace it)
      existing.fuelPercent = fuel;
      existing.chargeWh = chargeWh ?? undefined;
      existing.chuteSpent = chuteSpent;
      existing.engineMode = typeof data.mode === 'number' ? data.mode : null;
      if (existing.cargo && cargo) {
        for (let i = 0; i < existing.cargo.length; i++) {
          existing.cargo[i] = cargo[i] ?? { itemType: ItemType.NONE, quantity: 0 };
        }
      }
      this.landedSig.set(key, this.landedState(existing));
      return;
    }
    if (this.applying.has(key)) return;   // already being built
    this.applying.add(key);
    const pivot = new THREE.Group();
    pivot.position.fromArray(data.p);
    pivot.quaternion.fromArray(data.q).normalize();
    this.buildParts(data.parts, pivot).then(parts => {
      try {
        if (manager.getByNetKey(key) || parts.length === 0) {
          parts.forEach(p => p.dispose());
          return;
        }
        const rocket = manager.createLandedRocket(
          pivot, parts, pivot.position, pivot.quaternion,
          new THREE.Vector3().fromArray(data.n), fuel, cargo, null, key, chargeWh, chuteSpent,
        );
        rocket.engineMode = typeof data.mode === 'number' ? data.mode : null;
        this.landedSig.set(key, this.landedState(rocket));
      } finally {
        this.applying.delete(key);
      }
    });
  }
}

function engineOffsets(parts: RocketPart[]): THREE.Vector3[] {
  const out = parts.filter(p => p.isEngine()).map(p => p.mesh.position.clone().setY(p.mesh.position.y - EXHAUST_DROP));
  return out.length ? out : [new THREE.Vector3(0, -1, 0)];
}

function toCargo(v: unknown): InventorySlot[] | null {
  if (!Array.isArray(v)) return null;
  return v.slice(0, 64).map(s => {
    const ok = Array.isArray(s) && Number.isInteger(s[0]) && Number.isInteger(s[1]) && s[1] > 0 && ITEM_DATA[s[0] as ItemType];
    return ok ? { itemType: s[0] as ItemType, quantity: s[1] as number } : { itemType: ItemType.NONE, quantity: 0 };
  });
}
