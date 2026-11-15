import { defineConfig } from '@playwright/test'
import { resolve } from 'node:path'
const python = resolve(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python')
export default defineConfig({
  testDir: './tests', testMatch: '*.spec.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:8766', trace: 'retain-on-failure' },
  webServer: {
    command: `"${python}" -m uvicorn backend.api:app --host 127.0.0.1 --port 8766`,
    url: 'http://127.0.0.1:8766/api/bootstrap', reuseExistingServer: false,
    timeout: 30_000,
  },
})
