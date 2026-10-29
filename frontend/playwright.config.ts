import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: '../backend/node_modules/.bin/tsx ../backend/src/index.ts',
      url: 'http://localhost:3001/event-types',
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
    {
      command: 'node_modules/.bin/vite',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
  ],
})
