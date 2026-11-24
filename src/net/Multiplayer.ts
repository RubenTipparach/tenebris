import * as THREE from 'three';
import { Planet } from '../planet/Planet';
import { gameStorage } from '../engine/GameStorage';
import { showToast } from '../utils/toast';
import { clearWorldSave } from '../engine/GameStorage';
import { Avatar, Look, SUIT_ON, sanitizeLook } from './Avatar';
import { ActionFrame, IDLE_ACTION, LoopAction, OneShotTracker, ShotAction, avatarTransforms, decodeAction, encodeAction } from './AvatarPose';
import { ITEM_DATA, ItemType } from '../player/Inventory';
import { serverHttpBase } from './WorldSession';
import { ackRecord, applySnapshot, attachTransport, dispatchChat, dispatchLive, dispatchRecord, nackRecord, setPeer } from './NetSync';
import { parseChatLine, systemLine } from './Chat';

/**
 * Online play against server-js/ (deployed to the 'tenebris' Fly app).
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

export const DEFAULT_SERVER = 'wss://tenebris.fly.dev/';
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
  // What they're doing (openspec avatar-anims): the last action frame, and
  // the one-shot counter seen so far
  action: ActionFrame;
  shots: OneShotTracker;
}

// The local player's pose for the pose frame
export interface LocalPose {
  planet: string;
  p: THREE.Vector3;
  q: THREE.Quaternion;
  /** What they're doing (mining, the last one-shot, the held item). */
  a: ActionFrame;
}

