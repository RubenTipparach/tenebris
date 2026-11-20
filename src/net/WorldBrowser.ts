import { createWorld, currentWorld, listWorlds, openWorld, WorldInfo } from './WorldSession';

/**
 * The server browser: every world on the multiplayer server, how many are
 * playing it, and a way to start a new one (a name and a seed) that anyone
 * can then join. Opening a world reloads the game into it (see
 * WorldSession.prepareWorld).
 */
export class WorldBrowser {
  private root: HTMLElement;
  private list: HTMLElement;
  private status: HTMLElement;
  private nameInput: HTMLInputElement;
  private seedInput: HTMLInputElement;
  private createBtn: HTMLButtonElement;
  private refreshTimer: number | null = null;
  private shown = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'world-browser';
    this.root.innerHTML = `
      <div class="wb-panel" role="dialog" aria-label="Server browser">
        <div class="wb-head">
          <h2>Worlds</h2>
          <button class="wb-close" aria-label="Close">&times;</button>
        </div>
        <div class="wb-current"></div>
        <div class="wb-list" role="list"></div>
        <div class="wb-status" role="status"></div>
        <div class="wb-new">
          <h3>New world</h3>
          <div class="wb-row">
            <input class="wb-name" maxlength="32" placeholder="World name">
            <input class="wb-seed" maxlength="10" inputmode="numeric" placeholder="Seed">
            <button class="wb-dice" title="Random seed" aria-label="Random seed">&#x2684;</button>
          </div>
          <button class="wb-create">Create and join</button>
        </div>
        <button class="wb-offline">Play single player</button>
      </div>`;
    document.body.appendChild(this.root);
    this.list = this.root.querySelector('.wb-list')!;
    this.status = this.root.querySelector('.wb-status')!;
    this.nameInput = this.root.querySelector('.wb-name')!;
    this.seedInput = this.root.querySelector('.wb-seed')!;
    this.createBtn = this.root.querySelector('.wb-create')!;

    // Typing in the boxes must not drive the player
    for (const input of [this.nameInput, this.seedInput]) input.addEventListener('keydown', (e) => e.stopPropagation());
    this.root.querySelector('.wb-close')!.addEventListener('click', () => this.close());
    this.root.addEventListener('click', (e) => { if (e.target === this.root) this.close(); });
    this.root.querySelector('.wb-dice')!.addEventListener('click', () => this.rollSeed());
    this.createBtn.addEventListener('click', () => this.create());
    this.root.querySelector('.wb-offline')!.addEventListener('click', () => {
      if (currentWorld()) openWorld(null);
      else this.close();
    });
    injectStyle();
  }

  public open(): void {
    const w = currentWorld();
    (this.root.querySelector('.wb-current') as HTMLElement).textContent = w
      ? `Playing: ${w.name}`
      : 'Playing single player';
    this.root.querySelector('.wb-offline')!.toggleAttribute('hidden', !w);
    if (!this.seedInput.value) this.rollSeed();
    this.root.classList.add('open');
    this.refresh();
    // keep the player counts live while it's open
    this.refreshTimer = window.setInterval(() => this.refresh(), 5000);
  }

  public close(): void {
    this.root.classList.remove('open');
    if (this.refreshTimer !== null) window.clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }

  private rollSeed(): void {
    this.seedInput.value = String(1 + Math.floor(Math.random() * 999999));
  }

  private async refresh(): Promise<void> {
    try {
      const worlds = await listWorlds();
      this.status.textContent = '';
      this.render(worlds);
    } catch {
      this.status.textContent = 'Could not reach the server.';
    }
  }

  private render(worlds: WorldInfo[]): void {
    // Only rebuild when something changed, so a button isn't swapped out
    // from under a click
    const key = JSON.stringify(worlds);
    if (key === this.shown) return;
    this.shown = key;
    const here = currentWorld()?.id;
    this.list.replaceChildren(...worlds.map((w) => {
      const row = document.createElement('div');
      row.className = 'wb-world' + (w.id === here ? ' here' : '');
      row.setAttribute('role', 'listitem');
      const info = document.createElement('div');
      info.className = 'wb-info';
      const name = document.createElement('div');
      name.className = 'wb-wname';
      name.textContent = w.name;
      const meta = document.createElement('div');
      meta.className = 'wb-meta';
      meta.textContent = `seed ${w.seed} - ${w.edits} edits${w.created ? ` - ${new Date(w.created).toLocaleDateString()}` : ''}`;
      info.append(name, meta);
      const players = document.createElement('div');
      players.className = 'wb-players' + (w.players ? ' live' : '');
      players.textContent = `${w.players} online`;
      const join = document.createElement('button');
      join.className = 'wb-join';
      join.textContent = w.id === here ? 'Here' : 'Join';
      join.disabled = w.id === here;
      join.addEventListener('click', () => openWorld(w.id));
      row.append(info, players, join);
      return row;
    }));
  }

  private async create(): Promise<void> {
    const name = this.nameInput.value.trim();
    if (!name) {
      this.status.textContent = 'Give the world a name.';
      this.nameInput.focus();
      return;
    }
    const seed = parseInt(this.seedInput.value, 10);
    this.createBtn.disabled = true;
    this.status.textContent = 'Creating...';
    try {
      const w = await createWorld(name, Number.isFinite(seed) ? seed : undefined);
      openWorld(w.id);
    } catch (e) {
      this.status.textContent = (e as Error).message;
      this.createBtn.disabled = false;
    }
  }
}

