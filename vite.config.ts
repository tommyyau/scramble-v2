import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      // Externalize MediaPipe - these packages are pre-minified and break when
      // Rollup re-bundles them. Load from CDN via script tags in index.html instead.
      external: ['@mediapipe/face_mesh', '@mediapipe/camera_utils'],
    },
  },
})
