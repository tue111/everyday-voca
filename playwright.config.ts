import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 120000, expect: { timeout: 10000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5180', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev', url: 'http://127.0.0.1:5180', reuseExistingServer: false,
    env: { APP_MODE: 'test', PORT: '5180', API_PORT: '3002', DATA_FILE: '.test-data/e2e-' + Date.now() + '.json', FIXED_NOW: '2026-09-24T03:00:00Z', APP_URL: 'http://127.0.0.1:5180' },
    timeout: 60000,
  },
});

