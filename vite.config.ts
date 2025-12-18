import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // State management
          'vendor-zustand': ['zustand'],
          // Charting library
          'vendor-charts': ['lightweight-charts'],
          // UI animations
          'vendor-framer': ['framer-motion'],
          // Database
          'vendor-dexie': ['dexie'],
          // ML/AI (largest chunk)
          'vendor-ml': ['@xenova/transformers']
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  server: {
    port: 5174
  }
})
