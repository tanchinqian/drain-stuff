import type { PhysicsRun } from "./engine";
export interface QuantityRecord {
  owner: string;
  quantity: string;
  second: number;
  value: number;
  unit: string;
  provenance: "engine" | "seeded record" | "human";
}
// Compare only the same quantity/time/provenance. Historical logs are not current engine measurements.
export function contradictions(records: QuantityRecord[]): string[] {
  const seen = new Map<string, number>(),
    errors: string[] = [];
  for (const r of records) {
    const key = [r.owner, r.quantity, r.second, r.unit, r.provenance].join("|");
    if (!Number.isFinite(r.value)) errors.push(`Nonfinite ${key}`);
    if (seen.has(key) && Math.abs(seen.get(key)! - r.value) > 1e-9)
      errors.push(`Conflicting ${key}`);
    seen.set(key, r.value);
  }
  return errors;
}
export function frameRecords(run: PhysicsRun, index: number): QuantityRecord[] {
  const f = run.frames[index];
  if (!f) throw new Error("Frame out of range");
  return [
    ["ponding", f.ponding, "m"],
    ["moisture", f.moisture, "m3/m3"],
    ["rain", f.rain, "m/s"],
    ["outlet", f.flux.drain, "m3/s"],
  ].map(([quantity, value, unit]) => ({
    owner: run.config.id,
    quantity: String(quantity),
    value: Number(value),
    unit: String(unit),
    second: f.second,
    provenance: "engine",
  }));
}
export function drainDown(run: PhysicsRun) {
  const end = run.config.values.duration.value;
  const wet = run.frames.filter((f) => f.second >= end && f.ponding > 0.001);
  if (!wet.length) return { hours: 0, censored: false };
  const last = wet.at(-1)!;
  return {
    hours: (last.second - end) / 3600,
    censored: last.second === run.frames.at(-1)!.second,
  };
}
