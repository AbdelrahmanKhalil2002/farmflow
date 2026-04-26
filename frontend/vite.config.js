import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxies /api/* to the backend in development.
      // Eliminates cross-origin issues without changing api.js baseURL.
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      // Proxy uploaded images served as static files by the backend
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
