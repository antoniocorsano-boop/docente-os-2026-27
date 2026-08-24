import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './e2e/experience',
  testMatch: '**/*.spec.mjs',
  globalSetup: './e2e/experience/global-setup.mjs',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/experience', open: 'never' }],
  ],
  outputDir: 'test-results/experience/playwright-artifacts',
  use: {
    baseURL,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-412x915',
      use: {
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop-1440x1000',
      use: {
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      },
    },
  ],
})
