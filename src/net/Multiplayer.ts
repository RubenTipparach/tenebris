import * as THREE from 'three';
import { Planet } from '../planet/Planet';
import { gameStorage } from '../engine/GameStorage';
import { showToast } from '../utils/toast';
import { clearWorldSave } from '../engine/GameStorage';
import { Avatar, Look, sanitizeLook } from './Avatar';
import { applySnapshot, attachTransport, dispatchLive, dispatchRecord, setPeer } from './NetSync';

/**
 * Online play against server-js/ (deployed to the 'tenebris-c' Fly app).
 *
 * Each client simulates itself. The server relays poses and owns the list
 * of block edits: local edits go up as they are saved (GameStorage
 * .onTileChange - the single point every block edit is persisted through),
 * remote edits are applied straight to the planet (Planet.setBlock, which
 * queues edits for terrain that hasn't generated yet), and a joining client
 * receives every edit so far. Placed objects (torches, trees, machines,
 * launch pads, rockets) and live frames (animals, rockets in flight) go
 * through NetSync, which game systems use without a reference to this.
 */

export const DEFAULT_SERVER = 'wss://tenebris-c.fly.dev/';
// Close codes the server uses (server-js/server.js)
const CLOSE_KICKED = 4001;
const CLOSE_DELETED = 4004;
const CLOSE_RESET = 4010;
const RESET_RELOAD_DELAY_MS = 1500;
const POSE_INTERVAL_S = 0.1;
const SMOOTHING = 12;          // remote avatar follow rate (1/s)

interface Remote {
  name: string;
  look: Look;
  planet: string;
  avatar: Avatar;
  group: THREE.Group;
  target: THREE.Vector3;
  targetQ: THREE.Quaternion;
  // ground speed from successive poses, for the walk clip
  lastTarget: THREE.Vector3 | null;
  lastPoseAt: number;
  speed: number;
}

export class Multiplayer {
  private ws: WebSocket | null = null;
  private myId = 0;
  private remotes = new Map<number, Remote>();
  private poseTimer = 0;
  private wanted = false;
  private retryTimer: number | null = null;

  constructor(
    private scene: THREE.Scene,
    private planets: Map<string, Planet>,
    private getPose: () => { planet: string; p: THREE.Vector3; q: THREE.Quaternion },
    private name: string,
    private look: Look,
  ) {
    gameStorage.onTileChange = (planet, tile, depth, block) => {
      this.sendJson({ t: 'edit', planet, tile, depth, block });
    };
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public playerCount(): number {
    return this.remotes.size + (this.isConnected() ? 1 : 0);
  }

  public connect(url: string): void {
    this.wanted = true;
    if (this.ws) return;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.sendJson({ t: 'hello', name: this.name, look: this.look });
      showToast(`Connected to ${url.replace(/^wss?:\/\//, '').replace(/\/$/, '')}`, { duration: 2500 });
    };
    ws.onmessage = (ev) => this.onMessage(String(ev.data));
    ws.onclose = (ev) => {
      this.ws = null;
      attachTransport(null);
      this.clearRemotes();
      if (ev.code === CLOSE_DELETED) {
        this.wanted = false;
        showToast('That world no longer exists on the server', { duration: 4000 });
      } else if (ev.code === CLOSE_KICKED) {
        this.wanted = false;
        showToast(`Disconnected: ${ev.reason || 'kicked by an operator'}`, { duration: 6000 });
      } else if (ev.code === CLOSE_RESET) {
        // The world went back to fresh terrain: this copy of it is stale
        this.wanted = false;
        showToast('This world was reset - reloading', { duration: 3000 });
        clearWorldSave();
        window.setTimeout(() => window.location.reload(), RESET_RELOAD_DELAY_MS);
      }
      if (this.wanted) {
        showToast('Multiplayer connection lost - retrying', { duration: 2500 });
        this.retryTimer = window.setTimeout(() => { this.retryTimer = null; if (this.wanted) this.connect(url); }, 5000);
      }
    };
    ws.onerror = () => ws.close();
  }

  /** A new name / look from the character creator: everyone sees it at once. */
  public setIdentity(name: string, look: Look): void {
    this.name = name;
    this.look = look;
    this.sendJson({ t: 'hello', name, look });
  }

  public disconnect(): void {
    this.wanted = false;
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
    attachTransport(null);
    this.clearRemotes();
  }

