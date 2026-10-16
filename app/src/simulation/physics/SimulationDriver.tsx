import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { testMean } from '../../utils';
import { featureIds, runConfig, useSimulation } from './store';
import { peakFrame, type PhysicsRun } from './engine';
export default function SimulationDriver() {
  const { pathname } = useLocation(),
    active =
      pathname.startsWith('/feature/') ||
      pathname === '/observations' ||
      pathname.startsWith('/batches/');
  const trials = useQuery({ queryKey: ['simulation-trials'], queryFn: api.trials });
  const ready = !trials.isPending;
  useEffect(() => {
    if (!trials.data) return;
    const state = useSimulation.getState(),
      configs = structuredClone(state.configs);
    let changed = false;
    trials.data.forEach((t) => {
      const mean = testMean(t.tests, 'retest') ?? testMean(t.tests, 'baseline'),
        c = configs[t.featureId];
      if (
        mean &&
        c &&
        !state.manualKs[t.featureId] &&
        (Math.abs(c.values.ks.value - mean.value / 3.6e6) > 1e-12 ||
          c.sampleCount !== mean.n ||
          c.values.ks.source !== 'trial-record')
      ) {
        c.values.ks = { ...c.values.ks, value: mean.value / 3.6e6, source: 'trial-record' };
        c.sampleCount = mean.n;
        changed = true;
      }
    });
    if (changed)
      useSimulation.setState({
        configs,
        revision: state.revision + 1,
        runs: {},
        busy: true,
        playing: false,
        error: null,
      });
  }, [trials.data]);
  const revision = useSimulation((s) => s.revision),
    playing = useSimulation((s) => s.playing),
    speed = useSimulation((s) => s.speed);
  useEffect(() => {
    if (!ready || !active) return;
    const state = useSimulation.getState(),
      results: Record<string, PhysicsRun> = {};
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const fail = (error: string) => useSimulation.setState({ error, busy: false, playing: false });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      fail('The model took too long. Try a shorter storm or retry.');
    }, 180000);
    worker.onerror = () => {
      clearTimeout(timeout);
      fail('The simulation worker could not start. Retry the model.');
    };
    worker.onmessage = (
      event: MessageEvent<{ id: number; ok: boolean; result?: PhysicsRun; error?: string }>,
    ) => {
      if (!event.data.ok) {
        clearTimeout(timeout);
        worker.terminate();
        fail(event.data.error ?? 'Model calculation failed');
        return;
      }
      const id = featureIds[event.data.id];
      if (!id || !event.data.result) return;
      results[id] = event.data.result;
      if (Object.keys(results).length === featureIds.length) {
        clearTimeout(timeout);
        const peak = peakFrame(results.S1);
        useSimulation.setState({
          runs: results,
          busy: false,
          error: null,
          second: state.second === 0 ? peak.second : state.second,
        });
        worker.terminate();
      }
    };
    featureIds.forEach((id, index) =>
      worker.postMessage({
        id: index,
        kind: 'hydraulic',
        config: runConfig(state.configs[id], state.scenario),
        pattern: state.pattern,
        drawn: state.drawn,
      }),
    );
    return () => {
      clearTimeout(timeout);
      worker.terminate();
    };
  }, [revision, ready, active]);
  useEffect(() => {
    if (!playing || !active) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) {
      useSimulation.setState({ playing: false });
      return;
    }
    const stop = () => {
      if (motion.matches) useSimulation.setState({ playing: false });
    };
    motion.addEventListener('change', stop);
    const timer = window.setInterval(() => {
      const s = useSimulation.getState(),
        end = s.configs.S1.values.duration.value + s.configs.S1.values.recovery.value;
      const second = Math.min(end, s.second + speed / 4);
      useSimulation.setState({ second, playing: second < end });
    }, 250);
    return () => {
      clearInterval(timer);
      motion.removeEventListener('change', stop);
    };
  }, [playing, speed, active]);
  return null;
}
