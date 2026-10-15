import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The lazily loaded 3D viewport chunk bundles Three.js (~940 kB minified, ~250 kB gzip).
    // It is fetched only when the viewer mounts, so the initial page stays small.
    chunkSizeWarningLimit: 1000,
  },
})
