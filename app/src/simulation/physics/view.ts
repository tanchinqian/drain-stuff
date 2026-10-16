import { useMemo } from 'react';
import type { Fault, PartId, Sensor, ZoneId } from '../../api/types';
import { frameAt, runConfig, useSimulation } from './store';
import { virtualInput } from './sensors';
import type { PhysicsConfig } from './config';
import type { PhysicsFrame } from './engine';
import {sensorMountPosition} from '../../../../shared/src/iot';
export type ModelSensor = Sensor & { modelSource?: string };
export function usePhysics(id: string) {
  const run = useSimulation((s) => s.runs[id]),
    base = useSimulation((s) => s.configs[id]),
    scenario = useSimulation((s) => s.scenario),
    second = useSimulation((s) => s.second);
  const config = useMemo(
    () => run?.config ?? (base ? runConfig(base, scenario) : undefined),
    [run, base, scenario],
  );
  return { run, config, frame: frameAt(run, second) };
}
export function positionSensor(s: Sensor, c: PhysicsConfig): Sensor {
  if(s.deviceId) return {...s,location:sensorMountPosition(c,s.partId,s.mountHeightM??c.values.mountHeight.value)};
  const v = c.values,
    l = v.length.value,
    base = -v.mediaDepth.value - v.transitionDepth.value - v.gravelDepth.value - 0.05;
  const positions: Partial<Record<PartId, [number, number, number]>> = {
    inlet: [-l / 2 - 0.4, 0.35, 0],
    pretreat: [-l / 2 + 0.3, 0.1, 0.4],
    outfall: [l / 2 + 0.8, base + v.gravelDepth.value / 2, 0],
    ponding: [0, v.mountHeight.value, 0],
    overflow: [l / 2 - 0.5, v.crest.value, -v.width.value / 3],
    cleanout: [l / 2 - 0.35, 0.35, 0],
    media: [0, -0.05 - (s.sensorId.includes('-30') ? 0.3 : 0.1), 0],
  };
  const p = positions[s.partId];
  return p ? { ...s, location: { x: p[0], y: p[1], z: p[2] } } : s;
}
export function useLiveSensors(sensors: Sensor[]): ModelSensor[] {
  const runs = useSimulation((s) => s.runs),
    second = useSimulation((s) => s.second);
  return useMemo(
    () =>
      sensors.map((s) => {
        const run = runs[s.ownerId] ?? (s.sensorId.endsWith('RAIN') ? runs.S1 : undefined),
          f = frameAt(run, second);
        if (!run || !f) return { ...s, modelSource: 'Seeded record / human input' };
        const reading = virtualInput(positionSensor(s, run.config), f, run.config);
        return {
          ...reading.sensor,
          modelSource:
            reading.physicalValue === null
              ? 'Seeded record / human input'
              : `Live model · minute ${Math.floor(second / 60)}`,
        };
      }),
    [sensors, runs, second],
  );
}
export function modelFaults(
  c: PhysicsConfig,
  f: PhysicsFrame | undefined,
  sensors: Sensor[],
  zone: ZoneId,
): Fault[] {
  if (!f) return [];
  const faults: Fault[] = [],
    v = c.values,
    depth = f.network.find((n) => n.id === 'kerb flow')?.depth ?? 0;
  const emit = (partId: PartId, type: Fault['type'], reason: string) => {
    const linked = sensors.filter((s) => s.linkedPartIds.includes(partId));
    faults.push({
      synthetic: true,
      id: `SIM-${c.id}-${partId}`,
      featureId: c.id,
      partId,
      type,
      ruleId: 'Live model capacity check',
      sensorIds: linked.map((s) => s.sensorId),
      sensorStatusesAtAlert: Object.fromEntries(linked.map((s) => [s.sensorId, s.status])),
      diagnosingInput: reason,
      severity: 2,
      openedAt: new Date(Date.parse('2026-10-12T00:00:00Z') + f.second * 1000).toISOString(),
      status: 'open',
      zone,
    });
  };
  if (depth > 0.02 && v.inletOpen.value < 0.5)
    emit(
      'inlet',
      'blockage',
      `Kerb level ${(depth * 100).toFixed(1)} cm > 2 cm; inlet open fraction ${(v.inletOpen.value * 100).toFixed(0)}% < 50%. Capacity rule.`,
    );
  if (depth > 0.02 && v.sockOpen.value < 0.5 && c.id === 'S1')
    emit(
      'sock',
      'blockage',
      `Kerb level ${(depth * 100).toFixed(1)} cm > 2 cm; sock open fraction ${(v.sockOpen.value * 100).toFixed(0)}% < 50%. Capacity rule.`,
    );
  if (f.flux.overflow > 1e-8)
    emit(
      'overflow',
      'standing_water',
      `Stage ${(f.ponding * 1000).toFixed(1)} mm exceeds crest ${(v.crest.value * 1000).toFixed(0)} mm; overflow ${(f.flux.overflow * 60000).toFixed(2)} L/min. This is an overflow event, not a duration diagnosis.`,
    );
  if (v.drainC.value < 0.0001 && f.gravelHead > v.drainOffset.value)
    emit(
      'underdrain',
      'blockage',
      `Gravel head ${(f.gravelHead * 1000).toFixed(1)} mm exceeds drain offset ${(v.drainOffset.value * 1000).toFixed(0)} mm; entered drain coefficient ${v.drainC.value}. Silted-drain scenario, capacity rule.`,
    );
  for (const s of sensors)
    if (s.status !== 'ok' && !faults.some((x) => x.partId === s.partId))
      emit(
        s.partId,
        s.status === 'offline' ? 'sensor_offline' : 'sensor_suspect',
        `${s.sensorId}: ${s.status}; drift ${s.drift}. Sensor trust does not alter hydraulic storage.`,
      );
  return faults;
}
