import { test, expect } from 'vitest';
import { featureConfig } from '../simulation/physics/config';
import type { PhysicsFrame, PhysicsRun } from '../simulation/physics/engine';
import { drainDesign } from '../simulation/physics/design';
import { cutNormal, cutRange, cutSample, flowVisual, stageTotals } from './sceneMetrics';
import { rainCount } from './WaterEffects';
import { depositAmount } from './FaultDeposits';
const config = featureConfig('S1'),
  d = drainDesign(config);
const frame = {
  second: 60,
  ponding: 0.08,
  pipeFill: 0.32,
  flux: { inlet: 0.001 },
  cell: { surface: 0.04, pipe: 0.002 },
  cumulative: { treated: 0.03, outlet: 0.02, overflow: 0.01 },
  soil: {
    nx: 2,
    nz: 2,
    width: 2,
    depth: 1,
    dz: 0.5,
    dx: 1,
    saturation: new Float32Array([0.2, 0.8, 0.1, 0.6]),
  },
} as PhysicsFrame;
test('flow width and motion use discharge and velocity, including exact zero', () => {
  expect(flowVisual(0, 2)).toEqual({ active: false, width: 0, speed: 0 });
  const a = flowVisual(0.001, 0.2),
    b = flowVisual(0.002, 0.4);
  expect(b.width).toBeCloseTo(a.width * 2);
  expect(b.speed).toBeCloseTo(a.speed * 2);
});
test('rain is absent at zero and quality changes density without changing physics', () => {
  expect(rainCount(0)).toBe(0);
  const rain = 50 / 3.6e6;
  expect(rainCount(rain)).toBeGreaterThan(1000);
  expect(rainCount(rain, true)).toBeLessThan(rainCount(rain));
  expect(rainCount(rain, false, true)).toBeGreaterThan(rainCount(rain));
});
test('all cut axes map to actual design bounds and the same solver sample', () => {
  expect(cutNormal('X')).toEqual([0, 0, -1]);
  expect(cutNormal('Y')).toEqual([-1, 0, 0]);
  expect(cutNormal('Z')).toEqual([0, -1, 0]);
  expect(cutRange(d, 'X')).toEqual([-d.topWidth / 2, d.topWidth / 2]);
  expect(cutRange(d, 'Y')).toEqual([-d.length / 2, d.length / 2]);
  expect(cutRange(d, 'Z')[0]).toBeCloseTo(d.bottomY - d.nativeDepth);
  expect(cutSample(config, frame, 'X', -0.5, 0.1).saturation).toBeCloseTo(0.2);
  expect(cutSample(config, frame, 'Y', 0, 0.1, 0.5).saturation).toBeCloseTo(0.8);
  expect(cutSample(config, frame, 'X', 3, 0.1).saturation).toBeNull();
  expect(cutSample(config, frame, 'X', 0).waterDepth).toBe(0.08);
  expect(cutSample(config, frame, 'X', 0).pipeFill).toBe(0.32);
});
test('stage totals retain exact ledger quantities and label sampled inlet integration separately', () => {
  const a = { ...frame, second: 0, flux: { ...frame.flux, inlet: 0 } },
    run = { frames: [a, frame] } as PhysicsRun;
  const totals = stageTotals(run, frame);
  expect(totals.inlet).toBeCloseTo(30);
  expect(totals.pond).toBe(40);
  expect(totals.soil).toBe(30);
  expect(totals.underdrain).toBeCloseTo(22);
  expect(totals.outfall).toBe(20);
  expect(totals.overflow).toBe(10);
});
test('deposits require a confirmed restriction and disappear for cleared or sensor-only cases', () => {
  const c = featureConfig('S1');
  c.values.inletOpen.value = 0.1;
  c.values.sockOpen.value = 0.15;
  c.values.drainC.value *= 0.2;
  expect(depositAmount(c, 'inlet', false)).toBe(0);
  expect(depositAmount(c, 'inlet', true)).toBeCloseTo(0.9);
  expect(depositAmount(c, 'sock', true)).toBeCloseTo(0.85);
  expect(depositAmount(c, 'underdrain', true)).toBeCloseTo(0.8);
  expect(depositAmount(featureConfig('S1'), 'inlet', true)).toBe(0);
  expect(depositAmount(c, 'media', true)).toBe(0);
});

test('cut readouts distinguish air, sediment and water without extrapolating the solver', () => {
  expect(cutSample(config, frame, 'X', 3, 0.1).front).toBeNull();
  expect(cutSample(config, frame, 'Z', 0.2).saturation).toBeNull();
  const inlet = featureConfig('I1');
  inlet.values.sediment.value = 0.02;
  expect(cutSample(inlet, frame, 'Z', 0.01).layer).toBe('Sediment');
  expect(cutSample(inlet, frame, 'Z', 0.04).layer).toBe('Chamber water');
  expect(cutSample(inlet, frame, 'Z', 0.2).layer).toBe('Chamber air');
  expect(cutSample(inlet, frame, 'Z', 0.01).saturation).toBeNull();
});
