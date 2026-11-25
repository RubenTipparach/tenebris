import * as THREE from 'three';
import { NPC_CONFIG } from '../config/NpcConfig';
import { inputKeyLabel } from '../config/RocketConfig';
import { WALKER_INPUTS } from '../config/WalkerInputs';
import type { Npc } from '../shared/npc';
import type { NpcField } from './NpcField';

/**
 * Talking to NPCs on foot (openspec friendship-npcs, task 4.1): the NPC
 * under the crosshair within TALK_RANGE_M gets the Interact prompt, and
 * Interact (WALKER_INPUTS.INTERACT, F) opens its panel and holds it - the
 * host stops it and turns it to the player (NpcField.talk) - until the panel
 * closes or the player walks off. With no NPC targeted Interact does what
 * it otherwise would (the submarine's board), so the caller gives the key
 * to the next user only when `targeting` is false.
 */

/** The prompt over a targeted NPC: the Interact binding's own label, then the name (ASCII). */
export function talkPrompt(name: string, code: string = WALKER_INPUTS.INTERACT): string {
  return `[${inputKeyLabel(code)}] talk to ${name}`;
}

/** What the panel needs from talking: open on an NPC, and whether it is still open. */
export interface NpcPanelHost {
  open(npc: Npc, index: number): void;
  isOpen(): boolean;
  close(): void;
}

export class NpcTalk {
  private readonly hint: HTMLDivElement;
  private edges = new Set<string>();
  private target = -1;
  private talkingTo = -1;
  private lastWordMs = 0;   // when the host last heard from us (wall clock: the host's hold is wall time too)
  private panel: NpcPanelHost | null = null;
  private readonly origin = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();

  constructor() {
    this.hint = document.createElement('div');
    this.hint.id = 'npc-hint';
    this.hint.style.cssText = 'position:fixed;left:50%;top:58%;transform:translateX(-50%);padding:4px 10px;'
      + 'background:rgba(8,14,30,0.75);border:1px solid #ffa300;border-radius:4px;color:#fff1e8;'
      + 'font:12px monospace;z-index:60;display:none;pointer-events:none';
    document.body.appendChild(this.hint);
    document.addEventListener('keydown', (e) => { if (!e.repeat) this.edges.add(e.code); });
  }

  setPanel(panel: NpcPanelHost): void {
    this.panel = panel;
  }

  /** An NPC is under the crosshair in range (Interact is ours this frame). */
  get targeting(): boolean {
    return this.target >= 0;
  }

  /** Who is being talked to (index into the field), or -1. */
  get talking(): number {
    return this.talkingTo;
  }

  /**
   * Each frame on foot. `active`: the game has the keys (no menu open);
   * camera: the view (its forward is the crosshair); player: the feet.
   */
  update(_dt: number, active: boolean, field: NpcField | null, camera: THREE.Camera, player: THREE.Vector3): void {
    const edges = this.edges;
    this.edges = new Set();
    // the conversation: held while the panel is open and the player near
    if (this.talkingTo >= 0 && field) {
      const near = field.npcs[this.talkingTo]?.pose.pos.distanceTo(player) ?? Infinity;
      const open = this.panel ? this.panel.isOpen() : true;
      if (!open || near > NPC_CONFIG.TALK_RANGE_M * 2) this.endTalk(field, player);
      else if (performance.now() - this.lastWordMs >= NPC_CONFIG.TALK_REFRESH_S * 1000) {
        this.lastWordMs = performance.now();
        field.talk(this.talkingTo, true, player);
      }
    }
    this.target = -1;
    if (active && field) {
      camera.getWorldPosition(this.origin);
      camera.getWorldDirection(this.dir);
      this.target = field.pick(this.origin, this.dir, player);
    }
    const npc = this.target >= 0 ? field!.npcAt(this.target) : null;
    this.hint.style.display = npc && this.talkingTo < 0 ? 'block' : 'none';
    if (!npc) return;
    this.hint.textContent = talkPrompt(npc.name);
    if (edges.has(WALKER_INPUTS.INTERACT) && this.talkingTo < 0) {
      this.talkingTo = this.target;
      this.lastWordMs = performance.now();
      field!.talk(this.target, true, player);
      this.panel?.open(npc, this.target);
    }
  }

  private endTalk(field: NpcField, player: THREE.Vector3): void {
    field.talk(this.talkingTo, false, player);
    this.talkingTo = -1;
    if (this.panel?.isOpen()) this.panel.close();
  }

  /** Leaving the planet or the game: let whoever we talk to go. */
  reset(field: NpcField | null, player: THREE.Vector3): void {
    if (this.talkingTo >= 0 && field) this.endTalk(field, player);
    this.talkingTo = -1;
    this.target = -1;
    this.hint.style.display = 'none';
  }
}
