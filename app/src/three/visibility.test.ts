import { describe, expect, it } from 'vitest';
import { drainDesign } from '../simulation/physics/design';
import { featureConfig } from '../simulation/physics/config';
import { flowSpeed, frontDepth, placeLabels, rainBounds, rainColour } from './visibility';
import { rainCount } from './WaterEffects';
describe('Round 7 visibility', () => {
  it('keeps neutral rain outside the feature and removes it at zero intensity', () => {
    const d = drainDesign(featureConfig('S1')),
      b = rainBounds(d);
    expect(b.width).toBeGreaterThanOrEqual(d.topWidth * 5);
    expect(b.length).toBeGreaterThan(d.length);
    const rgb = rainColour.match(/[a-f0-9]{2}/g)!.map((c) => parseInt(c, 16));
    expect(Math.max(...rgb) - Math.min(...rgb)).toBeLessThan(20);
    expect(rainCount(0)).toBe(0);
  });
  it('uses entered catchment areas, not inferred runoff', () => {
    for (const id of ['S1', 'S2', 'S3', 'I1', 'T1', 'T2']) {
      const c = featureConfig(id),
        d = drainDesign(c);
      expect(d.catchment.roofArea).toBe(c.values.roofArea.value);
      expect(d.catchment.pavedArea).toBe(c.values.pavedArea.value);
    }
  });
  it('has zero flow speed at zero and proportional speed', () => {
    expect(flowSpeed(0)).toBe(0);
    expect(flowSpeed(0.002)).toBe(flowSpeed(0.001) * 2);
    expect(frontDepth(undefined, 0.6)).toBe(0);
  });
  it('limits labels to three non-overlapping rectangles, including narrow windows', () => {
    for (const width of [300, 600, 1000]) {
      const labels = placeLabels(
        Array.from({ length: 6 }, (_, i) => ({ id: '' + i, text: 'Fault', x: width / 2, y: 220 })),
        width,
        500,
      );
      expect(labels).toHaveLength(3);
      for (let i = 0; i < labels.length; i++)
        for (let j = i + 1; j < labels.length; j++) {
          const a = labels[i],
            b = labels[j];
          expect(
            a.left + a.width <= b.left ||
              b.left + b.width <= a.left ||
              a.top + a.height <= b.top ||
              b.top + b.height <= a.top,
          ).toBe(true);
        }
    }
  });
});
