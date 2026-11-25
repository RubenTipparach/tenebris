import * as THREE from 'three';
import type { Planet } from '../planet/Planet';
import type { PlanetPlayer } from '../player/PlanetPlayer';
import type { Inventory, InventorySlot } from '../player/Inventory';
import { ItemType, ITEM_DATA } from '../player/Inventory';
import type { RocketFlightManager } from '../rocket/RocketFlightManager';
import type { LandedRocket } from '../rocket/LandedRocket';
import type { PlanetGravitySource } from '../rocket/RocketController';
import { SUBMARINE, SUBMARINE_INPUTS, HullSpec, hullOf, depthBandAt } from '../config/DivingConfig';
import { ROCKET_CONFIG, ROCKET_INPUTS, inputKeyLabel as keyName } from '../config/RocketConfig';
import { PlayerConfig } from '../config/PlayerConfig';
import { getBodyConfig, bodyEnvironment } from '../config/SolarSystemConfig';
import { gameStorage } from '../engine/GameStorage';
import { emitGameEvent } from '../engine/GameEvents';
import { lockPointer } from '../engine/InputManager';
import { netSync } from '../net/NetSync';
import { planetObjectScene } from '../world/PlanetFrames';
import { showToast } from '../utils/toast';
import {
  Craft, CraftInput, FluidMedium, SavedSubmarine, StepResult, NO_INPUT,
  newCraft, stepCraft, craftToRecord, craftFromRecord, pilotedByOther, craftForward,
  seaMedium, gasMedium, dockDiver, loseDiver, withinDock,
} from './Submarine';

/**
 * Submarines and gas-giant divers in the running game (openspec
 * space-exploration, submarines): the parked craft in the world, piloting
 * one (keys, camera, HUD), placing one from the hotbar, and the diver's
 * release from / dock into a rocket. The physics and the record are the pure
 * Submarine.ts; this file only wires them to the scene and the player.
 *
 * A parked submarine is a placed object: saved and synced as a 'submarine'
 * record through GameStorage (saveSubmarine / removeSubmarine) and rebuilt
 * through PlanetBlockInteraction.restoreSavedObject, like every other kind.
 * Piloting keeps writing it (its pose every SUBMARINE.SAVE_POSE_EVERY_S,
 * parking at once), so it never vanishes and a reload finds it parked where
 * it was left.
 */

/** What PlanetBlockInteraction's placed-object paths call (kind 'submarine') */
export interface SubmarineWorld {
  find(key: string): { position: THREE.Vector3 } | undefined;
  removeFromWorld(key: string): void;
  applyRecord(o: unknown, rec: SavedSubmarine): boolean;
  restore(rec: SavedSubmarine & { planetId: string }, configuredCenter: THREE.Vector3): void;
  holdChanged(slots: InventorySlot[] | undefined): void;
}

export interface SubmarineHost {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  planets: () => Map<string, Planet>;
  player: PlanetPlayer;
  inventory: () => Inventory;
  inventoryChanged: () => void;
  flight: RocketFlightManager;
  openHold: (slots: InventorySlot[], title: string) => void;
  /** The craft was lost with the pilot in it: respawn them (nearest planet) */
  respawn: (from: THREE.Vector3) => void;
}

/** A craft in the world: a parked or piloted submarine (on a planet), or the diver out of its rocket */
interface Placed {
  craft: Craft;
  mesh: THREE.Group;
  /** Where it is in its planet's configured frame (the placed-object position the record paths use) */
  position: THREE.Vector3;
  /** Its last record says another player is piloting it */
  record: SavedSubmarine | null;
}

/** The diver out of its rocket: the rocket waits, held in the giant's frame */
interface Dive {
  rocket: LandedRocket;
  giant: PlanetGravitySource;
  rocketLocal: THREE.Vector3;
}

const v1 = new THREE.Vector3();

export class SubmarineManager implements SubmarineWorld {
  private placed = new Map<string, Placed>();
  private piloting: Placed | null = null;
  private dive: Dive | null = null;
  private held = new Set<string>();
  private edges = new Set<string>();
  private saveTimer = 0;
  private last: StepResult | null = null;
  private hud: HTMLDivElement;
  private hint: HTMLDivElement;
  private camPos = new THREE.Vector3();

