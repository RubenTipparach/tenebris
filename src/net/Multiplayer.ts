import * as THREE from 'three';
import { Planet } from '../planet/Planet';
import { gameStorage } from '../engine/GameStorage';
import { showToast } from '../utils/toast';

/**
 * Online play against server-js/ (deployed to the 'tenebris-c' Fly app).
 *
 * Each client simulates itself. The server relays poses and owns the list
 * of block edits: local edits go up as they are saved (GameStorage
 * .onTileChange - the single point every block edit is persisted through),
 * remote edits are applied straight to the planet (Planet.setBlock, which
 * queues edits for terrain that hasn't generated yet), and a joining client
 * receives every edit so far. v1 syncs players and blocks; torches,
 * machines, trees and rockets stay local.
 */

export const DEFAULT_SERVER = 'wss://tenebris-c.fly.dev/';
const POSE_INTERVAL_S = 0.1;
const SMOOTHING = 12;          // remote avatar follow rate (1/s)

interface Remote {
  name: string;
  planet: string;
  group: THREE.Group;
  target: THREE.Vector3;
  targetQ: THREE.Quaternion;
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
      this.sendJson({ t: 'hello', name: this.name });
      showToast(`Connected to ${url.replace(/^wss?:\/\//, '').replace(/\/$/, '')}`, { duration: 2500 });
    };
    ws.onmessage = (ev) => this.onMessage(String(ev.data));
    ws.onclose = () => {
      this.ws = null;
      this.clearRemotes();
      if (this.wanted) {
        showToast('Multiplayer connection lost - retrying', { duration: 2500 });
        this.retryTimer = window.setTimeout(() => { this.retryTimer = null; if (this.wanted) this.connect(url); }, 5000);
      }
    };
    ws.onerror = () => ws.close();
  }

  public disconnect(): void {
    this.wanted = false;
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
    this.clearRemotes();
  }

  public update(dt: number): void {
    // Smoothly move avatars toward their last reported pose
    const k = Math.min(1, dt * SMOOTHING);
    for (const r of this.remotes.values()) {
      r.group.position.lerp(r.target, k);
      r.group.quaternion.slerp(r.targetQ, k);
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
        for (const [planet, tile, depth, block] of m.edits as Array<[string, number, number, number]>) {
          this.planets.get(planet)?.setBlock(tile, depth, block);
        }
        for (const p of m.players) this.upsert(p.id, p.name, p.planet, p.p, p.q);
        console.log(`[MP] joined as ${this.myId}: ${m.edits.length} edits, ${m.players.length} other player(s)`);
        break;
      case 'join':
        this.upsert(m.id, m.name);
        showToast(`${m.name} joined`, { duration: 2000 });
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
    }
  }

  private upsert(id: number, name?: string, planet?: string, p?: number[], q?: number[]): void {
    let r = this.remotes.get(id);
    if (!r) {
      r = { name: name ?? `Player ${id}`, planet: planet ?? 'earth', group: makeAvatar(id, name ?? `Player ${id}`), target: new THREE.Vector3(), targetQ: new THREE.Quaternion() };
      this.remotes.set(id, r);
      this.scene.add(r.group);
      if (p) r.group.position.fromArray(p);
      if (q) r.group.quaternion.fromArray(q);
    }
    if (name && name !== r.name) {
      r.name = name;
      this.scene.remove(r.group);
      const pos = r.group.position.clone(), quat = r.group.quaternion.clone();
      r.group = makeAvatar(id, name);
      r.group.position.copy(pos);
      r.group.quaternion.copy(quat);
      this.scene.add(r.group);
    }
    if (planet) r.planet = planet;
    if (p) r.target.fromArray(p);
    if (q) r.targetQ.fromArray(q);
  }

  private removeRemote(id: number): void {
    const r = this.remotes.get(id);
    if (!r) return;
    this.scene.remove(r.group);
    r.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.remotes.delete(id);
  }

  private clearRemotes(): void {
    for (const id of [...this.remotes.keys()]) this.removeRemote(id);
  }
}

// A simple blocky avatar: body + head in a colour from the player id, and a
// name tag. Local +Y is the player's up (the pose quaternion maps it to the
// planet surface normal); the group origin is at the eyes, like the camera.
function makeAvatar(id: number, name: string): THREE.Group {
  const colour = new THREE.Color().setHSL(((id * 0.618034) % 1), 0.65, 0.55);
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.35), new THREE.MeshLambertMaterial({ color: colour }));
  body.position.y = -0.95;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshLambertMaterial({ color: colour.clone().offsetHSL(0, 0, 0.15) }));
  head.position.y = -0.1;
  group.add(body, head);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '32px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 8, 256, 48);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name.slice(0, 16), 128, 44);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: true }));
  tag.scale.set(2, 0.5, 1);
  tag.position.y = 0.6;
  group.add(tag);
  return group;
}
