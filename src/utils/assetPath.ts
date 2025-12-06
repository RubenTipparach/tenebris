// Utility for resolving asset paths with the correct base URL
// This is needed for GitHub Pages subdirectory deployments

export function getAssetPath(path: string): string {
  const basePath = import.meta.env.BASE_URL || '/';
  if (path.startsWith('/')) {
    return basePath + path.slice(1);
  }
  return basePath + path;
}
