import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // This file runs before Vite reads client/.env, so process.env doesn't
  // have its values yet: load them here. '' = every name, not only VITE_ ones.
  const env = loadEnv(mode, process.cwd(), '')
  // Must match PORT in server/.env (Express uses 3000 when it isn't set)
  const backendPort = env.BACKEND_PROXY_PORT || 3000

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // In dev, Vite serves the React app and passes /api on to Express,
      // so the browser sees one origin, the same as in production.
      proxy: {
        '/api': `http://localhost:${backendPort}`,
      },
    },
  }
})
