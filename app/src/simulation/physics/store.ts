import { create } from 'zustand';
import {
  featureConfig,
  withScenario,
  type ParameterKey,
  type PhysicsConfig,
  type Scenario,
} from './config';
import type { PhysicsFrame, PhysicsRun } from './engine';
import type { Pattern, RainPoint } from './rainfall';
export const featureIds = ['S1', 'S2', 'S3', 'I1', 'T1', 'T2'] as const;
interface SimulationState {
  manualKs: Record<string, boolean>;
  configs: Record<string, PhysicsConfig>;
  runs: Record<string, PhysicsRun>;
  revision: number;
  second: number;
  playing: boolean;
  speed: number;
  pattern: Pattern;
  drawn: RainPoint[];
  scenario: Scenario;
  busy: boolean;
  error: string | null;
  seek: (second: number) => void;
  play: () => void;
  setSpeed: (speed: number) => void;
  parameter: (
    id: string,
    key: ParameterKey,
    value: number,
    source?: 'placeholder' | 'trial-record',
    n?: number,
  ) => void;
  weather: (key: 'peak' | 'duration' | 'tailwater', value: number) => void;
  setPattern: (pattern: Pattern, drawn?: RainPoint[]) => void;
  setScenario: (scenario: Scenario) => void;
  retry: () => void;
}
const restart = { second: 0, playing: false, busy: true, error: null, runs: {} };
export const useSimulation = create<SimulationState>((set, get) => ({
  manualKs: {},
  configs: Object.fromEntries(featureIds.map((id) => [id, featureConfig(id)])),
  runs: {},
  revision: 0,
  second: 0,
  playing: false,
  speed: 60,
  pattern: 'alternating-block',
  drawn: [],
  scenario: 'Normal',
  busy: true,
  error: null,
  seek: (second) =>
    set({
      second: Math.max(
        0,
        Math.min(
          second,
          get().configs.S1.values.duration.value + get().configs.S1.values.recovery.value,
        ),
      ),
      playing: false,
    }),
  play: () =>
    set((s) => ({
      playing: !s.playing,
      second:
        s.second >= s.configs.S1.values.duration.value + s.configs.S1.values.recovery.value
          ? 0
          : s.second,
    })),
  setSpeed: (speed) => {
    if ([30, 60, 300, 600].includes(speed)) set({ speed });
  },
  parameter: (id, key, value, source = 'placeholder', n = 0) => {
    if (!Number.isFinite(value) || value < 0 || !get().configs[id]) return;
    const configs = structuredClone(get().configs);
    if (key === 'recovery')
      for (const c of Object.values(configs)) c.values[key] = { ...c.values[key], value, source };
    else configs[id].values[key] = { ...configs[id].values[key], value, source };
    if (key === 'ks') configs[id].sampleCount = n;
    set((s) => ({
      ...restart,
      configs,
      manualKs: key === 'ks' ? { ...s.manualKs, [id]: source !== 'trial-record' } : s.manualKs,
      revision: s.revision + 1,
    }));
  },
  weather: (key, value) => {
    if (!Number.isFinite(value) || value < 0) return;
    const configs = structuredClone(get().configs);
    for (const c of Object.values(configs))
      c.values[key] = { ...c.values[key], value, source: 'placeholder' };
    set((s) => ({ ...restart, configs, revision: s.revision + 1 }));
  },
  setPattern: (pattern, drawn = []) =>
    set((s) => ({ ...restart, pattern, drawn, revision: s.revision + 1 })),
  setScenario: (scenario) => set((s) => ({ ...restart, scenario, revision: s.revision + 1 })),
  retry: () => set((s) => ({ ...restart, revision: s.revision + 1 })),
}));
export function frameAt(run: PhysicsRun | undefined, second: number): PhysicsFrame | undefined {
  if (!run) return;
  let lo = 0,
    hi = run.frames.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (run.frames[mid].second <= second) lo = mid;
    else hi = mid - 1;
  }
  return run.frames[lo];
}
export function runConfig(config: PhysicsConfig, scenario: Scenario) {
  return withScenario(
    config,
    scenario === 'Clogged sock' && config.id !== 'S1' ? 'Normal' : scenario,
  );
}