  constructor(private host: SubmarineHost) {
    this.hud = document.createElement('div');
    this.hud.id = 'sub-hud';
    this.hud.style.cssText = 'position:fixed;left:16px;bottom:96px;min-width:210px;padding:10px 12px;'
      + 'background:rgba(8,14,30,0.82);border:2px solid #29adff;border-radius:6px;color:#fff1e8;'
      + 'font:13px monospace;z-index:60;display:none;pointer-events:none;line-height:1.5';
    this.hint = document.createElement('div');
    this.hint.id = 'sub-hint';
    this.hint.style.cssText = 'position:fixed;left:50%;top:58%;transform:translateX(-50%);padding:4px 10px;'
      + 'background:rgba(8,14,30,0.75);border:1px solid #29adff;border-radius:4px;color:#fff1e8;'
      + 'font:12px monospace;z-index:60;display:none;pointer-events:none';
    document.body.appendChild(this.hud);
    document.body.appendChild(this.hint);
    document.addEventListener('keydown', (e) => {
      if (!e.repeat) this.edges.add(e.code);
      this.held.add(e.code);
    });
    document.addEventListener('keyup', (e) => this.held.delete(e.code));
    host.flight.setOnDiverRelease((rocket, giant, hull) => this.startDive(rocket, giant, hull));
  }

  // ---- queries ----------------------------------------------------------

  public isPiloting(): boolean {
    return this.piloting !== null;
  }

  /** The craft being piloted (tests, the debug handle) */
  public getPiloted(): Craft | null {
    return this.piloting?.craft ?? null;
  }

  /** The last piloting step (depth, crushing, what it collected) - the HUD's numbers */
  public getLastStep(): StepResult | null {
    return this.last;
  }

  public getAll(): Craft[] {
    return [...this.placed.values()].map(p => p.craft);
  }

  /** The craft's world position: its body's live centre + its local position */
  public worldPosition(c: Craft, out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(this.centreOf(c)).add(c.local);
  }

  /** The camera is in the fluid (underwater fog while piloting) */
  public cameraInFluid(): boolean {
    const p = this.piloting;
    if (!p || this.dive) return false;
    const medium = this.mediumFor(p.craft);
    return !!medium && medium.depthAt(v1.copy(this.host.camera.position).sub(this.centreOf(p.craft))) > 0;
  }

  private centreOf(c: Craft): THREE.Vector3 {
    if (this.dive && this.piloting?.craft === c) return this.dive.giant.center;
    return this.host.planets().get(c.body)?.center ?? new THREE.Vector3();
  }

  private configuredCentreOf(body: string): THREE.Vector3 | null {
    return this.host.planets().get(body)?.configuredCenter ?? null;
  }

  /** The fluid a craft is in: its planet's sea, or (a diver) its gas giant */
  public mediumFor(c: Craft): FluidMedium | null {
    if (this.dive && this.piloting?.craft === c) {
      const g = this.dive.giant;
      return gasMedium(g.id, g.radius, PlayerConfig.BASE_GRAVITY * ROCKET_CONFIG.GAS_GIANT_FLIGHT.gravityStrength,
        bodyEnvironment(g.id).atmosphereDensity);
    }
    const planet = this.host.planets().get(c.body);
    if (!planet) return null;
    return planetSea(c.body, planet);
  }

  // ---- the placed-object record paths (PlanetBlockInteraction) -----------

  public find(key: string): { position: THREE.Vector3 } | undefined {
    return this.placed.get(key);
  }

  public restore(rec: SavedSubmarine & { planetId: string }, configuredCenter: THREE.Vector3): void {
    if (this.placed.has(rec.key)) return;
    const craft = craftFromRecord(rec, rec.planetId, configuredCenter);
    if (!craft) return;
    const p: Placed = { craft, mesh: buildCraftMesh(hullOf(craft.hull)!), position: new THREE.Vector3(), record: rec };
    this.placed.set(craft.key, p);
    this.placeMesh(p);   // first: the router picks the planet by where it is
    planetObjectScene(this.host.scene).add(p.mesh);
  }

