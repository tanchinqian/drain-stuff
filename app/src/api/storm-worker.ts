import { runStorm } from '../../../shared/src/physics/triage';
import type { StormInput } from '../../../shared/src/contract';
import type { Fault, TrialDetail } from './types';

self.onmessage = ({ data }: MessageEvent<{ input: StormInput; faults: Fault[]; trials: TrialDetail[] }>) => {
  try {
    const result = runStorm(data.input, data.faults, data.trials,
      (progress) => self.postMessage({ progress }));
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Storm calculation failed' });
  }
};
