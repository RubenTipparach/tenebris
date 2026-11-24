/**
 * Chat lines (openspec mp-shared-objects): parsing what the server sends,
 * formatting a line for the log, and the log's scrollback. Pure - the DOM
 * panel is ChatUI.ts, the traffic goes through NetSync (chat / onChat).
 */
import { CHAT_CONFIG } from '../config/ChatConfig';
import type { ChatLine } from './NetSync';

/** Printable ASCII only (the game's text rule), trimmed and capped. */
export function cleanChatText(s: unknown, max: number = CHAT_CONFIG.MAX_CHARS): string {
  return String(s ?? '').replace(/[^\x20-\x7e]/g, '').trim().slice(0, max);
}

/** A chat line from the server (a 'chat' message or a welcome history entry), or null if malformed. */
export function parseChatLine(raw: unknown): ChatLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const text = cleanChatText(m.text);
  if (!text || typeof m.id !== 'number' || !Number.isFinite(m.id)) return null;
  const at = typeof m.at === 'number' && Number.isFinite(m.at) ? m.at : Date.now();
  const name = cleanChatText(m.name, CHAT_CONFIG.MAX_NAME_CHARS) || `Player ${m.id}`;
  return { id: m.id, name, text, at };
}

/** A system line for the log (someone joined / left, an operator notice). */
export function systemLine(text: string, at = Date.now()): ChatLine {
  return { id: 0, name: '', text: cleanChatText(text), at, system: true };
}

/** hh:mm of a line, local time. */
export function chatTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The log's text of a line: "[12:04] Ada: hello" or "[12:04] * Bob joined". */
export function formatChatLine(l: ChatLine): string {
  return l.system ? `[${chatTime(l.at)}] * ${l.text}` : `[${chatTime(l.at)}] ${l.name}: ${l.text}`;
}

/** The log's scrollback: the newest `cap` lines. */
export class ChatHistory {
  private lines: ChatLine[] = [];
  constructor(private cap: number = CHAT_CONFIG.HISTORY_LINES) {}
  push(l: ChatLine): void {
    this.lines.push(l);
    if (this.lines.length > this.cap) this.lines.splice(0, this.lines.length - this.cap);
  }
  all(): readonly ChatLine[] { return this.lines; }
  /** The newest n lines. */
  last(n: number): ChatLine[] { return this.lines.slice(Math.max(0, this.lines.length - n)); }
}
