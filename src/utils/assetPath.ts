// Utility for resolving asset paths with the correct base URL
// This is needed for GitHub Pages subdirectory deployments and itch.io

// Get the base URL at module load time - Vite will inline this
const BASE = import.meta.env.BASE_URL;

export function getAssetPath(path: string): string {
  // For itch.io (empty string BASE_URL), return relative paths without leading slash
  // For GitHub Pages, prepend the base URL
  // The ternary with BASE directly allows Vite to dead-code eliminate properly
  if (BASE === '') {
    // itch.io: '/textures/foo.png' -> 'textures/foo.png'
    return path.startsWith('/') ? path.slice(1) : path;
  }
  // GitHub Pages: '/textures/foo.png' -> '/tenebris/textures/foo.png'
  const base = BASE || '/';
  return path.startsWith('/') ? base + path.slice(1) : base + path;
}
