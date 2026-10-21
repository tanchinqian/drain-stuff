import { defineConfig } from '@playwright/test';
process.env.ROUND8_APP_URL ??= 'http://127.0.0.1:5192';
process.env.STAGE_A_APP_URL ??= 'http://127.0.0.1:5192';
export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/round8b-results.json' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5191',
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: process.platform === 'win32' ? ['--use-angle=d3d11'] : ['--enable-unsafe-swiftshader'],
    },
  },
  webServer: [
    {command: 'node ../scripts/test-server.mjs', url: 'http://127.0.0.1:8091/health', reuseExistingServer: false},
    {command: 'npm run dev -- --port 5191 --strictPort', url: 'http://127.0.0.1:5191', reuseExistingServer: false,
      env: {VITE_API_BASE: '', VITE_DATA_SOURCE: 'mock'}},
    {command: 'npm run dev -- --port 5192 --strictPort', url: 'http://127.0.0.1:5192', reuseExistingServer: false,
      env: {VITE_API_BASE: '/api/v1', VITE_DATA_SOURCE: 'api', DEV_API_TARGET: 'http://127.0.0.1:8091'}},
  ],
});