function injectStyle(): void {
  if (document.getElementById('world-browser-style')) return;
  const style = document.createElement('style');
  style.id = 'world-browser-style';
  style.textContent = `
    #world-browser { position: fixed; inset: 0; z-index: 2000; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); font-family: var(--game-font, monospace); }
    #world-browser.open { display: flex; }
    #world-browser .wb-panel { width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow: auto; background: rgba(12,16,26,0.96); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 16px 18px; color: #e8ecf2; box-sizing: border-box; }
    #world-browser .wb-head { display: flex; justify-content: space-between; align-items: center; }
    #world-browser h2 { margin: 0; font-size: 22px; letter-spacing: 1px; }
    #world-browser h3 { margin: 0 0 8px; font-size: 15px; color: #9fb3c8; letter-spacing: 1px; text-transform: uppercase; }
    #world-browser .wb-close { background: none; border: none; color: #e8ecf2; font-size: 26px; cursor: pointer; line-height: 1; }
    #world-browser .wb-current { color: #9fb3c8; font-size: 13px; margin: 4px 0 12px; }
    #world-browser .wb-list { display: grid; gap: 6px; }
    #world-browser .wb-world { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; padding: 8px 10px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid transparent; }
    #world-browser .wb-world.here { border-color: rgba(62,224,255,0.5); }
    #world-browser .wb-wname { font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #world-browser .wb-meta { font-size: 11px; color: #8a97a8; margin-top: 2px; }
    #world-browser .wb-info { min-width: 0; }
    #world-browser .wb-players { font-size: 12px; color: #8a97a8; white-space: nowrap; }
    #world-browser .wb-players.live { color: #7be08a; }
    #world-browser button.wb-join, #world-browser .wb-create, #world-browser .wb-offline, #world-browser .wb-dice { background: #2a6fdb; color: #fff; border: none; border-radius: 5px; padding: 7px 14px; cursor: pointer; font: inherit; font-size: 14px; }
    #world-browser button:disabled { background: #39424f; color: #9aa4b2; cursor: default; }
    #world-browser .wb-status { min-height: 18px; font-size: 13px; color: #f2c230; margin: 8px 0; }
    #world-browser .wb-new { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; display: grid; gap: 8px; }
    #world-browser .wb-row { display: grid; grid-template-columns: 1fr 110px auto; gap: 6px; }
    #world-browser input { background: rgba(0,0,0,0.4); color: #e8ecf2; border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; padding: 7px 9px; font: inherit; font-size: 14px; min-width: 0; }
    #world-browser .wb-dice { padding: 4px 10px; font-size: 18px; background: #39424f; }
    #world-browser .wb-offline { margin-top: 12px; width: 100%; background: #39424f; }
    #world-browser .wb-offline[hidden] { display: none; }
  `;
  document.head.appendChild(style);
}
