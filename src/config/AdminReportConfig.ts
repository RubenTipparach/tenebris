/**
 * What an online client tells the server for the admin portal (openspec
 * admin-monitor): its status frame and the maps of the planets it stands on
 * (src/net/AdminReport.ts).
 */
export const ADMIN_REPORT_CONFIG = {
  // The live channel the status frame goes on (server-js/status.js keeps it,
  // never relays it)
  STATUS_CHANNEL: 'status',
  // How often the summary is rebuilt and, when it changed, sent (s)
  SUMMARY_CHECK_S: 2,
  // Suit tank air is reported in steps this big (s), so breathing from the
  // tank doesn't change the frame at every check
  TANK_STEP_S: 10,

  // ---- planet maps ----
  // Uploaded map width (px); the height is half (equirectangular)
  MAP_UPLOAD_WIDTH: 512,
  // Encoding; a browser without webp encoding sends png
  MAP_UPLOAD_TYPE: 'image/webp',
  MAP_UPLOAD_QUALITY: 0.85,
  // Upload again when the server's map is older than this (minutes)...
  MAP_REFRESH_MIN: 30,
  // ...or after this many block edits on the planet since the last upload
  MAP_REFRESH_EDITS: 40,
  // How often the client checks whether a map is due (s)
  MAP_CHECK_S: 10,
  // After a failed upload, wait this long before trying again (s)
  MAP_RETRY_S: 60,
} as const;
