import * as THREE from 'three';
import { Planet } from '../planet/Planet';
import { HexBlockType } from '../shared/blockTypes';
import { ItemType } from './Inventory';
import { showToast } from '../utils/toast';

/**
 * Fishing, ported from Pale Blue Dot (crates/pbd-core/src/fishing.rs and its
 * FishingSettings in fauna.ron). Same loop and numbers:
 *
 *   Ready -> Charging -> Flying -> Floating -> Nibble -> Bite -> Hooked
 *
 * Hold the left button with the rod to charge a cast, release to throw.
 * The float flies under gravity and lands on water (or the line comes back
 * "dry"). Fish check the lure every SCENT_EVERY_S; one takes interest,
 * nibbles 1-3 times (striking then is too early), then bites: strike inside
 * the hook window. Then reel: hold to pull the line in (tension rises,
 * faster while the fish runs), release to let tension fall. Tension 1 snaps
 * the line; bring the fish within LAND_LINE_M (or onto dry ground) to land
 * it. Right click winds the line in.
 *
 * Differences from Pale Blue Dot: no boid schools - the fish that bites is
 * rolled from the planet's roster by its bite weight - and no bait yet.
 */

enum Phase { Ready, Charging, Flying, Floating, Nibble, Bite, Hooked }

import { FISH_ROSTERS as ROSTERS, FishSpecies as Species } from '../config/FishRosters';

// Pale Blue Dot FishingSettings
const CHARGE_S = 1.2;
// The rod in hand (metres)
const ROD_GRIP = 0.28;
const ROD_BLANK = 0.75;
const ROD_SEGMENTS = 6;
const CAST_SPEED = [5.0, 18.0];
const CAST_LIFT = [3.0, 6.0];
const GRAVITY = 20;            // units/s^2 toward the planet centre
const FLIGHT_MAX_S = 5;
const LINE_MAX_M = 45;
const SPLASH_S = 1.2;
const SCENT_EVERY_S = 0.5;
const BITE_CHANCE = 0.175;
const NIBBLE_DIP = 0.035;
const NIBBLE_DIP_S = 0.12;
const BITE_DIP = 0.14;
const REEL_MPS = 1.8;
const TENSION_BASE = 0.35;
const TENSION_PULL = 0.8;
const TENSION_FALL = 0.7;
const STAMINA_DRAIN = 0.08;
const STAMINA_FLOOR = 0.15;
const LAND_LINE_M = 1.3;
const FLOAT_SCALE = 2.5;       // the float is drawn larger than PBD's (bigger blocks here)

const hookWindow = (strength: number) => Math.max(0.9 * (1 - (Math.max(strength, 1) - 1) * 0.13), 0.25);
const range = (a: number, b: number) => a + Math.random() * (b - a);
const lerp = (r: number[], t: number) => r[0] + (r[1] - r[0]) * t;

export class FishingSystem {
  private phase = Phase.Ready;
  private power = 0;
  private floatPos = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private timer = 0;            // phase timer (flight time, nibble, hook window...)
  private splash = 0;
  private scentTimer = 0;
  private waitTimer = 0;        // extra wait after a spooked fish
  private nibbles = 0;
  private dip = 0;
  private species: Species | null = null;
  private tension = 0;
  private stamina = 1;
  private run = 0;
  private runTimer = 0;
  private lineM = 0;
  private heading = new THREE.Vector3();
  private clock = 0;
  private weave = 0;
  private prevLeft = false;
  private prevRight = false;
  private planet: Planet | null = null;

  private floatGroup: THREE.Group;
  // The rod in hand, a chain of segments so the blank can bend under load
  private rod: THREE.Group;
  private rodSegments: THREE.Mesh[] = [];
  private line: THREE.Line;
  private linePositions: Float32Array;
  private hud: HTMLElement;
  private hudText: HTMLElement;
  private hudTrack: HTMLElement;
  private hudFill: HTMLElement;
  private prompt: HTMLElement;

