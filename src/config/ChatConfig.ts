/**
 * Multiplayer text chat (openspec mp-shared-objects). The server
 * (server-js/server.js CHAT_MAX_CHARS) is the authority on the line length;
 * scripts/shared-objects.test.ts checks the two agree.
 */
export const CHAT_CONFIG = {
  // The longest line (characters); the input box stops there too
  MAX_CHARS: 200,
  // The longest player name shown (the server caps names at this too)
  MAX_NAME_CHARS: 24,
  // Lines the log keeps (scrollback while the box is open)
  HISTORY_LINES: 50,
  // Lines shown while the box is closed (the newest)
  VISIBLE_LINES: 8,
  // A line stays fully shown this long after it arrives (s)...
  SHOW_S: 8,
  // ...then fades out over this long (s)
  FADE_S: 2,
  // Keys that open the box (KeyboardEvent.code). Not E or F (CLAUDE.md Controls)
  OPEN_KEYS: ['Enter', 'NumpadEnter', 'KeyT'] as readonly string[],
  // Colours (the PICO-8 palette): a player's name, their text, a system line
  NAME_COLOR: '#FFA300',
  TEXT_COLOR: '#FFF1E8',
  SYSTEM_COLOR: '#29ADFF',
} as const;
