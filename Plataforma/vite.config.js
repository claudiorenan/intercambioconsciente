import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Vite plugin to copy non-module JS files and static assets to dist/.
 * The app uses classic <script> tags (not ES modules), so Vite cannot
 * bundle them. This plugin copies them as-is after the build.
 */
function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');

      // Copy JS files (classic scripts, not ES modules)
      cpSync(resolve(__dirname, 'js'), resolve(dist, 'js'), { recursive: true });

      // Copy other static assets needed at runtime
      const files = ['sw.js', 'offline.html', 'manifest.json'];
      for (const file of files) {
        const src = resolve(__dirname, file);
        if (existsSync(src)) {
          cpSync(src, resolve(dist, file));
        }
      }

      // Copy icons directory
      const iconsDir = resolve(__dirname, 'icons');
      if (existsSync(iconsDir)) {
        cpSync(iconsDir, resolve(dist, 'icons'), { recursive: true });
      }

      console.log('  \u2713 Static assets copied to dist/');
    }
  };
}

export default defineConfig({
  root: '.',
  base: './',

  plugins: [copyStaticAssets()],

  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
    assetsInlineLimit: 0,
    sourcemap: false,
  },

  server: {
    port: 3000,
    open: true,
  },

  preview: {
    port: 4173,
  },

  // Vitest config
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['js/**/*.js'],
      exclude: ['js/app.js', 'js/psi-data.json'],
    },
  },
});
