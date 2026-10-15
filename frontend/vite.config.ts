/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Backend слушает только 127.0.0.1 (локальный режим), поэтому адрес указан явно:
// `localhost` в Node может разрешиться в ::1 и не достучаться до сервера.
const backend = 'http://127.0.0.1:8081'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': backend,
      '/actuator': backend,
    },
  },
  test: {
    environment: 'node',
  },
})
