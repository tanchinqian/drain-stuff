import type { Fault } from "../api/types";
import { featureConfig, type PhysicsConfig, type ParameterKey } from "./config";
export const faultEffects = {
  blockedInlet: { key: "inletOpen", value: 0.1, upkeep: true },
  cloggedSock: { key: "sockOpen", value: 0.15, upkeep: true },
  siltedDrain: { key: "drainC", multiplier: 0.2, upkeep: true },
  depositedSediment: { key: "sediment", value: 0.1, upkeep: true },
  damagedOutlet: { key: "drainC", multiplier: 0.6, upkeep: false },
} as const;
export function boardConfig(id: string): PhysicsConfig {
  const config = featureConfig(id);
  config.values.surfaceLimit.value = 0.15;
  // Illustrative catchments entered for the demo; no surveyed network dimensions are implied.
  if (id === 'S1') { config.values.roofArea.value = 200; config.values.pavedArea.value = 100; config.values.surfaceLimit.value = 0.05; }
  if (id === 'S2') { config.values.roofArea.value = 1000; config.values.pavedArea.value = 500; }
  if (id === "R1") {
    config.id = id;
    // Typical concrete channel: equivalent circular hydraulic capacity, not surveyed box flow.
    for (const [key, value] of Object.entries({
      length: 8,
      width: 0.6,
      crest: 0.45,
      pipeDiameter: 0.3,
      pipeLength: 8,
      pavedArea: 100,
      roofArea: 0,
      lawnArea: 0,
    }))
      config.values[key as ParameterKey].value = value;
  }
  return config;
}
export function confirmed(f: Fault) {
  return (
    ["confirmed", "assigned"].includes(f.workOrder?.state ?? "detected") &&
    f.status !== "closed"
  );
}
export function effectFor(f: Fault) {
  if (f.type === "sensor_suspect" || f.type === "sensor_offline") return;
  if (f.type === "blockage")
    return f.partId === "sock"
      ? faultEffects.cloggedSock
      : faultEffects.blockedInlet;
  if (f.type === "sediment")
    return f.partId === "underdrain" || f.partId === "drainage"
      ? faultEffects.siltedDrain
      : faultEffects.depositedSediment;
  if (f.type === "joint_leak") return faultEffects.damagedOutlet;
}
export function faultConfig(
  base: PhysicsConfig,
  faults: Fault[],
  mode: "installed" | "cleared" | "capacity",
  preview = false,
) {
  const config = structuredClone(base);
  for (const fault of faults) {
    if (
      mode === "capacity" ||
      fault.featureId !== base.id ||
      (!confirmed(fault) && !(preview && fault.workOrder?.state === "detected"))
    )
      continue;
    const effect = effectFor(fault);
    if (!effect || (mode === "cleared" && effect.upkeep)) continue;
    const p = config.values[effect.key];
    p.value =
      "value" in effect
        ? Math.min(p.value || effect.value, effect.value)
        : p.value * effect.multiplier;
    if (effect.key === "sediment")
      p.value = Math.max(base.values.sediment.value, effect.value);
  }
  return config;
}
