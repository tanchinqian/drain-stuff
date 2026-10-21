import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Richards refinement checks legitimately take more than the default five seconds.
    testTimeout: 30000,
  },
});
