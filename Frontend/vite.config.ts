import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor'
            if (id.includes('@tanstack/react-query')) return 'query-vendor'
            if (id.includes('axios')) return 'http-vendor'
            if (id.includes('lucide-react')) return 'icons-vendor'
            return undefined
          }

          if (id.includes('/src/pages/restaurant/')) return 'restaurant-pages'
          if (id.includes('/src/pages/warehouse/')) return 'warehouse-pages'
          if (id.includes('/src/pages/admin/')) return 'admin-pages'
          if (id.includes('/src/pages/shared/')) return 'shared-pages'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
