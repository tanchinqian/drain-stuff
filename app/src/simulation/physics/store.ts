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
import type { TriageRow } from '../../../../shared/src/contract';
export const featureIds = ['S1', 'S2', 'S3', 'I1', 'R1', 'T1', 'T2'] as const;
interface SimulationState {
  replay: { jobId: string; asset: string; mode: string; preserveClock?: boolean } | null;
  loadReplay: (config: PhysicsConfig, jobId: string, mode: string) => void;
  loadBoardReplay: (rows: TriageRow[], jobId: string) => void;
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
  replay: null,
  loadBoardReplay: (rows, jobId) => {
    const state = get();
    if (state.replay?.jobId === jobId || !rows.length) return;
    const configs = structuredClone(state.configs);
    const weather = rows[0].asInstalled.config.values;
    for (const config of Object.values(configs))
      for (const key of ['peak', 'duration', 'recovery'] as const)
        config.values[key] = { ...weather[key] };
    for (const row of rows) configs[row.asset] = structuredClone(row.asInstalled.config);
    set({ ...restart, configs, revision: state.revision + 1,
      pattern: 'alternating-block', drawn: [], scenario: 'Normal',
      speed: state.replay ? state.speed : 60,
      manualKs: { ...state.manualKs, ...Object.fromEntries(rows.map((row) => [row.asset, true])) },
      replay: { jobId, asset: 'board', mode: 'installed', preserveClock: true },
    });
  },
  loadReplay: (config, jobId, mode) => {
    const state = get();
    const sameStorm = state.replay?.jobId === jobId;
    if (sameStorm && JSON.stringify(state.configs[config.id]) === JSON.stringify(config)) {
      set({ replay: { jobId, asset: config.id, mode, preserveClock: true }, busy: !state.runs[config.id], error: null });
      return;
    }
    const configs = structuredClone(state.configs);
    for (const c of Object.values(configs))
      for (const k of ['peak', 'duration', 'recovery'] as const)
        c.values[k] = { ...config.values[k] };
    configs[config.id] = structuredClone(config);
    set((s) => ({
      ...restart,
      second: sameStorm ? state.second : 0,
      playing: sameStorm ? state.playing : false,
      configs,
      revision: s.revision + 1,
      pattern: 'alternating-block',
      drawn: [],
      scenario: 'Normal',
      manualKs: { ...s.manualKs, [config.id]: true },
      replay: { jobId, asset: config.id, mode, preserveClock: sameStorm },
    }));
  },
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
    if (
      [
        'length',
        'width',
        'crest',
        'mediaDepth',
        'transitionDepth',
        'gravelDepth',
        'pipeDiameter',
      ].includes(key)
    ) {
      configs[id].dimensionRecord = { user: 'Demo visitor', at: new Date().toISOString() };
    }
    if (key === 'ks') configs[id].sampleCount = n;
    set((s) => ({
      ...restart,
      replay: null,
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
    set((s) => ({ ...restart, replay: null, configs, revision: s.revision + 1 }));
  },
  setPattern: (pattern, drawn = []) =>
    set((s) => ({ ...restart, replay: null, pattern, drawn, revision: s.revision + 1 })),
  setScenario: (scenario) =>
    set((s) => ({ ...restart, replay: null, scenario, revision: s.revision + 1 })),
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
