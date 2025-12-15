import { defineConfig, Plugin } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve, join } from 'path';
import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync, unlinkSync, readFileSync, writeFileSync, rmdirSync } from 'fs';

// Plugin to copy public directory FLAT (no subdirectories) while excluding certain file types
// Also builds a mapping of original paths to new flat names
function copyPublicFlat(excludePatterns: string[]): Plugin {
  const pathMapping: Map<string, string> = new Map();

  return {
    name: 'copy-public-flat',
    writeBundle(options) {
      const publicDir = resolve(__dirname, 'public');
      const outDir = options.dir || resolve(__dirname, 'dist-itch');

      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }

      // Recursively collect all files and flatten them
      function collectFiles(srcDir: string, relativePath: string = '') {
        const entries = readdirSync(srcDir);
        for (const entry of entries) {
          const srcPath = join(srcDir, entry);
          const stat = statSync(srcPath);
          const currentRelPath = relativePath ? `${relativePath}/${entry}` : entry;

          // Check if file matches any exclude pattern
          const shouldExclude = excludePatterns.some(pattern => entry.endsWith(pattern));

          if (stat.isDirectory()) {
            collectFiles(srcPath, currentRelPath);
          } else if (!shouldExclude) {
            // Create flat filename: replace / with _ to avoid conflicts
            // e.g., textures/rocks.png -> textures_rocks.png
            const flatName = currentRelPath.replace(/\//g, '_');
            const destPath = join(outDir, flatName);

            copyFileSync(srcPath, destPath);
            // Store mapping: /textures/rocks.png -> textures_rocks.png
            pathMapping.set('/' + currentRelPath, flatName);
          }
        }
      }

      collectFiles(publicDir);

      // Store the mapping for the next plugin to use
      (global as any).__itchPathMapping = pathMapping;
    }
  };
}

// Plugin to move worker files from assets/ to root and rewrite all asset paths to flat structure
function flattenAll(): Plugin {
  return {
    name: 'flatten-all',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist-itch');
      const assetsDir = join(outDir, 'assets');

      // Move worker files from assets/ to root
      if (existsSync(assetsDir)) {
        const assetFiles = readdirSync(assetsDir);
        for (const file of assetFiles) {
          const srcPath = join(assetsDir, file);
          const destPath = join(outDir, file);
          copyFileSync(srcPath, destPath);
          unlinkSync(srcPath);
        }
        try { rmdirSync(assetsDir); } catch (e) { /* ignore */ }
      }

      // Get the path mapping from the previous plugin
      const pathMapping: Map<string, string> = (global as any).__itchPathMapping || new Map();

      // Update main JS file to rewrite all asset paths
      const jsFiles = readdirSync(outDir).filter(f => f.endsWith('.js') && f.startsWith('index'));
      for (const jsFile of jsFiles) {
        const jsPath = join(outDir, jsFile);
        let content = readFileSync(jsPath, 'utf-8');

        // Remove assets/ prefix for workers
        content = content.replace(/assets\//g, '');

        // Handle dynamic path construction for mineralsPath and basePath configs
        // These get concatenated at runtime like: `${mineralsPath}/rocks_coal.png`
        // We need to rewrite the base path AND the concatenation pattern

        // Rewrite mineralsPath values to flat prefix format
        // "/textures/minerals/earth" -> "textures_minerals_earth" (no trailing slash)
        content = content.replace(
          /mineralsPath:\s*["']\/textures\/minerals\/earth["']/g,
          'mineralsPath:"textures_minerals_earth"'
        );

        // Rewrite basePath values to flat prefix format
        // "/textures/planet_seq" -> "textures_planet_seq"
        content = content.replace(
          /basePath:\s*["']\/textures\/planet_seq["']/g,
          'basePath:"textures_planet_seq"'
        );
        content = content.replace(
          /basePath:\s*["']\/textures["']/g,
          'basePath:"textures"'
        );

        // Now fix the concatenation pattern: `${path}/filename.png` becomes `${path}_filename.png`
        // This handles template literals like `${ts.mineralsPath}/rocks_coal.png`
        // After the above rewrites, mineralsPath is "textures_minerals_earth"
        // So `${mineralsPath}/rocks_coal.png` should become `${mineralsPath}_rocks_coal.png`
        // We replace the pattern: }/ with }_  (inside template literals for paths)
        content = content.replace(
          /(\$\{[^}]+mineralsPath\})\/rocks_/g,
          '$1_rocks_'
        );
        content = content.replace(
          /(\$\{[^}]+basePath\})\/planet_seq_/g,
          '$1_planet_seq_'
        );

        // Rewrite all texture/model paths from subdirectories to flat names
        // The source code uses paths like "/textures/rocks.png" passed to loadTexture()
        // These need to be rewritten to flat names like "textures_rocks.png"
        for (const [originalPath, flatName] of pathMapping) {
          // originalPath is like "/textures/rocks.png"
          // Replace both with and without leading slash
          const pathWithSlash = originalPath; // "/textures/rocks.png"
          const pathWithoutSlash = originalPath.slice(1); // "textures/rocks.png"

          // Escape special regex characters
          const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // Replace "/textures/rocks.png" -> "textures_rocks.png"
          content = content.replace(new RegExp(`"${escape(pathWithSlash)}"`, 'g'), `"${flatName}"`);
          content = content.replace(new RegExp(`'${escape(pathWithSlash)}'`, 'g'), `'${flatName}'`);

          // Also replace "textures/rocks.png" (without leading slash) -> "textures_rocks.png"
          content = content.replace(new RegExp(`"${escape(pathWithoutSlash)}"`, 'g'), `"${flatName}"`);
          content = content.replace(new RegExp(`'${escape(pathWithoutSlash)}'`, 'g'), `'${flatName}'`);
        }

        writeFileSync(jsPath, content);
      }

      // Update index.html
      const indexPath = join(outDir, 'index.html');
      if (existsSync(indexPath)) {
        let html = readFileSync(indexPath, 'utf-8');
        html = html.replace(/assets\//g, '');
        // Rewrite wiki link to external URL for itch.io build
        html = html.replace(
          /href="wiki\.html"/g,
          'href="https://heavyphoton.com/tenebris/wiki.html"'
        );
        writeFileSync(indexPath, html);
      }
    }
  };
}

// Itch.io build config - uses relative paths for deployment
// Based on: https://github.com/Fennec-hub/three-vite-itch
export default defineConfig({
  base: '',  // Empty string for relative paths on itch.io
  plugins: [
    glsl(),
    copyPublicFlat(['.aseprite', '.blend', '.blend1']),  // Flatten all assets, exclude source files
    flattenAll()  // Rewrite JS to use flat paths
  ],
  server: {
    port: 3000,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist-itch',
    sourcemap: false,
    copyPublicDir: false,  // Disable default public dir copy, use our plugin instead
    rollupOptions: {
      output: {
        // Put all JS files in root instead of assets/ folder
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]'
      }
    }
  },
  publicDir: 'public'
});
