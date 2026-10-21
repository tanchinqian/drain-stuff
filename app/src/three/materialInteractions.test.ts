import { test, expect } from 'vitest';
import { wetFinish, mulchLift, damDischarge, sockDarkening } from './materialInteractions';
import { wetAlbedo } from './soilMaterial';
import { featureConfig } from '../simulation/physics/config';
import { buildSurfaceGrid } from './surfaceScene';
import { advanceSurface } from './surfaceWater';
test('paving and asphalt get darker and smoother when wet', () => {
  expect(wetFinish(1).roughness).toBeLessThan(wetFinish(0).roughness);
  expect(wetFinish(1).albedo).toBeLessThan(wetFinish(0).albedo);
  expect(wetFinish(3)).toEqual(wetFinish(1));
});
test('retained mulch wetness produces a film finish; only selected chips float at high depth', () => {
  expect(wetFinish(0.7).roughness).toBeLessThan(wetFinish(0).roughness);
  expect(mulchLift(0.04, 0.99)).toBe(0);
  expect(mulchLift(0.2, 0.5)).toBe(0);
  expect(mulchLift(0.2, 0.99)).toBeCloseTo(0.209);
});
test('media, sand, gravel and geotextile darken with their sampled saturation', () => {
  for (const dry of [0.4, 0.6, 0.8]) expect(wetAlbedo(dry, 0.9)).toBeLessThan(wetAlbedo(dry, 0.2));
});
test('sock shading follows clog and wetness; dam spill needs positive head above crest and tailwater', () => {
  expect(sockDarkening(0.8, 0.8)).toBeLessThan(sockDarkening(0, 0.1));
  expect(damDischarge(0.1, 0, 0.12, 3)).toBe(0);
  expect(damDischarge(0.2, 0.25, 0.12, 3)).toBe(0);
  expect(damDischarge(0.2, 0.08, 0.12, 3)).toBeGreaterThan(0);
});
test('only installed obstacles enter the terrain; a restricted sock raises upstream storage', () => {
  const c = featureConfig('S1');
  c.values.sockOpen.value = 0.1;
  const g = buildSurfaceGrid(c, 64, 32);
  let state = new Float32Array(g.nx * g.nz * 4);
  const source = new Float32Array(state.length);
  const pick = (x: number) =>
    (Math.floor((0 - g.z0) / g.dz) * g.nx + Math.floor((x - g.x0) / g.dx)) * 4;
  const sock = -c.values.length.value / 2 + 0.8;
  for (let i = 0; i < state.length; i += 4) {
    if (g.terrain[i + 2] === 1) state[i] = Math.max(0, 0.05 - g.terrain[i]);
    if (g.terrain[i + 3] === 1) source[i] = 0.003;
  }
  for (let i = 0; i < 300; i++) state = advanceSurface(g, state, 0.02, source).state;
  const up = pick(sock - 0.3),
    down = pick(sock + 0.3);
  expect(state[up] + g.terrain[up]).toBeGreaterThan(state[down] + g.terrain[down]);
  const s2 = buildSurfaceGrid(featureConfig('S2'), 64, 32);
  expect(
    Array.from(s2.terrain)
      .filter((_, i) => i % 4 === 1)
      .some((n) => n > 0.14),
  ).toBe(false);
});
