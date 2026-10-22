import { forecastImpact } from '../../../shared/src/forecastImpact';
import type { ForecastPeriod } from '../../../shared/src/forecast';
import type { Fault, TrialDetail } from './types';
self.onmessage = ({
  data,
}: MessageEvent<{ period: ForecastPeriod; faults: Fault[]; trials: TrialDetail[] }>) => {
  try {
    self.postMessage({ impacts: forecastImpact(data.period, data.faults, data.trials) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Impact calculation failed',
    });
  }
};
