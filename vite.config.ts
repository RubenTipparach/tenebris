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

export default defineConfig({
  plugins: [
    glsl(),
    copyPublicExclude(['.aseprite'])
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    copyPublicDir: false  // Disable default public dir copy, use our plugin instead
  },
  publicDir: 'public'
});
