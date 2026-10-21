import { test, expect } from 'vitest';
import { featureConfig } from '../simulation/physics/config';
import { drainDesign } from '../simulation/physics/design';
import type { PhysicsFrame } from '../simulation/physics/engine';
import {
  roofRunoffPath,
  roofDischarge,
  ballisticPoint,
  flightTime,
  outfallJet,
  outfallPose,
  saturatedColumns,
} from './flowPhysics';
test('roof conveyance joins each component within two millimetres', () => {
  for (const id of ['S1', 'R1']) {
    const d = drainDesign(featureConfig(id)),
      path = roofRunoffPath(d);
    expect(path.map((p) => p.name)).toContain('Covered crossing');
    for (let i = 1; i < path.length; i++)
      expect(Math.hypot(...path[i].start.map((v, j) => v - path[i - 1].end[j]))).toBeLessThan(
        0.002,
      );
  }
});
test('roof flow is the engine link and absent with zero roof area', () => {
  const f = { links: [{ id: 'roof outlet to downpipe', discharge: 0.00025 }] } as PhysicsFrame;
  expect(roofDischarge(drainDesign(featureConfig('S1')), f)).toBe(0.00025);
  expect(roofDischarge(drainDesign(featureConfig('R1')), f)).toBe(0);
  expect(
    roofDischarge(drainDesign(featureConfig('S1')), { links: [] } as unknown as PhysicsFrame),
  ).toBe(0);
});
test('exit trajectory uses velocity and gravity, and lands at the prescribed elevation', () => {
  const t = flightTime(0.25),
    p = ballisticPoint([1, 0.5, 0], 2, t);
  expect(p[0]).toBeCloseTo(1 + 2 * t, 12);
  expect(p[1]).toBeCloseTo(0.25, 12);
});
test('outfall joins the physical pipe, shuts off at zero, and has no submerged jet', () => {
  for (const id of ['S1', 'R1']) {
    const c = featureConfig(id),
      d = drainDesign(c),
      f = { pipeFill: 0.5, pipeVelocity: 1, flux: { outfall: 0.001 } } as PhysicsFrame;
    c.values.tailwater.value = c.values.outfallInvert.value;
    expect(outfallJet(d, c, f).active).toBe(true);
    expect(outfallJet(d, c, f).start[0]).toBe(outfallPose(d, c).x);
    expect(outfallJet(d, c, { ...f, flux: { ...f.flux, outfall: 0 } }).active).toBe(false);
    c.values.tailwater.value = c.values.outfallInvert.value + d.pipeDiameter;
    expect(outfallJet(d, c, f).active).toBe(false);
  }
});
test('pore streaks require both a wet gravel column and positive drain flux', () => {
  const d = drainDesign(featureConfig('S1'));
  const f = {
    flux: { drain: 0.001 },
    soil: { nx: 2, nz: 2, dz: 0.5, saturation: new Float32Array([0.95, 0.95, 0.4, 0.9]) },
  } as PhysicsFrame;
  expect(saturatedColumns(d, f)).toEqual([1]);
  expect(saturatedColumns(d, { ...f, flux: { ...f.flux, drain: 0 } })).toEqual([]);
});
