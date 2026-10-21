import { test, expect } from '@playwright/test';
import { featureConfig } from '../src/simulation/physics/config';

test('physics worker runs independently and returns a balanced deterministic result', async ({
  page,
}) => {
  await page.goto('/');
  const config = featureConfig('S1');
  config.values.recovery.value = 600;
  const result = await page.evaluate(
    (config) =>
      new Promise<{ ok: boolean; error: number; frames: number }>((resolve, reject) => {
        const worker = new Worker('/src/simulation/physics/worker.ts', { type: 'module' });
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Worker timeout'));
        }, 20000);
        worker.onerror = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(event.message));
        };
        worker.onmessage = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          if (!event.data.ok) return reject(new Error(event.data.error));
          const frames = event.data.result.frames;
          resolve({
            ok: event.data.ok,
            error: frames[frames.length - 1].relativeError,
            frames: frames.length,
          });
        };
        worker.postMessage({ id: 1, kind: 'hydraulic', config, pattern: 'uniform' });
      }),
    config,
  );
  expect(result.ok).toBe(true);
  expect(result.error).toBeLessThan(1e-6);
  expect(result.frames).toBe((config.values.duration.value + config.values.recovery.value) / 60 + 1);
});
