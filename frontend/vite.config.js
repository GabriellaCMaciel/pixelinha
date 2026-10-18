import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow the address GitHub Codespaces gives to a forwarded port.
    allowedHosts: ['.app.github.dev'],
    // In development the API runs on its own port; the proxy avoids CORS setup.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
