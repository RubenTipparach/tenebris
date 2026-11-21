// Utility for resolving asset paths with the correct base URL
// This is needed for GitHub Pages subdirectory deployments and itch.io

// Get the base URL at module load time - Vite will inline this
const BASE = import.meta.env.BASE_URL;

export function getAssetPath(path: string): string {
  // For itch.io (empty string BASE_URL), return relative paths without leading slash
  // For GitHub Pages, prepend the base URL
  // The ternary with BASE directly allows Vite to dead-code eliminate properly
  if (BASE === '' || BASE.startsWith('.')) {
    // itch.io (and the artifact page) is the relative build ('./' base) and
    // ships every file flattened into one folder:
    // '/textures/biomes/x.png' -> './textures_biomes_x.png'. The build
    // rewrites literal paths; doing it here as well covers paths assembled
    // at runtime (template strings), which it can't see. Idempotent: an
    // already-flat name has no '/' left.
    const flat = (path.startsWith('/') ? path.slice(1) : path).replace(/\//g, '_');
    return BASE + flat;
  }
  // GitHub Pages: '/textures/foo.png' -> '/tenebris/textures/foo.png'
  const base = BASE || '/';
  return path.startsWith('/') ? base + path.slice(1) : base + path;
}
