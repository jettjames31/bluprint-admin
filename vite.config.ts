import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Tauri expects a fixed dev port and a relative base so the bundled assets
// load from the app's file:// origin. `clearScreen: false` keeps Rust logs
// visible during `tauri dev`.
export default defineConfig({
  plugins: [react()],
  base: './',
  clearScreen: false,
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
