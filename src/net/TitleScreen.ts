import { CharacterCreator } from './CharacterCreator';
import { WorldBrowser } from './WorldBrowser';

/**
 * The title screen: where a session starts, before the game builds
 * anything. Single player loads the local world; Multiplayer opens the
 * server browser, and joining or creating a world reloads straight into it
 * (?world=<id>); Character edits the name and look other players see.
 *
 * Skipped when the URL already says which world to play (?world, ?mp, or
 * ?sp after leaving a server world for single player).
 */

const NAME_KEY = 'tenebris_mp_name';

export function titleWanted(): boolean {
  const params = new URLSearchParams(window.location.search);
  return !(params.has('world') || params.has('mp') || params.has('sp'));
}

/** Resolves when the player picks single player. */
export function showTitleScreen(): Promise<void> {
  return new Promise((resolve) => {
    injectStyle();
    const root = document.createElement('div');
    root.id = 'title-screen';
    root.innerHTML = `
      <div class="ts-panel">
        <h1>TENEBRIS</h1>
        <button class="ts-btn ts-primary" data-act="sp">SINGLE PLAYER</button>
        <button class="ts-btn" data-act="mp">MULTIPLAYER</button>
        <button class="ts-btn ts-quiet" data-act="char">CHARACTER</button>
      </div>`;
    document.body.appendChild(root);

    let browser: WorldBrowser | null = null;
    let creator: CharacterCreator | null = null;
    const read = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } };

    root.querySelector('[data-act="sp"]')!.addEventListener('click', () => {
      root.remove();
      resolve();
    });
    root.querySelector('[data-act="mp"]')!.addEventListener('click', () => {
      // joining / creating a world reloads the page into it
      browser ??= new WorldBrowser(true);
      browser.open();
    });
    root.querySelector('[data-act="char"]')!.addEventListener('click', () => {
      creator ??= new CharacterCreator(read, (name) => {
        try { localStorage.setItem(NAME_KEY, name); } catch { /* blocked */ }
      });
      creator.open();
    });
  });
}

function injectStyle(): void {
  if (document.getElementById('title-screen-style')) return;
  const style = document.createElement('style');
  style.id = 'title-screen-style';
  style.textContent = `
    #title-screen { position: fixed; inset: 0; z-index: 1900; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 35%, #15203a, #05070c 70%); font-family: var(--game-font, monospace); }
    #title-screen .ts-panel { display: grid; gap: 12px; justify-items: center; width: min(360px, calc(100vw - 32px)); }
    #title-screen h1 { color: #4caf50; font-size: 56px; letter-spacing: 6px; margin: 0 0 18px; text-shadow: 0 0 24px rgba(76,175,80,0.35); }
    #title-screen .ts-btn { width: 100%; padding: 13px 0; font: inherit; font-size: 20px; letter-spacing: 2px; color: #fff; background: #4caf50; border: none; border-radius: 6px; cursor: pointer; }
    #title-screen .ts-btn:hover { filter: brightness(1.15); }
  `;
  document.head.appendChild(style);
}
