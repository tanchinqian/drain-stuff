import { useEffect, useState } from 'react';
import type { ForecastImpact, ForecastPeriod } from '../../../shared/src/forecast';
import type { Fault, TrialDetail } from './types';

export function useForecastImpact(
  period: ForecastPeriod | undefined,
  faults: Fault[] | undefined,
  trials: TrialDetail[] | undefined,
) {
  const [result, setResult] = useState<{
    period: ForecastPeriod;
    faults: Fault[];
    trials: TrialDetail[];
    impacts?: ForecastImpact[];
    error?: string;
  }>();
  useEffect(() => {
    if (!period || !faults || !trials) return;
    const worker = new Worker(new URL('./forecast-worker.ts', import.meta.url), { type: 'module' });
    const finish = (value: { impacts?: ForecastImpact[]; error?: string }) => {
      clearTimeout(timer);
      worker.terminate();
      setResult({ period, faults, trials, ...value });
    };
    const timer = window.setTimeout(
      () => finish({ error: 'Impact calculation timed out. Select another period to retry.' }),
      60000,
    );
    worker.onmessage = ({ data }) => finish(data);
    worker.onerror = () => finish({ error: 'Could not calculate the asset impact.' });
    worker.postMessage({ period, faults, trials });
    return () => {
      clearTimeout(timer);
      worker.terminate();
    };
  }, [period, faults, trials]);
  if (result && result.period === period && result.faults === faults && result.trials === trials)
    return result;
  return { impacts: undefined, error: undefined };
}
