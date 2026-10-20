import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/cloud/experiment': { target: 'http://127.0.0.1:4101', changeOrigin: true },
      '/api/cloud/observability': { target: 'http://127.0.0.1:4100', changeOrigin: true },
      '/api/cloud/snapshot': { target: 'http://127.0.0.1:4100', changeOrigin: true },
    },
  },
})
