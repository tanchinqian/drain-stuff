import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests', testMatch: 'round9c.spec.ts', workers: 1, retries: 0,
  reporter: [['list'], ['json', {outputFile: 'test-results/round9c.json'}]],
  use: {baseURL: 'http://127.0.0.1:5193', viewport: {width: 1440, height: 1000},
    launchOptions: {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: process.platform === 'win32' ? ['--use-angle=d3d11'] : ['--enable-unsafe-swiftshader']}},
  webServer: {command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5193 --strictPort',
    url: 'http://127.0.0.1:5193', reuseExistingServer: false,
    env: {VITE_API_BASE: '', VITE_DATA_SOURCE: 'mock'}},
});
