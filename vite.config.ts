import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'

// Build identity baked into the bundle + published as dist/version.json. The
// dashboard's Updates page fetches the deployed version.json and compares its
// buildId to the running __BUILD_ID__ to tell founders when a refresh will pull
// a newer build (GitHub Pages auto-deploys on every push).
function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'local'
  }
}
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'))
const BUILD_ID = gitSha()
const BUILT_AT = new Date().toISOString()
const APP_VERSION: string = pkg.version ?? '0.0.0'

// Tauri expects a fixed dev port and a relative base so the bundled assets
// load from the app's file:// origin. `clearScreen: false` keeps Rust logs
// visible during `tauri dev`.
export default defineConfig({
  plugins: [
    react(),
    {
      // Emit dist/version.json after the bundle is written (build only).
      name: 'emit-version-json',
      apply: 'build',
      closeBundle() {
        writeFileSync(
          path.resolve(__dirname, 'dist/version.json'),
          JSON.stringify({ buildId: BUILD_ID, builtAt: BUILT_AT, version: APP_VERSION }),
        )
      },
    },
  ],
  base: './',
  clearScreen: false,
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILT_AT__: JSON.stringify(BUILT_AT),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true,
  },
})