  public update(dt: number): void {
    // Smoothly move avatars toward their last reported pose
    const k = Math.min(1, dt * SMOOTHING);
    for (const r of this.remotes.values()) {
      r.group.position.lerp(r.target, k);
      r.group.quaternion.slerp(r.targetQ, k);
      r.avatar.animate(dt, r.speed);
    }
    if (!this.isConnected()) return;
    this.poseTimer -= dt;
    if (this.poseTimer <= 0) {
      this.poseTimer = POSE_INTERVAL_S;
      const pose = this.getPose();
      this.sendJson({ t: 'pose', planet: pose.planet, p: pose.p.toArray(), q: pose.q.toArray() });
    }
  }

  private sendJson(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private onMessage(raw: string): void {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    switch (m.t) {
      case 'welcome':
        this.myId = m.id;
        attachTransport({
          sendRecord: (kind, planet, key, data) => this.sendJson({ t: 'rec', kind, planet, key, data }),
          sendLive: (ch, data) => this.sendJson({ t: 'live', ch, data }),
        }, m.id, m.now, m.world?.created, m.world?.id);
        for (const [planet, tile, depth, block] of m.edits as Array<[string, number, number, number]>) {
          this.planets.get(planet)?.setBlock(tile, depth, block);
        }
        applySnapshot((m.records ?? []) as Array<[string, string, string, any]>);
        for (const p of m.players) this.upsert(p.id, p.name, p.planet, p.p, p.q, p.look);
        console.log(`[MP] joined as ${this.myId}: ${m.edits.length} edits, ${m.records?.length ?? 0} objects, ${m.players.length} other player(s)`);
        break;
      case 'join': {
        // also sent when a player changes their name or look
        const isNew = !this.remotes.has(m.id);
        this.upsert(m.id, m.name, undefined, undefined, undefined, m.look);
        if (isNew) showToast(`${m.name} joined`, { duration: 2000 });
        break;
      }
      case 'notice':
        showToast(`Server: ${String(m.text ?? '').slice(0, 200)}`, { duration: 8000 });
        break;
      case 'leave': {
        const r = this.remotes.get(m.id);
        if (r) {
          showToast(`${r.name} left`, { duration: 2000 });
          this.removeRemote(m.id);
        }
        break;
      }
      case 'pose':
        this.upsert(m.id, undefined, m.planet, m.p, m.q);
        break;
      case 'edit':
        this.planets.get(m.planet)?.setBlock(m.tile, m.depth, m.block);
        break;
      case 'rec':
        dispatchRecord(m.kind, m.planet, m.key, m.data);
        break;
      case 'live':
        dispatchLive(m.ch, m.id, m.data);
        break;
    }
  }

  private upsert(id: number, name?: string, planet?: string, p?: number[], q?: number[], rawLook?: unknown): void {
    let r = this.remotes.get(id);
    if (!r) {
      const nm = name ?? `Player ${id}`;
      const look = sanitizeLook(rawLook, id);
      const avatar = new Avatar(look, nm);
      r = { name: nm, look, planet: planet ?? 'earth', avatar, group: avatar.group, target: new THREE.Vector3(), targetQ: new THREE.Quaternion(), lastTarget: null, lastPoseAt: 0, speed: 0 };
      this.remotes.set(id, r);
      this.scene.add(r.group);
      if (p) r.group.position.fromArray(p);
      if (q) r.group.quaternion.fromArray(q);
    }
    const look = rawLook === undefined ? r.look : sanitizeLook(rawLook, id);
    if ((name && name !== r.name) || JSON.stringify(look) !== JSON.stringify(r.look)) {
      r.name = name ?? r.name;
      r.look = look;
      this.scene.remove(r.group);
      const pos = r.group.position.clone(), quat = r.group.quaternion.clone();
      r.avatar.dispose();
      r.avatar = new Avatar(look, r.name);
      r.group = r.avatar.group;
      r.group.position.copy(pos);
      r.group.quaternion.copy(quat);
      this.scene.add(r.group);
    }
    if (p) {
      // walking speed from how far the reported pose moved
      const now = performance.now();
      const next = new THREE.Vector3().fromArray(p);
      if (r.lastTarget && now > r.lastPoseAt) {
        const step = next.distanceTo(r.lastTarget) / ((now - r.lastPoseAt) / 1000);
        r.speed += (Math.min(step, 20) - r.speed) * 0.5;
      }
      r.lastTarget = next;
      r.lastPoseAt = now;
    }
    if (planet) r.planet = planet;
    setPeer(id, r.planet, p);
    if (p) r.target.fromArray(p);
    if (q) r.targetQ.fromArray(q);
  }

  private removeRemote(id: number): void {
    const r = this.remotes.get(id);
    if (!r) return;
    this.scene.remove(r.group);
    r.avatar.dispose();
    this.remotes.delete(id);
    setPeer(id, null);
  }

  private clearRemotes(): void {
    for (const id of [...this.remotes.keys()]) this.removeRemote(id);
  }
}
