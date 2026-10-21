import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { testMean } from '../../utils';
import { featureIds, runConfig, useSimulation } from './store';
import { peakFrame, type PhysicsRun } from './engine';
export default function SimulationDriver() {
  const { pathname: routePath } = useLocation();
  // Match the router's tolerance for repeated and trailing slashes.
  const pathname = routePath.replace(/\/+/g, '/').replace(/\/$/, '') || '/',
    active =
      pathname.startsWith('/feature/') ||
      pathname === '/observations' ||
      pathname.startsWith('/batches/');
  const playbackActive = active || pathname === '/';
  const trials = useQuery({ queryKey: ['simulation-trials'], queryFn: api.trials });
  const ready = !trials.isPending;
  useEffect(() => {
    if (!trials.data) return;
    if (useSimulation.getState().replay) return;
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
    const ids = pathname.startsWith('/feature/')
      ? featureIds.filter((id) => id === pathname.split('/')[2]) : [...featureIds];
    const state = useSimulation.getState(),
      results: Record<string, PhysicsRun> = { ...state.runs };
    const needed = ids.filter((id) => !results[id]);
    if (!needed.length) {
      useSimulation.setState({ busy: false });
      return;
    }
    useSimulation.setState({ busy: true, error: null });
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
      if (needed.every((id) => results[id])) {
        clearTimeout(timeout);
        const current = useSimulation.getState();
        const peak = peakFrame(results[ids[0]]);
        useSimulation.setState({
          runs: results,
          busy: false,
          error: null,
          second: !current.replay?.preserveClock && current.second === 0 ? peak.second : current.second,
          replay: current.replay ? { ...current.replay, preserveClock: true } : null,
        });
        worker.terminate();
      }
    };
    needed.forEach((id) =>
      worker.postMessage({
        id: featureIds.indexOf(id),
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
  }, [revision, ready, active, pathname]);
  useEffect(() => {
    if (!playing || !playbackActive) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) {
      useSimulation.setState({ playing: false });
      return;
    }
    const stop = () => {
      if (motion.matches) useSimulation.setState({ playing: false });
    };
    motion.addEventListener('change', stop);
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(), elapsed = (now - last) / 1000;
      last = now;
      const s = useSimulation.getState(),
        end = s.configs.S1.values.duration.value + s.configs.S1.values.recovery.value;
      if (document.hidden || (s.busy && pathname !== '/')) return;
      const candidate = s.second + speed * elapsed;
      const rainEnd = s.configs.S1.values.duration.value;
      const pauseForRecovery = pathname === '/' && s.second < rainEnd && candidate >= rainEnd;
      const second = pauseForRecovery ? rainEnd : Math.min(end, candidate);
      useSimulation.setState({ second, playing: !pauseForRecovery && second < end });
    }, 100);
    return () => {
      clearInterval(timer);
      motion.removeEventListener('change', stop);
    };
  }, [playing, speed, playbackActive, pathname]);
  return null;
}
