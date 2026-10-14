import { useEffect } from 'react';
import { featureIds, runConfig, useSimulation } from './store';
import type { PhysicsRun } from './engine';
export default function SimulationDriver() {
  const revision = useSimulation((s) => s.revision),
    playing = useSimulation((s) => s.playing),
    speed = useSimulation((s) => s.speed);
  useEffect(() => {
    const state = useSimulation.getState(),
      results: Record<string, PhysicsRun> = {};
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const fail = (error: string) => useSimulation.setState({ error, busy: false, playing: false });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      fail('The model took too long. Try a shorter storm or retry.');
    }, 45000);
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
        useSimulation.setState({ runs: results, busy: false, error: null });
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
  }, [revision]);
  useEffect(() => {
    if (!playing) return;
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
  }, [playing, speed]);
  return null;
}
