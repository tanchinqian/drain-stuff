import { simulatePhysics, type PhysicsRun } from "./engine";
import { boardConfig, faultConfig, confirmed } from "./faults";
import {
  stormPresets,
  type StormInput,
  type ModeResult,
  type StormResult,
  type TriageRow,
  type StormProgress,
} from "../contract";
import { testMean } from "../trialMetrics";
import type { TrialDetail } from "../api/types";
import type { Fault } from "../api/types";
const label = "Relative ranking, not a prediction" as const;
export function result(run: PhysicsRun): ModeResult {
  const limit = run.config.values.crest.value;
  let hoursAboveLimit = 0;
  for (let i = 1; i < run.frames.length; i++)
    if (run.frames[i].ponding > limit || (run.config.values.surfaceLimit.value > 0 && run.frames[i].network.some(n => ['property drain','kerb flow','gully inlet'].includes(n.id) && n.depth >= run.config.values.surfaceLimit.value - 1e-9)))
      hoursAboveLimit +=
        (run.frames[i].second - run.frames[i - 1].second) / 3600;
  return {
    config: run.config,
    summary: {
      peakPondingM: Math.max(...run.frames.map((f) => Math.max(f.ponding,...f.network.filter(n=>['property drain','kerb flow','gully inlet'].includes(n.id)).map(n=>n.depth)))),
      hoursAboveLimit,
      overflowM3: run.frames.at(-1)!.cumulative.overflow,
      maxRelativeError: Math.max(...run.frames.map((f) => f.relativeError)),
    },
    timeline: run.frames.map((f) => ({
      second: f.second,
      ponding: f.ponding,
      inlet: f.flux.inlet,
      outfall: f.flux.outfall,
      overflow: f.flux.overflow,
      pipeFill: f.pipeFill,
      gravelHead: f.gravelHead,
    })),
  };
}
export const sortRows = (rows: TriageRow[]) =>
  rows
    .sort(
      (a, b) =>
        b.asInstalled.summary.overflowM3 - a.asInstalled.summary.overflowM3 ||
        b.asInstalled.summary.hoursAboveLimit -
          a.asInstalled.summary.hoursAboveLimit ||
        a.asset.localeCompare(b.asset),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
export function runStorm(
  input: StormInput,
  faults: Fault[],
  trials: TrialDetail[] = [],
  onProgress?: (progress: StormProgress) => void,
): StormResult {
  const total = input.assets.length * (input.options.robustness ? 9 : 3);
  let completed = 0;
  const cache = new Map<string, ModeResult>();
  const calculate = (config: PhysicsRun["config"], current: Omit<StormProgress, "completed" | "total">) => {
    onProgress?.({ ...current, completed, total });
    const key = JSON.stringify(config);
    let value = cache.get(key);
    if (!value) {
      value = result(simulatePhysics(config, undefined, undefined, false));
      cache.set(key, value);
    }
    onProgress?.({ ...current, completed: ++completed, total });
    return value;
  };
  const storm = input.custom ?? stormPresets[input.preset!];
  const rows = input.assets.map((asset): TriageRow => {
    const base = boardConfig(asset);
    const trial = trials.find((t) => t.featureId === asset);
    const mean = trial
      ? (testMean(trial.tests, "retest") ?? testMean(trial.tests, "baseline"))
      : null;
    if (mean && base.kind !== "inlet") {
      base.values.ks = {
        ...base.values.ks,
        value: mean.value / 3.6e6,
        source: "trial-record",
      };
      base.sampleCount = mean.n;
    }
    base.values.peak.value = storm.peakMmHr / 3.6e6;
    base.values.duration.value = storm.durationMinutes * 60;
    base.values.recovery.value = input.options.recoveryMinutes * 60;
    const modes = (["installed", "cleared", "capacity"] as const).map((mode) =>
      calculate(
        faultConfig(base, faults, mode, input.options.previewUnconfirmed),
        { asset, mode, phase: "comparison" },
      ),
    );
    return {
      asset,
      rank: 0,
      asInstalled: modes[0],
      ifCleared: modes[1],
      capacityLimit: modes[2],
      capacityLimited: modes[1].summary.overflowM3 > 1e-8,
      faultIds: faults
        .filter((f) => f.featureId === asset && confirmed(f))
        .map((f) => f.id),
      unconfirmedFaultIds: faults
        .filter(
          (f) => f.featureId === asset && f.workOrder?.state === "detected",
        )
        .map((f) => f.id),
      label,
    };
  });
  const sorted = sortRows(rows);
  const orders: StormResult["robustness"]["orders"] = [];
  if (input.options.robustness)
    for (const parameter of ["ks", "drainC", "peak"] as const)
      for (const multiplier of [0.75, 1.25]) {
        const varied = rows.map((row) => {
          const config = structuredClone(row.asInstalled.config);
          config.values[parameter].value *= multiplier;
          // Outfall capacity sensitivity includes the circular Manning limit as well as drain conductance.
          if (parameter === "drainC")
            config.values.manningN.value /= multiplier;
          return { ...row, asInstalled: calculate(config, {
            asset: row.asset, mode: "installed", phase: "sensitivity", parameter, multiplier,
          }) };
        });
        orders.push({
          parameter,
          multiplier,
          assets: sortRows(varied).map((r) => r.asset),
        });
      }
  return {
    rows: sorted,
    robustness: {
      evaluated: input.options.robustness,
      stable: input.options.robustness
        ? orders.every(
            (o) => o.assets.join() === sorted.map((r) => r.asset).join(),
          )
        : null,
      orders,
    },
  };
}
