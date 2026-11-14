import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: Number(process.env.QA_WORKERS || 2),
  timeout: 30000,
  expect: { timeout: 5000 },
  outputDir: 'reports/playwright-artifacts',
  reporter: [
    ['list'],
    ['./tests/reporters/evidence-reporter.mjs'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['junit', { outputFile: 'reports/playwright-junit.xml' }],
  ],
  use: {
    baseURL: process.env.QA_BASE_URL || 'http://127.0.0.1:5180',
    trace: 'on',
    screenshot: { mode: 'on', fullPage: true },
    video: 'on',
  },
  webServer: process.env.QA_BASE_URL
    ? undefined
    : {
        command: 'npm run dev:qa',
        url: 'http://127.0.0.1:5180',
        reuseExistingServer: false,
        timeout: 30000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'android-web', use: { ...devices['Pixel 7'], channel: 'chromium' } },
    { name: 'ios-web', use: { ...devices['iPhone 14'] } },
  ],
});
