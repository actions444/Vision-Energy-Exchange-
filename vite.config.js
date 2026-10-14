import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` -> normal multi-file build in dist/ (deploy to any static host)
// `npm run build:single` -> one self-contained HTML file in dist-single/ (used for the Claude artifact preview)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 6000,
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
  },
}))
