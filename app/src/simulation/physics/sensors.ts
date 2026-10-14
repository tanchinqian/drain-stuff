import type { Sensor } from '../../api/types';
import type { PhysicsFrame } from './engine';
import type { PhysicsConfig } from './config';
import type { CompostFrame } from './compost';
export type InputDriver = 'hydraulic' | 'thermal' | 'human/seeded';
export function inputDriver(s: Sensor): InputDriver {
  if (
    /Manual|Visual|checklist|scale|stock|Soil temperature/i.test(s.type) ||
    /INF-P|POND-DURATION|VIS-|MANUAL|INTAKE|BULKING/.test(s.sensorId)
  )
    return 'human/seeded';
  if (s.scope === 'compost' && /TEMP-|MOIST|SUMP|AIR|CURING/.test(s.sensorId)) return 'thermal';
  if (/INLET|OUTLET|MOIST-|POND$|RISER|WELL|RAIN/.test(s.sensorId)) return 'hydraulic';
  return 'human/seeded';
}
function noise(id: string, second: number) {
  let hash = 2166136261;
  for (const ch of `${id}:${second}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return ((hash >>> 0) / 4294967295) * 2 - 1;
}
export interface VirtualInput {
  sensor: Sensor;
  driver: InputDriver;
  second: number;
  physicalValue: number | null;
  distanceFromMountM?: number;
  provenance: string;
}
// Returns an overlay. Never writes through to history, human inputs or the seed DB.
export function virtualInput(
  s: Sensor,
  frame: PhysicsFrame,
  c: PhysicsConfig,
  thermal?: CompostFrame,
): VirtualInput {
  const driver = inputDriver(s),
    v = c.values;
  const unchanged = (provenance: string): VirtualInput => ({
    sensor: { ...s },
    driver,
    second: frame.second,
    physicalValue: null,
    provenance,
  });
  if (driver === 'human/seeded')
    return unchanged('seeded record or human observation; not simulated');
  if (s.status === 'offline')
    return unchanged(`offline; last known record at ${s.lastAt}; no fabricated replacement`);
  if (s.ownerId !== c.id && !s.sensorId.endsWith('RAIN'))
    return unchanged('seeded record; no matching owner model supplied');
  let value: number | undefined, distance: number | undefined;
  if (driver === 'thermal') {
    if (!thermal) return unchanged('seeded record; no thermal run supplied');
    value = s.sensorId.endsWith('AIR')
      ? v.ambient.value
      : s.sensorId.endsWith('MOIST')
        ? thermal.moisture * 100
        : s.sensorId.endsWith('SUMP')
          ? thermal.sump * 100
          : s.sensorId.endsWith('TEMP-50')
            ? thermal.core
            : thermal.surface;
  } else if (s.sensorId.includes('RAIN')) value = frame.rainTenMinuteMm;
  else if (s.sensorId.includes('MOIST-')) value = frame.moisture * 100;
  else {
    const level = s.sensorId.endsWith('INLET')
      ? (frame.network.find((n) => n.id === 'kerb flow')?.depth ?? 0)
      : /OUTLET|WELL/.test(s.sensorId)
        ? frame.gravelHead
        : frame.ponding;
    value = level * 100;
    distance = Math.max(0, v.mountHeight.value - level);
  }
  const isLevel = s.unit === 'cm';
  const bias = isLevel
    ? (v.sensorBias.value +
        frame.second * v.sensorDrift.value +
        noise(s.sensorId, frame.second) * v.sensorNoise.value) *
      100
    : 0;
  const drift = v.sensorBias.value !== 0 || v.sensorDrift.value !== 0;
  return {
    sensor: {
      ...s,
      lastValue: Math.max(0, value + bias),
      lastText: undefined,
      lastAt: new Date(Date.parse('2026-10-12T00:00:00Z') + frame.second * 1000).toISOString(),
      status: drift && isLevel ? 'suspect' : s.status,
      drift: drift && isLevel ? 'confirmed' : s.drift,
    },
    driver,
    second: frame.second,
    physicalValue: value,
    distanceFromMountM: distance,
    provenance: 'live reduced-order model; seeded noise; placeholder calibration',
  };
}
