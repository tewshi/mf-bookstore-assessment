import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, Vite serves the React app and passes /api on to Express,
    // so the browser sees one origin, the same as in production.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
