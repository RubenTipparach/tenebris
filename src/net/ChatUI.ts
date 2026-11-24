/**
 * The chat panel (openspec mp-shared-objects): a log at the lower left whose
 * lines fade a few seconds after they arrive and all show (scrollable) while
 * the input box is open. Enter or T opens the box, Enter sends, Esc cancels;
 * while typing, the box keeps keys from reaching the game. Built only in a
 * server world (mainPlanet), so single player has no chat.
 *
 * Lines come from NetSync.onChat (players' lines from the server, and the
 * join / leave / operator-notice system lines Multiplayer makes); a typed
 * line goes out through NetSync.chat - the server echoes it back into the log.
 */
import { CHAT_CONFIG } from '../config/ChatConfig';
import { MenuManager } from '../player/MenuManager';
import { ChatHistory, cleanChatText, formatChatLine } from './Chat';
import { netSync, type ChatLine } from './NetSync';

export class ChatUI {
  private history = new ChatHistory();
  // when each line reached this client (the fade runs from there)
  private arrived = new WeakMap<ChatLine, number>();
  private root: HTMLDivElement;
  private log: HTMLDivElement;
  private input: HTMLInputElement;
  private open = false;
  private fadeTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.addStyles();
    this.root = document.createElement('div');
    this.root.id = 'chat';
    this.log = document.createElement('div');
    this.log.id = 'chat-log';
    this.input = document.createElement('input');
    this.input.id = 'chat-input';
    this.input.type = 'text';
    this.input.maxLength = CHAT_CONFIG.MAX_CHARS;
    this.input.autocomplete = 'off';
    this.input.placeholder = 'Say something - Enter sends, Esc cancels';
    this.root.append(this.log, this.input);
    document.body.appendChild(this.root);

    // Typing never reaches the game's keys (document listeners); key-up still
    // does, so a key held when the box opened is released
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        const text = cleanChatText(this.input.value);
        if (text) netSync.chat(text);
        this.close();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (this.open || !netSync.online() || !CHAT_CONFIG.OPEN_KEYS.includes(e.code)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (MenuManager.isAnyMenuOpen()) return;
      e.preventDefault();   // the T doesn't land in the box
      this.show();
    });
    netSync.onChat((l) => this.add(l));
    this.fadeTimer = setInterval(() => this.fade(), 250);
    this.render();
  }

  public isOpen(): boolean { return this.open; }

  public show(): void {
    this.open = true;
    this.root.classList.add('open');
    this.input.value = '';
    this.render();
    this.input.focus();
  }

  public close(): void {
    this.open = false;
    this.root.classList.remove('open');
    this.input.blur();
    this.render();
  }

  public add(l: ChatLine): void {
    this.arrived.set(l, Date.now());
    this.history.push(l);
    this.render();
  }

  public dispose(): void {
    clearInterval(this.fadeTimer);
    this.root.remove();
  }

  private render(): void {
    const lines = this.open ? this.history.all() : this.history.last(CHAT_CONFIG.VISIBLE_LINES);
    this.log.textContent = '';
    for (const l of lines) {
      const row = document.createElement('div');
      row.className = l.system ? 'chat-line system' : 'chat-line';
      row.dataset.arrived = String(this.arrived.get(l) ?? Date.now());
      if (l.system) {
        row.textContent = formatChatLine(l);
      } else {
        const name = document.createElement('span');
        name.className = 'chat-name';
        const full = formatChatLine(l);
        const head = full.slice(0, full.indexOf(': ') + 1);
        name.textContent = head;
        row.append(name, document.createTextNode(full.slice(head.length)));
      }
      this.log.appendChild(row);
    }
    this.log.scrollTop = this.log.scrollHeight;
    this.fade();
  }

  // Closed: each line shows SHOW_S after it arrived, then fades over FADE_S
  private fade(): void {
    const now = Date.now();
    for (const row of Array.from(this.log.children) as HTMLElement[]) {
      if (this.open) { row.style.opacity = '1'; continue; }
      const age = (now - Number(row.dataset.arrived)) / 1000;
      const t = (age - CHAT_CONFIG.SHOW_S) / CHAT_CONFIG.FADE_S;
      row.style.opacity = String(Math.max(0, Math.min(1, 1 - t)));
    }
  }

  private addStyles(): void {
    if (document.getElementById('chat-styles')) return;
    const s = document.createElement('style');
    s.id = 'chat-styles';
    s.textContent = `
      #chat {
        position: fixed; left: 12px; bottom: 96px; width: min(480px, calc(100vw - 24px));
        z-index: 900; pointer-events: none; font-family: var(--game-font, monospace); font-size: 18px;
      }
      #chat-log { max-height: 40vh; overflow: hidden; display: flex; flex-direction: column; gap: 2px; }
      #chat.open #chat-log {
        overflow-y: auto; pointer-events: auto; background: rgba(0, 0, 0, 0.55);
        border: 2px solid #1D2B53; border-radius: 4px; padding: 6px;
      }
      .chat-line {
        color: ${CHAT_CONFIG.TEXT_COLOR}; text-shadow: 1px 1px 0 #000; padding: 1px 6px;
        background: rgba(0, 0, 0, 0.4); border-radius: 2px; word-break: break-word; transition: opacity 0.25s;
      }
      #chat.open .chat-line { background: none; }
      .chat-line.system { color: ${CHAT_CONFIG.SYSTEM_COLOR}; }
      .chat-name { color: ${CHAT_CONFIG.NAME_COLOR}; margin-right: 4px; }
      #chat-input {
        display: none; width: 100%; box-sizing: border-box; margin-top: 4px; pointer-events: auto;
        font: inherit; color: ${CHAT_CONFIG.TEXT_COLOR}; background: rgba(0, 0, 0, 0.75);
        border: 2px solid #29ADFF; border-radius: 4px; padding: 4px 8px; outline: none;
      }
      #chat.open #chat-input { display: block; }
    `;
    document.head.appendChild(s);
  }
}
