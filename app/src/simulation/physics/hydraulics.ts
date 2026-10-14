export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export function circularSection(diameter: number, filling: number) {
  const angle = 2 * Math.acos(1 - 2 * clamp(filling, 0, 1));
  const area = (diameter ** 2 * (angle - Math.sin(angle))) / 8;
  const perimeter = (diameter * angle) / 2;
  return { area, radius: perimeter > 0 ? area / perimeter : 0 };
}
export function manning(diameter: number, filling: number, slope: number, n: number) {
  if (diameter <= 0 || n <= 0 || slope < 0) throw new Error('Invalid Manning geometry');
  const { area, radius } = circularSection(diameter, filling);
  return (area * radius ** (2 / 3) * Math.sqrt(slope)) / n;
}
export const weir = (coefficient: number, length: number, head: number) =>
  coefficient * length * Math.max(0, head) ** 1.5;
export const orifice = (coefficient: number, area: number, head: number, g = 9.81) =>
  coefficient * area * Math.sqrt(2 * g * Math.max(0, head));
export const rational = (c: number, intensityMmH: number, areaM2: number) =>
  (c * intensityMmH * areaM2) / 3.6e6;
export const stageVolume = (h: number, length: number, width: number, side: number) =>
  length * (width * h + side * h * h);
export function volumeStage(volume: number, length: number, width: number, side: number) {
  return side === 0
    ? volume / (length * width)
    : (2 * volume) / length / (Math.sqrt(width * width + (4 * side * volume) / length) + width);
}
export const tailwaterFactor = (upstreamHead: number, tailwaterHead: number) =>
  upstreamHead > 0 ? clamp((upstreamHead - tailwaterHead) / upstreamHead, 0, 1) : 0;
