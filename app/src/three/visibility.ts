import type { MoistureField } from '../simulation/physics/richards';
import type { DrainDesign } from '../simulation/physics/design';
export const rainColour = '#899597';
export function rainBounds(d: DrainDesign) {
  return {
    length: d.length * 2.5 + 4,
    width: d.topWidth * 5,
    height: Math.max(4, d.depressionDepth * 12),
  };
}
export const flowSpeed = (q: number) => Math.max(0, q) / 0.005;
/** Deepest interpolated S=.5 crossing in media, not cumulative-volume inference. */
export function frontDepth(field: MoistureField | undefined, mediaDepth: number) {
  if (!field) return 0;
  let deepest = 0;
  for (let x = 0; x < field.nx; x++) {
    for (let z = 0; z < field.nz - 1 && (z + 0.5) * field.dz < mediaDepth; z++) {
      const a = field.saturation[z * field.nx + x],
        b = field.saturation[(z + 1) * field.nx + x];
      if (a >= 0.5 && b < 0.5)
        deepest = Math.max(deepest, (z + 0.5 + (a - 0.5) / (a - b)) * field.dz);
      else if (a >= 0.5) deepest = Math.max(deepest, (z + 0.5) * field.dz);
    }
  }
  return Math.min(mediaDepth, deepest);
}
export interface LabelPoint {
  id: string;
  text: string;
  x: number;
  y: number;
}
export function placeLabels(points: LabelPoint[], width: number, height: number) {
  const w = Math.min(196, width - 16),
    h = 38,
    used: { x: number; y: number }[] = [];
  return points.slice(0, 3).map((p, i) => {
    // Labels stay in the margins above/below the pond; leaders preserve the true anchor.
    let x = Math.max(8, Math.min(width - w - 8, p.x - w / 2));
    let y = i % 2 ? height - h - 12 : 12;
    let attempts = 0;
    while (
      attempts++ < 12 &&
      used.some((r) => Math.abs(r.x - x) < w + 8 && Math.abs(r.y - y) < h + 8)
    ) {
      y += h + 8;
      if (y > height - h - 8) {
        y = 12;
        x = x < width / 2 ? width - w - 8 : 8;
      }
    }
    used.push({ x, y });
    return { ...p, left: x, top: y, width: w, height: h };
  });
}