  constructor(
    scene: THREE.Scene,
    private camera: THREE.Camera,
    private giveFish: (item: ItemType) => boolean,
    // Called on every cast: the rod wears by one use
    private onCast: () => void = () => {},
  ) {
    this.floatGroup = new THREE.Group();
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.06 * FLOAT_SCALE, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd9332a }));
    red.position.y = 0.03 * FLOAT_SCALE;
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.055 * FLOAT_SCALE, 10, 8), new THREE.MeshBasicMaterial({ color: 0xedede6 }));
    white.position.y = -0.02 * FLOAT_SCALE;
    this.floatGroup.add(red, white);
    this.floatGroup.visible = false;
    scene.add(this.floatGroup);

    this.linePositions = new Float32Array(24 * 3);
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0xebf2f2 }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);

    this.rod = this.buildRod();
    scene.add(this.rod);

    // HUD (Pale Blue Dot's layout): status text + meter above the hotbar,
    // button prompt bottom-left
    this.hud = document.createElement('div');
    this.hud.style.cssText = 'position:fixed;bottom:80px;left:50%;width:240px;margin-left:-120px;display:none;flex-direction:column;align-items:center;row-gap:4px;pointer-events:none;z-index:150;font-family:var(--game-font, monospace);';
    this.hudText = document.createElement('div');
    this.hudText.style.cssText = 'font-size:18px;color:#f2d485;text-shadow:0 1px 2px #000;text-align:center;';
    this.hudTrack = document.createElement('div');
    this.hudTrack.style.cssText = 'width:160px;height:6px;border:1px solid rgba(140,191,189,0.6);background:rgba(5,15,20,0.72);display:none;';
    this.hudFill = document.createElement('div');
    this.hudFill.style.cssText = 'height:100%;width:0%;background:#f0b53d;';
    this.hudTrack.appendChild(this.hudFill);
    this.hud.append(this.hudText, this.hudTrack);
    this.prompt = document.createElement('div');
    this.prompt.style.cssText = 'position:fixed;left:12px;bottom:12px;color:#fffefe;font-size:18px;text-shadow:0 0 2px #000,0 0 2px #000;pointer-events:none;z-index:150;display:none;font-family:var(--game-font, monospace);';
    document.body.append(this.hud, this.prompt);
  }

  public isActive(): boolean {
    return this.phase !== Phase.Ready;
  }

  /**
   * Run one frame. `holding` = the rod is the selected hotbar item and the
   * game has focus; left/right = mouse buttons held. Returns true while the
   * rod is in hand (block interaction should ignore the clicks).
   */
  public update(dt: number, holding: boolean, planet: Planet | null, feet: THREE.Vector3, left: boolean, right: boolean): boolean {
    const pressed = left && !this.prevLeft;
    const released = !left && this.prevLeft;
    const rightPressed = right && !this.prevRight;
    this.prevLeft = left;
    this.prevRight = right;
    this.clock += dt;

    this.rod.visible = holding;
    if (!holding || !planet) {
      if (this.phase !== Phase.Ready) this.windIn(this.species ? `Wound in - the ${this.species.name} got away` : '');
      this.showHud(false);
      return false;
    }
    if (planet !== this.planet && this.phase !== Phase.Ready) this.windIn('');
    this.planet = planet;
    const up = feet.clone().sub(planet.center).normalize();

    if (rightPressed && this.phase >= Phase.Flying && this.phase <= Phase.Bite) {
      this.windIn(this.species ? `Wound in - the ${this.species.name} got away` : '');
    }

    switch (this.phase) {
      case Phase.Ready:
        if (pressed) {
          this.phase = Phase.Charging;
          this.power = 0;
        }
        break;

      case Phase.Charging:
        this.power = Math.min(this.power + dt / CHARGE_S, 1);
        if (released) this.cast(up);
        break;

      case Phase.Flying: {
        this.timer += dt;
        this.velocity.addScaledVector(this.floatPos.clone().sub(planet.center).normalize(), -GRAVITY * dt);
        this.floatPos.addScaledVector(this.velocity, dt);
        const hit = this.surfaceAt(this.floatPos);
        if (hit && this.floatPos.distanceTo(planet.center) <= hit.radius) {
          if (hit.water) {
            this.snapToSurface(hit.radius);
            this.phase = Phase.Floating;
            this.splash = SPLASH_S;
            this.scentTimer = 0;
            this.waitTimer = 0;
          } else {
            this.windIn('The float came down on dry ground');
          }
        } else if (this.timer > FLIGHT_MAX_S) {
          this.windIn('The float came down on dry ground');
        }
        break;
      }

      case Phase.Floating:
        this.splash = Math.max(0, this.splash - dt);
        this.waitTimer = Math.max(0, this.waitTimer - dt);
        if (this.splash <= 0 && this.waitTimer <= 0) {
          this.scentTimer -= dt;
          if (this.scentTimer <= 0) {
            this.scentTimer = SCENT_EVERY_S;
            this.lookForInterest();
          }
        }
        break;

      case Phase.Nibble:
        this.timer -= dt;
        if (pressed) {
          this.spook(`Too early - the ${this.species!.name} bolted`, 2.0);
        } else if (this.timer <= 0) {
          this.nibbles--;
          if (this.nibbles <= 0) {
            this.phase = Phase.Bite;
            this.timer = hookWindow(this.species!.strength);
          } else {
            this.timer = range(0.6, 1.4);
          }
        }
        break;

      case Phase.Bite:
        this.timer -= dt;
        if (pressed) {
          this.hook(feet, up);
        } else if (this.timer <= 0) {
          this.spook(`Missed - the ${this.species!.name} spat the hook`, 1.5);
        }
        break;

      case Phase.Hooked:
        this.fight(dt, left, feet, up);
        break;
    }

    // Line too long: wind in
    if (this.phase >= Phase.Floating && this.horizontalDistance(feet, up) > LINE_MAX_M) {
      this.windIn(this.species ? `Wound in - the ${this.species.name} got away` : 'Wound in');
    }

    this.updateDip(dt);
    this.draw(up);
    this.updateHud();
    return true;
  }

  private cast(up: THREE.Vector3): void {
    const look = new THREE.Vector3();
    this.camera.getWorldDirection(look);
    this.floatPos.copy(this.rodTip());
    this.velocity.copy(look).multiplyScalar(lerp(CAST_SPEED, this.power)).addScaledVector(up, lerp(CAST_LIFT, this.power));
    this.phase = Phase.Flying;
    this.timer = 0;
    this.species = null;
    this.onCast();
  }

  private lookForInterest(): void {
    const depth = this.waterDepthAt(this.floatPos);
    const roster = (ROSTERS[this.planet!.getName()] ?? []).filter(s => depth >= s.minDepth);
    if (roster.length === 0) return;
    const total = roster.reduce((sum, s) => sum + s.bite, 0);
    let pick = Math.random() * total;
    let species = roster[0];
    for (const s of roster) {
      pick -= s.bite;
      if (pick <= 0) { species = s; break; }
    }
    if (Math.random() < species.bite * BITE_CHANCE) {
      this.species = species;
      this.phase = Phase.Nibble;
      this.nibbles = Math.max(1, Math.min(3, 1 + Math.floor(Math.random() * 3)));
      this.timer = range(0.6, 1.4);
    }
  }

  private spook(message: string, wait: number): void {
    this.message(message, 2000);
    this.species = null;
    this.phase = Phase.Floating;
    this.waitTimer = wait;
  }

  private hook(feet: THREE.Vector3, up: THREE.Vector3): void {
    this.phase = Phase.Hooked;
    this.tension = 0.2;
    this.stamina = 1;
    this.run = this.species!.pull;
    this.runTimer = range(0.8, 1.6);
    this.lineM = this.horizontalDistance(feet, up);
    this.heading.copy(this.floatPos).sub(feet).projectOnPlane(up).normalize();
    this.weave = 0;
  }

  private fight(dt: number, reeling: boolean, feet: THREE.Vector3, up: THREE.Vector3): void {
    const s = this.species!;
    this.runTimer -= dt;
    if (this.runTimer <= 0) {
      this.run = this.run > 0 ? 0 : s.pull;
      this.runTimer = this.run > 0 ? range(0.8, 2.0) : range(1.2, 3.0);
    }
    if (reeling) {
      this.lineM -= REEL_MPS * dt * (1 - 0.6 * Math.min(this.run / 1.5, 1));
      this.tension += (TENSION_BASE + TENSION_PULL * this.run * this.stamina) * dt;
    } else {
      this.tension -= TENSION_FALL * dt;
      this.lineM += this.run * 1.2 * this.stamina * dt;
    }
    if (this.run > 0 && this.tension > 0.25) {
      this.stamina = Math.max(this.stamina - STAMINA_DRAIN * dt, STAMINA_FLOOR);
    }
    this.tension = Math.max(0, this.tension);
    this.lineM = Math.max(0, Math.min(LINE_MAX_M, this.lineM));
    this.weave += (this.run - this.weave) * Math.min(dt * 4, 1);

    // The fish (and float) sit on the line, weaving while it runs
    const dir = this.heading.clone().applyAxisAngle(up, Math.sin(this.clock * 1.7) * 0.12 * this.weave);
    this.floatPos.copy(feet).addScaledVector(dir, this.lineM);
    const hit = this.surfaceAt(this.floatPos);
    if (hit) this.snapToSurface(hit.radius);

    if (this.tension >= 1) {
      this.windIn(`The line snapped - the ${s.name} is gone`);
    } else if (this.lineM <= LAND_LINE_M || (hit && !hit.water)) {
      this.land(s);
    }
  }

  private land(s: Species): void {
    const cm = Math.round(s.lengthM * (0.85 + 0.4 * Math.random()) * 100);
    if (this.giveFish(s.item)) {
      this.message(`${s.name} - ${cm} cm`, 3000);
    } else {
      this.message(`No room in the inventory - the ${s.name} was let go`, 3000);
    }
    this.species = null;
    this.phase = Phase.Ready;
  }

  private windIn(message: string): void {
    if (message) this.message(message, 2000);
    this.phase = Phase.Ready;
    this.species = null;
    this.power = 0;
  }

  private message(text: string, ms: number): void {
    showToast(text, { duration: ms });
  }

  // Top of the column under `pos`: its radius and whether it is water
  private surfaceAt(pos: THREE.Vector3): { radius: number; water: boolean } | null {
    const planet = this.planet!;
    const tile = planet.getTileAtPoint(pos);
    if (!tile) return null;
    for (let d = planet.getMaxDepth() - 1; d >= 0; d--) {
      const block = planet.getBlock(tile.index, d);
      if (block !== HexBlockType.AIR) {
        return { radius: planet.depthToRadius(d), water: block === HexBlockType.WATER };
      }
    }
    return null;
  }

  private waterDepthAt(pos: THREE.Vector3): number {
    const planet = this.planet!;
    const tile = planet.getTileAtPoint(pos);
    if (!tile) return 0;
    let n = 0;
    for (let d = planet.getMaxDepth() - 1; d >= 0; d--) {
      const block = planet.getBlock(tile.index, d);
      if (block === HexBlockType.WATER) n++;
      else if (block !== HexBlockType.AIR) break;
    }
    return n;
  }

  private snapToSurface(radius: number): void {
    const c = this.planet!.center;
    const dir = this.floatPos.clone().sub(c).normalize();
    this.floatPos.copy(c).addScaledVector(dir, radius);
  }

  private horizontalDistance(feet: THREE.Vector3, up: THREE.Vector3): number {
    return this.floatPos.clone().sub(feet).projectOnPlane(up).length();
  }

  /** Cork grip, reel and a tapered two-tone blank, built along +Y. */
  private buildRod(): THREE.Group {
    const group = new THREE.Group();
    const cork = new THREE.MeshLambertMaterial({ color: 0xb08a5a });
    const metal = new THREE.MeshLambertMaterial({ color: 0x9aa3ab });
    const blank = new THREE.MeshLambertMaterial({ color: 0x23324a });
    const wrap = new THREE.MeshLambertMaterial({ color: 0xc9302c });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, ROD_GRIP, 8), cork);
    grip.position.y = ROD_GRIP / 2;
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12), metal);
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0, ROD_GRIP * 0.8, -0.035);
    group.add(grip, reel);
    // Blank segments: each is parented to the one before so a per-joint
    // rotation bends the whole rod like a real one
    let parent: THREE.Object3D = group;
    let y = ROD_GRIP;
    for (let i = 0; i < ROD_SEGMENTS; i++) {
      const r0 = 0.012 * (1 - i / ROD_SEGMENTS) + 0.003;
      const r1 = 0.012 * (1 - (i + 1) / ROD_SEGMENTS) + 0.003;
      const len = ROD_BLANK / ROD_SEGMENTS;
      const joint = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 6), blank);
      joint.geometry.translate(0, len / 2, 0);
      joint.position.y = y;
      if (i > 0 && i % 2 === 0) {
        const guide = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 4, 8), wrap);
        joint.add(guide);
      }
      parent.add(joint);
      this.rodSegments.push(joint);
      parent = joint;
      y = len;
    }
    group.traverse(o => { o.frustumCulled = false; (o as THREE.Mesh).renderOrder = 10; });
    group.visible = false;
    return group;
  }

  /**
   * Hold the rod in the right hand, in the eye frame (butt low and near,
   * blank angled up and out), bend it by the load, and return its tip.
   */
  private rodTip(): THREE.Vector3 {
    const cam = this.camera;
    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const right = fwd.clone().cross(camUp).normalize();
    const butt = cam.position.clone().addScaledVector(right, 0.22).addScaledVector(camUp, -0.3).addScaledVector(fwd, 0.35);
    // Point the rod up-forward; pull it back while charging, raise it while
    // fighting a fish
    const lift = this.phase === Phase.Charging ? 1.4 * this.power
      : this.phase === Phase.Hooked ? 0.5 + 0.4 * this.tension : 0.6;
    const along = fwd.clone().multiplyScalar(Math.cos(lift * 0.6)).addScaledVector(camUp, Math.sin(lift * 0.6) + 0.35).addScaledVector(right, 0.08).normalize();
    this.rod.position.copy(butt);
    const basis = new THREE.Matrix4();
    const zAxis = right.clone().cross(along).normalize();
    basis.makeBasis(right.clone().crossVectors(along, zAxis).normalize(), along, zAxis);
    this.rod.quaternion.setFromRotationMatrix(basis);
    // Bend: load spread over the joints, more toward the tip
    const load = this.phase === Phase.Hooked ? 0.05 + 0.18 * this.tension
      : this.phase === Phase.Bite ? 0.06 : this.phase === Phase.Charging ? -0.04 * this.power : 0.015;
    this.rodSegments.forEach((seg, i) => { if (i > 0) seg.rotation.x = load * (i / ROD_SEGMENTS); });
    this.rod.updateMatrixWorld(true);
    const last = this.rodSegments[this.rodSegments.length - 1];
    return new THREE.Vector3(0, ROD_BLANK / ROD_SEGMENTS, 0).applyMatrix4(last.matrixWorld);
  }

  private updateDip(dt: number): void {
    let want = 0;
    if (this.phase === Phase.Nibble && this.timer < NIBBLE_DIP_S) want = NIBBLE_DIP;
    if (this.phase === Phase.Bite) want = BITE_DIP;
    this.dip += (want - this.dip) * Math.min(dt * 14, 1);
  }

  private draw(up: THREE.Vector3): void {
    const tip = this.rodTip();
    const inWater = this.phase >= Phase.Flying;
    this.floatGroup.visible = inWater;
    this.line.visible = inWater;
    if (!inWater) return;

    const shown = this.floatPos.clone().addScaledVector(up, -this.dip * FLOAT_SCALE);
    this.floatGroup.position.copy(shown);
    this.floatGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

    // Line from the rod tip to the float, sagging by the slack
    const slack = this.phase === Phase.Bite ? 0.03
      : this.phase === Phase.Hooked ? 0.01 + 0.05 * (1 - this.tension)
      : 0.6;
    const span = shown.clone().sub(tip);
    for (let i = 0; i < 24; i++) {
      const u = i / 23;
      const p = tip.clone().addScaledVector(span, u).addScaledVector(up, -slack * 4 * u * (1 - u));
      this.linePositions[i * 3] = p.x;
      this.linePositions[i * 3 + 1] = p.y;
      this.linePositions[i * 3 + 2] = p.z;
    }
    (this.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private showHud(show: boolean): void {
    this.hud.style.display = show ? 'flex' : 'none';
    this.prompt.style.display = show ? 'block' : 'none';
  }

  private updateHud(): void {
    this.showHud(true);
    let text = '';
    let meter: number | null = null;
    let colour = '#f0b53d';
    let prompt = '';
    switch (this.phase) {
      case Phase.Ready: prompt = '[LMB] HOLD TO CAST'; break;
      case Phase.Charging: text = 'CAST'; meter = this.power; prompt = '[LMB] LET GO TO CAST'; break;
      case Phase.Flying:
      case Phase.Floating: prompt = '[RMB] CANCEL'; break;
      case Phase.Nibble: text = 'Something is nibbling - wait for the float to go under'; prompt = '[RMB] CANCEL'; break;
      case Phase.Bite: text = 'Bite! Left click'; prompt = '[LMB] HOOK   [RMB] CANCEL'; break;
      case Phase.Hooked:
        text = 'Hold to reel - ease off when it runs';
        meter = this.tension;
        colour = this.tension > 0.8 ? '#ff6b57' : this.tension > 0.55 ? '#f0b53d' : '#78e0a1';
        prompt = '[LMB] HOLD TO REEL';
        break;
    }
    this.hudText.textContent = text;
    this.hudTrack.style.display = meter === null ? 'none' : 'block';
    if (meter !== null) {
      this.hudFill.style.width = `${Math.min(1, meter) * 100}%`;
      this.hudFill.style.background = colour;
    }
    this.prompt.textContent = prompt;
    // Shake the prompt at the bite
    this.prompt.style.color = this.phase === Phase.Bite ? '#faaf5c' : '#fffefe';
    this.prompt.style.transform = this.phase === Phase.Bite ? `translateX(${Math.round(Math.sin(this.clock * Math.PI * 2 * 18)) * 2}px)` : '';
  }
}
