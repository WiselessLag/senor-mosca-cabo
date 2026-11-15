import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: { cabildo: resolve('index.html'), bahia: resolve('3d/index.html') } } },
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8765' } }
})
