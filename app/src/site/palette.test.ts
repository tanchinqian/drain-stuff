import { expect, it } from 'vitest';
import { radarStops } from './weather';
it('preserves the user-approved radar palette for this fix round', () => {
  expect(radarStops.map((s) => s.color.toLowerCase())).toEqual([
    '#61cce9',
    '#44bf65',
    '#b9df38',
    '#f3d431',
    '#f28b27',
    '#de452e',
    '#aa40b6',
  ]);
});
