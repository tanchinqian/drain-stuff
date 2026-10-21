export const wetFinish = (wet: number) => {
  const s = Math.max(0, Math.min(1, wet));
  return { albedo: 1 - s * 0.38, roughness: 0.95 - s * 0.55 };
};
export const mulchLift = (ponding: number, seed: number) =>
  seed > 0.85 && ponding > 0.06 ? ponding + 0.009 : 0;
export const damDischarge = (upstream: number, downstream: number, crest: number, width: number) =>
  1.7 * Math.max(0, width) * Math.max(0, upstream - Math.max(downstream, crest)) ** 1.5;
export const sockDarkening = (clog: number, wetness: number) =>
  1 - 0.4 * Math.max(0, Math.min(1, clog)) - 0.15 * Math.max(0, Math.min(1, wetness));

export function recordParticleCost(
  data: { particleFrame?: number; particleMs?: number },
  frame: number,
  ms: number,
) {
  data.particleMs = (data.particleFrame === frame ? (data.particleMs ?? 0) : 0) + ms;
  data.particleFrame = frame;
}
