import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev --workspace planner-frontend -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    cwd: workspaceRoot,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
