import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Heavy charting library — loaded only on analytics/statements routes
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          // Google Maps — loaded only on map-enabled screens
          if (id.includes('@react-google-maps')) return 'vendor-maps';
          // Core React runtime — tiny, always needed, cache forever
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
        },
      },
    },
  },
})
