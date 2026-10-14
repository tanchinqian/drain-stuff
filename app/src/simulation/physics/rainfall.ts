import type { PhysicsConfig } from './config';
export type Pattern = 'alternating-block' | 'uniform' | 'drawn';
export interface RainPoint {
  second: number;
  intensity: number;
}
export function hyetograph(
  c: PhysicsConfig,
  pattern: Pattern,
  drawn: RainPoint[] = [],
): RainPoint[] {
  const v = c.values,
    duration = v.duration.value,
    peak = v.peak.value;
  if (pattern === 'drawn') {
    if (
      drawn.length < 2 ||
      drawn[0].second !== 0 ||
      drawn.some(
        (p, i) =>
          !Number.isFinite(p.second) ||
          !Number.isFinite(p.intensity) ||
          p.intensity < 0 ||
          p.second < 0 ||
          p.second > duration ||
          (i > 0 && p.second <= drawn[i - 1].second),
      )
    )
      throw new Error(
        'Drawn rain requires ordered nonnegative points starting at zero within duration',
      );
    return [...drawn.filter((p) => p.second < duration), { second: duration, intensity: 0 }];
  }
  if (pattern === 'uniform')
    return [
      { second: 0, intensity: peak },
      { second: duration, intensity: 0 },
    ];
  const count = Math.max(1, Math.ceil(duration / 60)),
    block = duration / count;
  const depths = Array.from({ length: count }, (_, i) => {
    const minutes = ((i + 1) * block) / 60;
    return (
      (((v.idfA.value * v.returnPeriod.value ** v.idfB.value) /
        (minutes + v.idfC.value) ** v.idfD.value) *
        minutes) /
      60
    );
  });
  const increments = depths
    .map((d, i) => Math.max(0, d - (depths[i - 1] ?? 0)))
    .sort((a, b) => b - a);
  const order = [Math.floor((count - 1) / 2)];
  for (let distance = 1; order.length < count; distance++)
    for (const index of [order[0] + distance, order[0] - distance])
      if (index >= 0 && index < count) order.push(index);
  const rain = Array<number>(count).fill(0),
    max = increments[0] || 1;
  increments.forEach((d, i) => {
    rain[order[i]] = (peak * d) / max;
  });
  return [
    ...rain.map((intensity, i) => ({ second: i * block, intensity })),
    { second: duration, intensity: 0 },
  ];
}
export function intensityAt(points: RainPoint[], second: number) {
  for (let i = points.length - 1; i >= 0; i--)
    if (second >= points[i].second) return points[i].intensity;
  return 0;
}
export const zonePeakMmH = { A: 52, B: 68, C: 34, D: 18 } as const;
export function zoneRain(points: RainPoint[], zone: keyof typeof zonePeakMmH) {
  return points.map((p) => ({ ...p, intensity: (p.intensity * zonePeakMmH[zone]) / 63 }));
}
