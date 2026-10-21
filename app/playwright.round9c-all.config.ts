import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testIgnore: 'round9c-evidence.spec.ts',
  reporter: [['list'], ['json', { outputFile: 'test-results/round9c-all.json' }]],
  webServer: [
    {
      command: 'node ../scripts/test-server.mjs',
      url: 'http://127.0.0.1:8091/health',
      reuseExistingServer: false,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5191 --strictPort',
      url: 'http://127.0.0.1:5191',
      reuseExistingServer: false,
      env: { VITE_API_BASE: '', VITE_DATA_SOURCE: 'mock' },
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5192 --strictPort',
      url: 'http://127.0.0.1:5192',
      reuseExistingServer: false,
      env: {
        VITE_API_BASE: '/api/v1',
        VITE_DATA_SOURCE: 'api',
        DEV_API_TARGET: 'http://127.0.0.1:8091',
      },
    },
  ],
});