  public applyRecord(o: unknown, rec: SavedSubmarine): boolean {
    const p = o as Placed;
    if (!this.placed.has(rec.key) || p.craft.hull !== rec.hull) return false;
    if (p === this.piloting) return true;          // this client flies it: its own record wins
    const centre = this.configuredCentreOf(p.craft.body);
    const fresh = centre ? craftFromRecord(rec, p.craft.body, centre) : null;
    if (!fresh) return false;
    p.craft.local.copy(fresh.local);
    p.craft.orientation.copy(fresh.orientation);
    p.craft.health = fresh.health;
    p.craft.ballast = fresh.ballast;
    fresh.hold.forEach((s, i) => { p.craft.hold[i].itemType = s.itemType; p.craft.hold[i].quantity = s.quantity; });
    p.record = rec;
    this.placeMesh(p);
    return true;
  }

  public removeFromWorld(key: string): void {
    const p = this.placed.get(key);
    if (!p) return;
    if (p === this.piloting) this.endPiloting(false);
    this.placed.delete(key);
    disposeMesh(p.mesh);
  }

  public holdChanged(slots: InventorySlot[] | undefined): void {
    for (const p of this.placed.values()) if (slots && p.craft.hold === slots) this.save(p);
  }

  /** Write a parked / piloted submarine's record now (same frame) */
  private save(p: Placed): void {
    const centre = this.configuredCentreOf(p.craft.body);
    if (!centre) return;
    const rec = craftToRecord(p.craft, centre, p === this.piloting, this.nowMs());
    p.record = rec;
    gameStorage.saveSubmarine(p.craft.body, rec);
  }

  private nowMs(): number {
    return netSync.worldTimeMs() ?? Date.now();
  }

  /** The mesh at the craft's pose (in its planet's configured frame; it rides the planet's root) */
  private placeMesh(p: Placed): void {
    const centre = this.configuredCentreOf(p.craft.body) ?? new THREE.Vector3();
    p.position.copy(centre).add(p.craft.local);
    p.mesh.position.copy(p.position);
    p.mesh.quaternion.copy(p.craft.orientation);
  }

  // ---- on foot: place, board, open the hold -------------------------------

