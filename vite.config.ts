import { defineConfig, Plugin } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve, join } from 'path';
import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin to copy public directory while excluding certain file types
function copyPublicExclude(excludePatterns: string[]): Plugin {
  return {
    name: 'copy-public-exclude',
    writeBundle(options) {
      const publicDir = resolve(__dirname, 'public');
      const outDir = options.dir || resolve(__dirname, 'dist');

      function copyDir(srcDir: string, destDir: string) {
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }

        const entries = readdirSync(srcDir);
        for (const entry of entries) {
          const srcPath = join(srcDir, entry);
          const destPath = join(destDir, entry);
          const stat = statSync(srcPath);

          // Check if file matches any exclude pattern
          const shouldExclude = excludePatterns.some(pattern => entry.endsWith(pattern));

          if (stat.isDirectory()) {
            copyDir(srcPath, destPath);
          } else if (!shouldExclude) {
            copyFileSync(srcPath, destPath);
          }
        }
      }

      copyDir(publicDir, outDir);
    }
  };
}

// The TS/Three.js build is the "Stable" variant in the dual-build chooser.
// It now lives under /tenebris/js/ so the WASM preview can ship next to it
// at /tenebris/wasm/, with a landing page at /tenebris/ letting UAT pick.
export default defineConfig({
  base: '/tenebris/js/',
  plugins: [
    glsl(),
    copyPublicExclude(['.aseprite'])
  ],
  server: {
    port: 3000,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist/js',
    sourcemap: true,
    emptyOutDir: true,
    copyPublicDir: false
  },
  publicDir: 'public'
});
