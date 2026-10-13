import { describe, it, expect } from 'vitest';
import { simulateStorm, stormAssumptions } from './storm';
describe('illustrative storm water balance', () => {
  it('conserves water, bounds storage, and stops runoff after rainfall', () => {
    for (const blockage of [0, 50, 100]) {
      const frames = simulateStorm({ rain: 120, duration: 120, blockage });
      for (const f of frames) {
        expect(f.ponding).toBeGreaterThanOrEqual(0);
        expect(f.ponding).toBeLessThanOrEqual(250);
        expect(f.media).toBeLessThanOrEqual(stormAssumptions.mediaCapacity);
        expect(f.input).toBeCloseTo(
          (f.ponding / 1000) * 18 + f.media + f.overflow + f.discharged,
          9,
        );
      }
      expect(frames[121].runoff).toBe(0);
    }
  });
  it('blockage increases retained water and zero rainfall leaves the bed dry', () => {
    const clear = simulateStorm({ rain: 60, duration: 45, blockage: 0 });
    const blocked = simulateStorm({ rain: 60, duration: 45, blockage: 100 });
    expect(blocked[180].ponding - clear[180].ponding).toBeGreaterThan(30);
    expect(blocked[100].outlet).toBe(0);
    expect(
      simulateStorm({ rain: 0, duration: 45, blockage: 0 }).every(
        (f) => f.input === 0 && f.ponding === 0,
      ),
    ).toBe(true);
  });
});