  /** The parked craft the view ray hits within reach, or null */
  private lookedAt(): Placed | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.host.camera);
    ray.far = SUBMARINE.BOARD_REACH_M;
    let best: Placed | null = null, bestD = Infinity;
    for (const p of this.placed.values()) {
      const hit = ray.intersectObject(p.mesh, true)[0];
      if (hit && hit.distance < bestD) { best = p; bestD = hit.distance; }
    }
    return best;
  }

  /** The parked craft nearest the player within boarding reach (swimming beside one, it need not be under the crosshair) */
  private nearest(): Placed | null {
    let best: Placed | null = null, bestD = SUBMARINE.BOARD_REACH_M;
    for (const p of this.placed.values()) {
      const d = this.worldPosition(p.craft, v1).distanceTo(this.host.player.position);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
  }

  /**
   * The interact button on foot: a submarine hull in hand places one in the
   * water ahead; looking at a parked one opens its hold. True when handled
   * (the block interaction then leaves the click alone).
   */
  public handleRightClick(pressed: boolean): boolean {
    const held = this.host.inventory().getSelectedItem();
    const hull = held.quantity > 0 ? hullOf(held.itemType) : null;
    const target = this.lookedAt();
    if (target) {
      if (pressed) this.host.openHold(target.craft.hold, `${ITEM_DATA[target.craft.hull].name} Hold`);
      return true;
    }
    if (!hull) return false;
    if (pressed) this.tryPlace(hull);
    return true;
  }

  /** Place a hull from the hand into water deep enough to hold it, ahead within reach */
  public tryPlace(hull: HullSpec): boolean {
    if (hull.gas) {
      showToast(`A diver rides in a rocket's cargo hold - let it out below a gas giant's cloud tops (${keyName(ROCKET_INPUTS.DIVER)})`, { duration: 3500 });
      return false;
    }
    const cam = this.host.camera;
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const point = new THREE.Vector3();
    for (let t = 0; t <= SUBMARINE.PLACE.reachM; t += SUBMARINE.PLACE.stepM) {
      point.copy(cam.position).addScaledVector(dir, t);
      for (const [id, planet] of this.host.planets()) {
        if (point.distanceTo(planet.center) > planet.radius * 1.5) continue;
        const local = point.clone().sub(planet.center);
        if (planetSea(id, planet).depthAt(local) < SUBMARINE.PLACE.minDepthM) continue;
        return this.placeAt(hull, id, local, dir);
      }
    }
    showToast('Place a submarine in water deep enough to hold it', { duration: 2500 });
    return false;
  }

  /** Put a new craft of `hull` at `local` in planet `body` (the hull leaves the hand); saved at once */
  public placeAt(hull: HullSpec, body: string, local: THREE.Vector3, forward: THREE.Vector3): boolean {
    const inv = this.host.inventory();
    if (inv.removeItem(hull.item, 1) !== 1) return false;
    this.host.inventoryChanged();
    const craft = newCraft(hull, body, local, local.clone().normalize(), forward);
    const p: Placed = { craft, mesh: buildCraftMesh(hull), position: new THREE.Vector3(), record: null };
    this.placed.set(craft.key, p);
    this.placeMesh(p);   // first: the router picks the planet by where it is
    planetObjectScene(this.host.scene).add(p.mesh);
    this.save(p);
    emitGameEvent('placed', hull.item, 1);
    showToast(`${ITEM_DATA[hull.item].name} placed - [${keyName(SUBMARINE_INPUTS.INTERACT)}] to board`, { duration: 3000 });
    return true;
  }

  /** Board a parked submarine (Interact): the player takes its controls */
  public board(key: string): boolean {
    const p = this.placed.get(key);
    if (!p || this.piloting || this.host.flight.isInFlight()) return false;
    if (p.record && pilotedByOther(p.record, this.nowMs())) {
      showToast('Someone else is piloting it', { duration: 2500 });
      return false;
    }
    this.piloting = p;
    this.last = null;
    this.saveTimer = SUBMARINE.SAVE_POSE_EVERY_S;
    this.host.player.setEnabled(false);
    this.setCrosshair(false);
    this.camPos.copy(this.chaseTarget(p.craft));
    this.save(p);
    return true;
  }

  // ---- the frame ----------------------------------------------------------

  /**
   * Each frame. On foot: the board key and the hint over a parked craft.
   * Piloting: the keys, the physics step, the hull, the band, the camera
   * and the HUD.
   */
  public update(dt: number, gameActive: boolean): void {
    const edges = this.edges;
    this.edges = new Set();
    if (this.dive) this.holdRocket(this.dive);
    if (!this.piloting) {
      this.hud.style.display = 'none';
      const target = gameActive && !this.host.flight.isInFlight() ? this.lookedAt() ?? this.nearest() : null;
      this.hint.style.display = target ? 'block' : 'none';
      if (target) {
        this.hint.textContent = `${ITEM_DATA[target.craft.hull].name} - [${keyName(SUBMARINE_INPUTS.INTERACT)}] board  [Right-click] hold`;
        if (edges.has(SUBMARINE_INPUTS.INTERACT)) this.board(target.craft.key);
      }
      return;
    }
    this.hint.style.display = 'none';
    const p = this.piloting;
    if (edges.has(SUBMARINE_INPUTS.INTERACT) || edges.has(SUBMARINE_INPUTS.EXIT)) {
      if (this.dive) this.tryDock();
      else this.endPiloting(true);
      if (this.piloting !== p) return;
    }
    this.step(this.readInput(dt), dt);
  }

  private throttle = 0;

  private readInput(dt: number): CraftInput {
    const k = (c: string) => (this.held.has(c) ? 1 : 0);
    const I = SUBMARINE_INPUTS;
    this.throttle = Math.max(-1, Math.min(1, this.throttle + (k(I.THROTTLE_UP) - k(I.THROTTLE_DOWN)) * SUBMARINE.PHYSICS.throttleRate * dt));
    if (k(I.STOP)) this.throttle = 0;
    return {
      throttle: this.throttle,
      pitch: k(I.PITCH_UP) - k(I.PITCH_DOWN),
      yaw: k(I.YAW_RIGHT) - k(I.YAW_LEFT),
      roll: k(I.ROLL_RIGHT) - k(I.ROLL_LEFT),
      ballast: k(I.FLOOD) - k(I.BLOW),
    };
  }

  /** One piloting step with `input` (the keys, or a test's stick) */
  public step(input: CraftInput = NO_INPUT, dt: number): StepResult | null {
    const p = this.piloting;
    if (!p) return null;
    const medium = this.mediumFor(p.craft);
    if (!medium) return null;
    const r = stepCraft(p.craft, input, medium, dt);
    this.last = r;
    if (r.collected) showToast(`+${r.collected.count} ${ITEM_DATA[r.collected.item].name}`, { duration: 1500, id: 'sub-collect' });
    const world = this.worldPosition(p.craft);
    // The player rides along (the frame, LOD and saves follow the craft)
    this.host.player.position.copy(world);
    if (!this.dive) this.placeMesh(p);
    else { p.mesh.position.copy(world); p.mesh.quaternion.copy(p.craft.orientation); }
    this.updateCamera(p.craft, dt);
    this.renderHud(p.craft, r);
    // (a pointer-lock change shows the crosshair again: the chase view has none)
    this.setCrosshair(false);
    if (r.lost) { this.lose(); return r; }
    this.saveTimer -= dt;
    if (!this.dive && this.saveTimer <= 0) {
      this.saveTimer = SUBMARINE.SAVE_POSE_EVERY_S;
      this.save(p);
    }
    return r;
  }

  /** Climb out (park): the craft stays where it is, saved this frame; a diver can't be left in a giant */
  public endPiloting(placePlayer: boolean): boolean {
    const p = this.piloting;
    if (!p) return false;
    if (this.dive) {
      showToast(`No way out down here - climb back to your rocket and dock ([${keyName(SUBMARINE_INPUTS.INTERACT)}])`, { duration: 3000 });
      return false;
    }
    p.craft.velocity.set(0, 0, 0);
    p.craft.throttle = 0;
    this.throttle = 0;
    this.piloting = null;
    this.save(p);
    this.hud.style.display = 'none';
    if (placePlayer) {
      const world = this.worldPosition(p.craft);
      const up = world.clone().sub(this.centreOf(p.craft)).normalize();
      const cam = this.host.camera;
      this.host.player.placeAt(world.addScaledVector(up, SUBMARINE.EXIT_LIFT_M),
        { forward: cam.getWorldDirection(new THREE.Vector3()), up: new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion) });
    }
    this.host.player.setEnabled(true);
    this.setCrosshair(true);
    lockPointer();
    return true;
  }

  /** Health gone: the craft is lost for good, the pilot respawns */
  private lose(): void {
    const p = this.piloting!;
    const where = this.worldPosition(p.craft);
    this.piloting = null;
    this.placed.delete(p.craft.key);
    disposeMesh(p.mesh);
    this.hud.style.display = 'none';
    if (this.dive) {
      const { rocket } = this.dive;
      this.dive = null;
      if (rocket.cargo && loseDiver(rocket.cargo, p.craft.hull)) this.host.flight.rocketChanged(rocket);
    } else {
      gameStorage.removeSubmarine(p.craft.body, p.craft.key);
    }
    showToast(`Hull crushed - ${ITEM_DATA[p.craft.hull].name} lost`, { duration: 4000 });
    this.setCrosshair(true);
    this.host.player.setEnabled(true);
    this.host.respawn(where);
  }

  // ---- the gas-giant diver -------------------------------------------------

  /** The rocket let a diver out (RocketFlightManager.releaseDiver): the pilot takes it */
  public startDive(rocket: LandedRocket, giant: PlanetGravitySource, hullItem: ItemType): void {
    const hull = hullOf(hullItem);
    if (!hull) return;
    const rocketLocal = rocket.position.clone().sub(giant.center);
    const up = rocketLocal.clone().normalize();
    const local = rocketLocal.clone().addScaledVector(up, -SUBMARINE.DIVER.releaseDropM);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rocket.orientation);
    const craft = newCraft(hull, giant.id, local, up, forward);
    const p: Placed = { craft, mesh: buildCraftMesh(hull), position: new THREE.Vector3(), record: null };
    this.host.scene.add(p.mesh);
    this.dive = { rocket, giant, rocketLocal };
    this.piloting = p;
    this.last = null;
    this.throttle = 0;
    this.host.player.setEnabled(false);
    this.setCrosshair(false);
    this.camPos.copy(this.chaseTarget(craft));
    showToast(`${hull.item === ItemType.DEEP_DIVER ? 'Deep diver' : 'Diver'} away - ${keyName(SUBMARINE_INPUTS.FLOOD)} to sink, ${keyName(SUBMARINE_INPUTS.BLOW)} to rise, [${keyName(SUBMARINE_INPUTS.INTERACT)}] at the rocket to dock`, { duration: 4000 });
  }

  /** The waiting rocket stays put in the giant's frame while the giant moves on its orbit */
  private holdRocket(d: Dive): void {
    d.rocket.position.copy(d.giant.center).add(d.rocketLocal);
    d.rocket.pivot.position.copy(d.rocket.position);
  }

  /** Distance (m) from the diver to its rocket, or null (no dive) */
  public rocketDistance(): number | null {
    if (!this.dive || !this.piloting) return null;
    return this.piloting.craft.local.distanceTo(this.dive.rocketLocal);
  }

  /** Dock the diver back into its rocket (within reach): its hold goes into the cargo and the pilot takes the rocket again */
  public tryDock(): boolean {
    const d = this.dive, p = this.piloting;
    if (!d || !p) return false;
    const dist = this.rocketDistance()!;
    if (!withinDock(p.craft.local, d.rocketLocal)) {
      showToast(`Rocket is ${Math.round(dist)} m away - climb to within ${SUBMARINE.DIVER.dockRadiusM} m to dock`, { duration: 2500 });
      return false;
    }
    if (!d.rocket.cargo) return false;
    const docked = dockDiver(d.rocket.cargo, p.craft);
    if (!docked.ok) {
      showToast('No room in the cargo hold for what the diver carries', { duration: 3000 });
      return false;
    }
    this.dive = null;
    this.piloting = null;
    this.host.scene.remove(p.mesh);
    disposeMesh(p.mesh);
    this.hud.style.display = 'none';
    this.host.flight.rocketChanged(d.rocket);
    const what = docked.moved.map(m => `${m.count} ${ITEM_DATA[m.item].name}`).join(', ');
    showToast(`Diver docked${what ? ` - ${what} to the cargo hold` : ''}`, { duration: 3500 });
    this.host.player.setEnabled(true);
    this.host.flight.boardLandedRocket(d.rocket);
    return true;
  }

  // ---- camera and HUD --------------------------------------------------------

  private chaseTarget(c: Craft): THREE.Vector3 {
    const world = this.worldPosition(c);
    const up = world.clone().sub(this.centreOf(c)).normalize();
    return world.addScaledVector(craftForward(c), -SUBMARINE.CAMERA.distanceM).addScaledVector(up, SUBMARINE.CAMERA.heightM);
  }

  private updateCamera(c: Craft, dt: number): void {
    const cam = this.host.camera;
    const target = this.chaseTarget(c);
    this.camPos.lerp(target, 1 - Math.exp(-SUBMARINE.CAMERA.followRate * dt));
    cam.position.copy(this.camPos);
    cam.up.copy(this.worldPosition(c).sub(this.centreOf(c)).normalize());
    cam.lookAt(this.worldPosition(c));
  }

  private renderHud(c: Craft, r: StepResult): void {
    const hull = hullOf(c.hull)!;
    const share = c.health / hull.maxHealth;
    const colour = share < SUBMARINE.HUD.dangerShare ? '#ff004d' : share < SUBMARINE.HUD.warnShare ? '#ffa300' : '#00e436';
    const medium = this.mediumFor(c);
    const band = medium ? depthBandAt(medium.bodyId, r.depth) : null;
    const held = c.hold.filter(s => s.quantity > 0).map(s => `${s.quantity} ${ITEM_DATA[s.itemType].name}`).join(', ');
    const dist = this.rocketDistance();
    const I = SUBMARINE_INPUTS;
    this.hud.style.display = 'block';
    this.hud.style.borderColor = r.crushing ? '#ff004d' : '#29adff';
    this.hud.innerHTML = `
      <div style="font-weight:bold;color:#29adff">${ITEM_DATA[c.hull].name}</div>
      <div>Depth <b>${Math.max(0, r.depth).toFixed(1)} m</b> / rated ${hull.crushDepthM} m</div>
      <div>Hull <span style="display:inline-block;width:110px;height:9px;background:#1d2b53;border:1px solid #5f574f;vertical-align:middle">
        <span style="display:block;height:100%;width:${(share * 100).toFixed(0)}%;background:${colour}"></span></span> ${(share * 100).toFixed(0)}%</div>
      ${r.crushing ? '<div style="color:#ff004d">TOO DEEP - hull failing</div>' : ''}
      <div>Ballast ${(c.ballast * 100).toFixed(0)}% | Throttle ${(c.throttle * 100).toFixed(0)}%</div>
      ${band ? `<div style="color:#00e436">Collecting ${ITEM_DATA[band.item].name}</div>` : ''}
      ${held ? `<div>Hold: ${held}</div>` : ''}
      ${dist !== null ? `<div>Rocket ${dist.toFixed(0)} m ${dist <= SUBMARINE.DIVER.dockRadiusM ? `- [${keyName(I.INTERACT)}] dock` : ''}</div>` : ''}
      <div style="color:#c2c3c7;font-size:11px">${keyName(I.THROTTLE_UP)}/${keyName(I.THROTTLE_DOWN)} throttle, ${keyName(I.YAW_LEFT)}/${keyName(I.YAW_RIGHT)} turn, arrows pitch, ${keyName(I.ROLL_LEFT)}/${keyName(I.ROLL_RIGHT)} roll, ${keyName(I.BLOW)} rise, ${keyName(I.FLOOD)} sink, ${this.dive ? '' : `${keyName(I.INTERACT)} climb out`}</div>`;
  }

  private setCrosshair(on: boolean): void {
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.style.display = on ? 'block' : 'none';
  }
}

