import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// HMR_PORT is set by the Locable control plane to the *host*-side port
// that the browser actually sees (the Docker -p mapping translates it to
// the in-container port). Without this, HMR tries to connect to the
// in-container port and fails.
const HMR_PORT = process.env.HMR_PORT ? Number(process.env.HMR_PORT) : undefined

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // usePolling is required so file changes via Docker bind mounts on macOS
    // (gRPC FUSE / VirtioFS) are detected by Vite's watcher.
    watch: { usePolling: true, interval: 300 },
    hmr: HMR_PORT ? { host: 'localhost', clientPort: HMR_PORT } : true,
  },
})
