import { expect, test } from 'vitest';
import { featureConfig } from './config';
import { RichardsGrid, textures, hydraulic } from './richards';
import { wetAlbedo } from '../../three/soilMaterial';
import { rainCount, seepageCount } from '../../three/WaterEffects';
import { simulatePhysics } from './engine';

test('mixed-form grid conserves supplied ponded water', () => {
  const grid = new RichardsGrid(featureConfig('S1'), 12, 16);
  let input = 0,
    output = 0,
    error = 0;
  for (let t = 0; t < 600; t += 5) {
    const f = grid.step(5, 0.1, 2, 0);
    input += f.infiltration;
    output += f.bottom + f.drain + f.et;
    error += Math.abs(f.residual);
  }
  console.log({ input, output, storage: grid.storage, error });
  expect(Math.abs(grid.storage + output - input) / input).toBeLessThan(1e-4);
  expect(grid.frame().saturation.every((s) => s >= 0 && s <= 1)).toBe(true);
});

test('van Genuchten texture has consistent wet limits', () => {
  expect(textures.sandyLoam.alpha).toBe(7.5);
});
test('rain and seepage effects are absent at zero and scale with their engine quantities', () => {
  for (const low of [false, true]) {
    expect(rainCount(0, low)).toBe(0);
    expect(seepageCount(0, low)).toBe(0);
    expect(rainCount(20 / 3.6e6, low)).toBeLessThan(rainCount(60 / 3.6e6, low));
    expect(seepageCount(0.00001, low)).toBeLessThan(seepageCount(0.0001, low));
  }
});

test('coupled full storm closes its ledger', () => {
  const run = simulatePhysics(featureConfig('S1'));
  const maxError = Math.max(...run.frames.map((f) => f.relativeError));
  console.log({ ms: run.computeMs, maxError, last: run.frames.at(-1)?.cumulative });
  expect(maxError).toBeLessThan(1e-6);
  expect(run.computeMs).toBeLessThan(5000);
}, 60000);

test('uniform ponded grid converges and obeys infiltration bounds', () => {
  const c = featureConfig('S1');
  c.values.et.value = 0;
  const soil = { ...textures.sandyLoam };
  const run = (nx: number, nz: number, ks = soil.ks) => {
    const grid = new RichardsGrid(c, nx, nz, { ...soil, ks });
    let infiltration = 0,
      lastFront = 0;
    for (let t = 0; t < 600; t += 5) {
      infiltration += grid.step(5, 0.1, 100, 0).infiltration;
      const field = grid.frame();
      let front = 0;
      for (let z = 0; z < field.nz; z++)
        if (field.saturation[z * field.nx] > 0.5) front = (z + 0.5) * field.dz;
      expect(front).toBeGreaterThanOrEqual(lastFront);
      lastFront = front;
    }
    return infiltration / (c.values.width.value * c.values.length.value);
  };
  const coarse = run(24, 32),
    fine = run(48, 64),
    fast = run(24, 32, soil.ks * 2);
  const deltaTheta = soil.saturated - hydraulic(-3, soil).theta;
  const suctionStorage = (0.1 + 1 / soil.alpha) * deltaTheta;
  let lo = soil.ks * 600,
    hi = 1;
  for (let iteration = 0; iteration < 60; iteration++) {
    const f = (lo + hi) / 2;
    if (f - suctionStorage * Math.log(1 + f / suctionStorage) < soil.ks * 600) lo = f;
    else hi = f;
  }
  const greenAmptUpper = hi;
  console.log({
    coarse,
    fine,
    convergence: Math.abs(coarse - fine) / fine,
    lower: soil.ks * 600,
    greenAmptUpper,
    fast,
  });
  expect(Math.abs(coarse - fine) / fine).toBeLessThan(0.05);
  expect(fine).toBeGreaterThanOrEqual(soil.ks * 600);
  expect(fine).toBeLessThanOrEqual(greenAmptUpper);
  expect(fast).toBeGreaterThan(coarse);
});

test('sampled wet albedo decreases with saturation', () => {
  let previous = 1;
  for (let s = 0; s <= 1; s += 0.01) {
    const albedo = wetAlbedo(1, s);
    expect(albedo).toBeLessThanOrEqual(previous);
    previous = albedo;
  }
  expect(wetAlbedo(1, 1)).toBe(0.5);
});

test('asymmetric initial moisture uses the lateral 2D stencil', () => {
  const grid = new RichardsGrid(featureConfig('S1'), 8, 12);
  grid.h[4] = -0.4;
  grid.theta[4] = hydraulic(grid.h[4], grid.soils[4]).theta;
  grid.initial[4] = grid.theta[4];
  const leftBefore = grid.theta[3];
  const step = grid.step(0.5, 0, 0, 0);
  expect(grid.theta[3]).toBeGreaterThan(leftBefore);
  expect(grid.frame().theta).toHaveLength(96);
  expect(Math.abs(step.residual)).toBeLessThan(1e-7);
});