/** A planet's sea as a fluid medium (voxel water over its seabed) */
export function planetSea(bodyId: string, planet: Planet): FluidMedium {
  const at = new THREE.Vector3(), dir = new THREE.Vector3();
  return seaMedium(bodyId, PlayerConfig.BASE_GRAVITY * (getBodyConfig(bodyId)?.gravity.strength ?? 1),
    (l) => planet.getWaterSurfaceRadius(at.copy(planet.center).add(l)),
    (l) => planet.getSurfaceHeightInDirection(dir.copy(l).normalize()));
}


/** A craft's procedural model: a submarine (capsule hull, sail, screw) or a diver (pressure sphere, window, ring) */
export function buildCraftMesh(hull: HullSpec): THREE.Group {
  const g = new THREE.Group();
  g.name = 'Submarine';
  const L = hull.look;
  const mat = (c: string) => new THREE.MeshLambertMaterial({ color: new THREE.Color(c) });
  const body = mat(L.hull), trim = mat(L.trim), glass = mat(L.window);
  if (!hull.gas) {
    const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(L.radius, L.length - 2 * L.radius, 6, 12), body);
    capsule.rotation.x = Math.PI / 2;                      // along +Z, the nose
    g.add(capsule);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(L.radius * 0.7, L.radius * 1.1, L.length * 0.25), trim);
    sail.position.set(0, L.radius * 1.2, L.length * 0.05);
    g.add(sail);
    for (const z of [L.length * 0.2, L.length * 0.02]) {
      for (const x of [-1, 1]) {
        const port = new THREE.Mesh(new THREE.SphereGeometry(L.radius * 0.18, 8, 6), glass);
        port.position.set(x * L.radius * 0.92, L.radius * 0.15, z);
        g.add(port);
      }
    }
    const screw = new THREE.Mesh(new THREE.TorusGeometry(L.radius * 0.45, L.radius * 0.08, 6, 12), trim);
    screw.position.set(0, 0, -L.length / 2 - L.radius * 0.1);
    g.add(screw);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(L.radius * 2.4, L.radius * 0.08, L.radius * 0.6), trim);
    fin.position.set(0, 0, -L.length * 0.38);
    g.add(fin);
  } else {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(L.radius, 16, 12), body);
    g.add(sphere);
    const window = new THREE.Mesh(new THREE.CircleGeometry(L.radius * 0.45, 16), glass);
    window.position.set(0, 0, L.radius * 1.01);
    g.add(window);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(L.radius * 0.35, L.radius * 0.07, 6, 12), trim);
    ring.position.set(0, L.radius * 1.15, 0);
    g.add(ring);
    for (const x of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(L.radius * 0.1, L.radius * 0.8, L.radius * 0.6), trim);
      fin.position.set(x * L.radius * 1.0, -L.radius * 0.6, -L.radius * 0.4);
      g.add(fin);
    }
  }
  g.userData.length = L.length;
  return g;
}

function disposeMesh(g: THREE.Object3D): void {
  g.parent?.remove(g);
  g.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const x of mats) x.dispose();
  });
}
