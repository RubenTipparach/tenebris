import * as THREE from 'three';
import { Avatar, Look, LOOK_OPTIONS, LOOK_SLOTS, LookSlot, defaultLook, loadMyLook, saveMyLook } from './Avatar';

/**
 * The character creator: your name and look (skin, hair, clothes), with a
 * turning preview of the avatar other players see. Saving stores the look
 * locally and hands it to `onSave` (multiplayer sends it to the world).
 */

const SLOT_LABELS: Record<LookSlot, string> = {
  skin: 'Skin', hair: 'Hair colour', style: 'Hair style', shirt: 'Shirt', pants: 'Trousers', boots: 'Boots',
};
const STYLE_LABELS: Record<string, string> = {
  short: 'Short', long: 'Long', mohawk: 'Mohawk', cap: 'Cap', helmet: 'Helmet', none: 'Bald',
};
const PREVIEW = { W: 220, H: 280, SPIN: 0.6 };

export class CharacterCreator {
  private root: HTMLElement;
  private look: Look;
  private nameInput: HTMLInputElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, PREVIEW.W / PREVIEW.H, 0.1, 20);
  private avatar: Avatar | null = null;
  private frame: number | null = null;
  private last = 0;
  private walking = false;

  constructor(private getName: () => string, private onSave: (name: string, look: Look) => void) {
    this.look = loadMyLook();
    this.root = document.createElement('div');
    this.root.id = 'character-creator';
    this.root.innerHTML = `
      <div class="cc-panel" role="dialog" aria-label="Character">
        <div class="cc-head"><h2>Character</h2><button class="cc-close" aria-label="Close">&times;</button></div>
        <div class="cc-body">
          <div class="cc-preview">
            <canvas width="${PREVIEW.W}" height="${PREVIEW.H}"></canvas>
            <button class="cc-walk">Walk</button>
          </div>
          <div class="cc-options">
            <label class="cc-label">Name<input class="cc-name" maxlength="16"></label>
            <div class="cc-slots"></div>
          </div>
        </div>
        <div class="cc-foot">
          <button class="cc-random">Randomise</button>
          <button class="cc-save">Save</button>
        </div>
      </div>`;
    document.body.appendChild(this.root);
    this.nameInput = this.root.querySelector('.cc-name')!;
    this.nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    this.root.querySelector('.cc-close')!.addEventListener('click', () => this.close());
    this.root.addEventListener('click', (e) => { if (e.target === this.root) this.close(); });
    this.root.querySelector('.cc-random')!.addEventListener('click', () => {
      this.look = defaultLook(Math.floor(Math.random() * 100000));
      this.renderSlots();
      this.rebuild();
    });
    this.root.querySelector('.cc-walk')!.addEventListener('click', (e) => {
      this.walking = !this.walking;
      (e.target as HTMLElement).textContent = this.walking ? 'Stand' : 'Walk';
    });
    this.root.querySelector('.cc-save')!.addEventListener('click', () => {
      saveMyLook(this.look);
      this.onSave(this.nameInput.value.trim().slice(0, 16) || this.getName(), this.look);
      this.close();
    });
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(2, 3, 4);
    this.scene.add(sun);
    this.camera.position.set(0, 0.85, 4.2);
    this.camera.lookAt(0, 0.85, 0);
    injectStyle();
    this.renderSlots();
  }

  public getLook(): Look {
    return this.look;
  }

  public open(): void {
    this.nameInput.value = this.getName();
    this.root.classList.add('open');
    if (!this.renderer) {
      const canvas = this.root.querySelector('canvas')!;
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    }
    this.rebuild();
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (this.avatar) {
        this.avatar.group.rotation.y += dt * PREVIEW.SPIN;
        this.avatar.animate(dt, this.walking ? 4 : 0);
      }
      this.renderer!.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  public close(): void {
    this.root.classList.remove('open');
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private rebuild(): void {
    const turn = this.avatar?.group.rotation.y ?? 0;
    if (this.avatar) {
      this.scene.remove(this.avatar.group);
      this.avatar.dispose();
    }
    this.avatar = new Avatar(this.look, undefined, 'studio');
    this.avatar.group.rotation.y = turn;
    this.scene.add(this.avatar.group);
  }

  private renderSlots(): void {
    const slots = this.root.querySelector('.cc-slots')!;
    slots.replaceChildren(...LOOK_SLOTS.map((slot) => {
      const row = document.createElement('div');
      row.className = 'cc-slot';
      const label = document.createElement('div');
      label.className = 'cc-slot-label';
      label.textContent = SLOT_LABELS[slot];
      const opts = document.createElement('div');
      opts.className = 'cc-opts';
      for (const value of LOOK_OPTIONS[slot]) {
        const b = document.createElement('button');
        const picked = this.look[slot] === value;
        b.className = 'cc-opt' + (picked ? ' picked' : '') + (slot === 'style' ? ' cc-word' : '');
        b.setAttribute('aria-pressed', String(picked));
        if (slot === 'style') {
          b.textContent = STYLE_LABELS[value] ?? value;
        } else {
          b.style.background = value;
          b.setAttribute('aria-label', `${SLOT_LABELS[slot]} ${value}`);
        }
        b.addEventListener('click', () => {
          this.look = { ...this.look, [slot]: value };
          this.renderSlots();
          this.rebuild();
        });
        opts.appendChild(b);
      }
      row.append(label, opts);
      return row;
    }));
  }
}

function injectStyle(): void {
  if (document.getElementById('character-creator-style')) return;
  const style = document.createElement('style');
  style.id = 'character-creator-style';
  style.textContent = `
    #character-creator { position: fixed; inset: 0; z-index: 2000; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); font-family: var(--game-font, monospace); }
    #character-creator.open { display: flex; }
    #character-creator .cc-panel { width: min(640px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow: auto; background: rgba(12,16,26,0.96); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 16px 18px; color: #e8ecf2; box-sizing: border-box; }
    #character-creator .cc-head { display: flex; justify-content: space-between; align-items: center; }
    #character-creator h2 { margin: 0; font-size: 22px; letter-spacing: 1px; }
    #character-creator .cc-close { background: none; border: none; color: #e8ecf2; font-size: 26px; cursor: pointer; line-height: 1; }
    #character-creator .cc-body { display: flex; gap: 16px; margin-top: 10px; flex-wrap: wrap; }
    #character-creator .cc-preview { display: grid; gap: 6px; justify-items: center; background: radial-gradient(circle at 50% 40%, #2a3550, #0b0e14); border-radius: 8px; padding: 8px; }
    #character-creator canvas { width: ${PREVIEW.W}px; height: ${PREVIEW.H}px; image-rendering: pixelated; }
    #character-creator .cc-options { flex: 1; min-width: 240px; display: grid; gap: 10px; align-content: start; }
    #character-creator .cc-label { display: grid; gap: 4px; font-size: 13px; color: #9fb3c8; }
    #character-creator input { background: rgba(0,0,0,0.4); color: #e8ecf2; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 7px 9px; font: inherit; font-size: 14px; }
    #character-creator .cc-slot-label { font-size: 12px; color: #9fb3c8; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
    #character-creator .cc-opts { display: flex; flex-wrap: wrap; gap: 5px; }
    #character-creator .cc-opt { width: 26px; height: 26px; border-radius: 5px; border: 2px solid rgba(255,255,255,0.15); cursor: pointer; padding: 0; }
    #character-creator .cc-opt.picked { border-color: #3ee0ff; box-shadow: 0 0 0 2px rgba(62,224,255,0.35); }
    #character-creator .cc-word { width: auto; padding: 0 9px; background: #39424f; color: #e8ecf2; font: inherit; font-size: 13px; }
    #character-creator .cc-word.picked { background: #2a6fdb; }
    #character-creator .cc-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
    #character-creator .cc-foot button, #character-creator .cc-walk { background: #39424f; color: #fff; border: none; border-radius: 5px; padding: 7px 14px; cursor: pointer; font: inherit; font-size: 14px; }
    #character-creator .cc-save { background: #2a6fdb !important; }
  `;
  document.head.appendChild(style);
}