const _up = new THREE.Vector3();
const _shown = new THREE.Vector3();
const _xf = { body: new THREE.Quaternion(), headPitch: 0 };

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
    private getPose: () => LocalPose,
    private name: string,
    private look: Look,
  ) {
    gameStorage.onTileChange = (planet, tile, depth, block) => {
      this.sendJson({ t: 'edit', planet, tile, depth, block });
    };
  }

  // Where a planet is drawn in this client's frame, minus its configured
  // position (live orbits: the body you are on stays put, the rest move)
  private frameOffset: ((planet: string) => THREE.Vector3) | null = null;
  public setFrameOffset(fn: (planet: string) => THREE.Vector3): void {
    this.frameOffset = fn;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** The other players: name, the body they're on, and where (for the maps). */
  public getRemotePlayers(): Array<{ name: string; planet: string; position: THREE.Vector3 }> {
    return [...this.remotes.values()].map(r => ({ name: r.name, planet: r.planet, position: r.group.position }));
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
    this.look = { ...look, suit: this.look.suit };
    this.sendJson({ t: 'hello', name, look: this.look });
  }

  /** The space suit went on or came off: it rides the look, so everyone sees it. */
  public setSuit(worn: boolean): void {
    const look: Look = { ...this.look };
    if (worn) look.suit = SUIT_ON; else delete look.suit;
    this.look = look;
    this.sendJson({ t: 'hello', name: this.name, look });
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
      // A pose is in the sender's frame, where their planet sits at its
      // configured position; shift it to where that planet is in ours
      const shown = _shown.copy(r.target);
      if (this.frameOffset) shown.add(this.frameOffset(r.planet));
      r.group.position.lerp(shown, k);
      // Body upright on the planet, the look pitch on the head only
      const planet = this.planets.get(r.planet);
      if (planet) _up.subVectors(r.group.position, planet.center);
      if (!planet || _up.lengthSq() === 0) _up.set(0, 1, 0).applyQuaternion(r.targetQ);
      avatarTransforms(r.targetQ, _up.normalize(), _xf);
      r.group.quaternion.slerp(_xf.body, k);
      r.avatar.setHeadPitch(_xf.headPitch);
      r.avatar.animate(dt, r.speed);
    }
    if (!this.isConnected()) return;
    this.poseTimer -= dt;
    if (this.poseTimer <= 0) {
      this.poseTimer = POSE_INTERVAL_S;
      const pose = this.getPose();
      this.sendJson({ t: 'pose', planet: pose.planet, p: pose.p.toArray(), q: pose.q.toArray(), a: encodeAction(pose.a) });
    }
  }

  // A planet map picture for the admin portal: POST /maps/<world>/<planet>,
  // signed with this connection's upload key (server-js/server.js)
  private async uploadMap(worldId: string, planet: string, image: Blob, key: string): Promise<boolean> {
    if (!worldId || !key) return false;
    const q = new URLSearchParams({ player: String(this.myId), key });
    const url = `${serverHttpBase()}/maps/${encodeURIComponent(worldId)}/${encodeURIComponent(planet)}?${q}`;
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': image.type }, body: image });
      return r.ok;
    } catch {
      return false;
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
          sendRecord: (kind, planet, key, data, base) => this.sendJson({ t: 'rec', kind, planet, key, data, base }),
          sendChat: (text) => this.sendJson({ t: 'chat', text }),
          sendLive: (ch, data) => this.sendJson({ t: 'live', ch, data }),
          uploadMap: (planet, image) => this.uploadMap(String(m.world?.id ?? ''), planet, image, String(m.uploadKey ?? '')),
        }, m.id, m.now, m.world?.created, m.world?.id, m.maps);
        for (const [planet, tile, depth, block] of m.edits as Array<[string, number, number, number]>) {
          this.planets.get(planet)?.setBlock(tile, depth, block);
        }
        applySnapshot((m.records ?? []) as Array<[string, string, string, any, number?]>);
        // the world's last few chat lines, so a joiner sees the conversation
        for (const line of (m.chat ?? []) as unknown[]) {
          const l = parseChatLine(line);
          if (l) dispatchChat(l);
        }
        for (const p of m.players) {
          this.upsert(p.id, p.name, p.planet, p.p, p.q, p.look);
          this.applyAction(p.id, p.a);
        }
        console.log(`[MP] joined as ${this.myId}: ${m.edits.length} edits, ${m.records?.length ?? 0} objects, ${m.players.length} other player(s)`);
        break;
      case 'join': {
        // also sent when a player changes their name or look
        const isNew = !this.remotes.has(m.id);
        this.upsert(m.id, m.name, undefined, undefined, undefined, m.look);
        if (isNew) dispatchChat(systemLine(`${String(m.name ?? 'Someone')} joined`));
        break;
      }
      case 'notice':
        dispatchChat(systemLine(`Server: ${String(m.text ?? '')}`));
        break;
      case 'leave': {
        const r = this.remotes.get(m.id);
        if (r) {
          dispatchChat(systemLine(`${r.name} left`));
          this.removeRemote(m.id);
        }
        break;
      }
      case 'pose':
        this.upsert(m.id, undefined, m.planet, m.p, m.q);
        // no `a` (an older client): idle, empty-handed
        this.applyAction(m.id, m.a);
        break;
      case 'edit':
        this.planets.get(m.planet)?.setBlock(m.tile, m.depth, m.block);
        break;
      case 'rec':
        dispatchRecord(m.kind, m.planet, m.key, m.data, m.v);
        break;
      case 'recAck':
        ackRecord(m.kind, m.planet, m.key, m.v);
        break;
      case 'recNack':
        nackRecord(m.kind, m.planet, m.key, m.v, m.data ?? null);
        break;
      case 'chat': {
        const l = parseChatLine(m);
        if (l) dispatchChat(l);
        break;
      }
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
      r = { name: nm, look, planet: planet ?? 'earth', avatar, group: avatar.group, target: new THREE.Vector3(), targetQ: new THREE.Quaternion(), lastTarget: null, lastPoseAt: 0, speed: 0, action: { ...IDLE_ACTION }, shots: new OneShotTracker() };
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
      this.showAction(r);
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

  /** A remote player's action frame from the network (missing = idle). */
  private applyAction(id: number, raw: unknown): void {
    const r = this.remotes.get(id);
    if (!r) return;
    r.action = decodeAction(raw);
    const shot = r.shots.next(r.action);
    this.showAction(r);
    if (shot !== ShotAction.NONE) r.avatar.playShot(shot);
  }

  /** Put a remote's continuous action and held item on their avatar. */
  private showAction(r: Remote): void {
    r.avatar.setLoopAction(r.action.loop === LoopAction.MINE ? LoopAction.MINE : LoopAction.IDLE);
    const item = r.action.held ? ITEM_DATA[r.action.held as ItemType] : undefined;
    r.avatar.setHeldItem(item?.texture ? { texture: item.texture, atlasRegion: item.atlasRegion } : null);
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
