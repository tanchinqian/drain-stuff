import type { StormCalculator } from '../../../shared/src/offlineApi';

export const calculateStorm: StormCalculator = (input, faults, trials, onProgress) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./storm-worker.ts', import.meta.url), { type: 'module' });
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    const timeout = window.setTimeout(() => {
      finish();
      reject(new Error('Storm calculation timed out. Try a shorter storm or turn off the sensitivity check.'));
    }, 180000);
    worker.onmessage = ({ data }) => {
      if (data.progress) onProgress?.(data.progress);
      else {
        finish();
        if (data.error) reject(new Error(data.error));
        else resolve(data.result);
      }
    };
    worker.onerror = () => {
      finish();
      reject(new Error('The storm worker could not start. Reload and try again.'));
    };
    try { worker.postMessage({ input, faults, trials }); }
    catch (error) { finish(); reject(error); }
  });
