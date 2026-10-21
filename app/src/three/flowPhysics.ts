import type { PhysicsConfig } from '../simulation/physics/config';
import type { PhysicsFrame } from '../simulation/physics/engine';
import type { DrainDesign } from '../simulation/physics/design';
export type Point3 = [number, number, number];
export function roofRunoffPath(d: DrainDesign) {
  const c = d.catchment,
    foot = -d.topWidth / 2 - c.footpathWidth / 2;
  const front = foot - c.footpathWidth / 2 - 0.35 + 0.14,
    x = -d.length * 0.34,
    gutter = -d.length / 2 - 0.78;
  const points: Point3[] = [
    [d.length * 0.35, c.kerbHeight + 5, front - 0.3],
    [d.length * 0.35, c.kerbHeight + 4.8, front],
    [x, c.kerbHeight + 4.8, front],
    [x, 0.2, front],
    [x, 0.02, front + 0.05],
    [gutter, 0.02, front + 0.05],
    [gutter, 0.02, foot + c.footpathWidth / 2 + 0.1],
    [gutter, 0.02, 0],
    [-d.length / 2 - 0.4, 0.02, 0],
    [-d.length / 2 + 0.1, 0.01, 0],
  ];
  return [
    'Roof',
    'Eaves gutter',
    'Downpipe',
    'Shoe',
    'Lot drain',
    'Covered crossing',
    'Street gutter',
    'Kerb opening',
    'Forebay',
  ].map((name, i) => ({ name, start: points[i], end: points[i + 1] }));
}
export const roofDischarge = (d: DrainDesign, f?: PhysicsFrame) =>
  d.catchment.roofArea > 0
    ? Math.max(0, f?.links.find((l) => l.id === 'roof outlet to downpipe')?.discharge ?? 0)
    : 0;
export function outfallPose(d: DrainDesign, c: PhysicsConfig) {
  const length = c.kind === 'inlet' ? 1.4 : 1.5;
  return {
    length,
    x: d.length / 2 + length,
    y: d.pipeY - (c.kind === 'inlet' ? 0 : (d.length / 2) * c.values.pipeSlope.value),
  };
}
export function outfallJet(d: DrainDesign, c: PhysicsConfig, f: PhysicsFrame) {
  const pose = outfallPose(d, c),
    r = d.pipeDiameter / 2;
  const tail = Math.max(0, c.values.tailwater.value - c.values.outfallInvert.value);
  const y = pose.y - r + f.pipeFill * d.pipeDiameter * 0.5;
  const landing = pose.y - r - 0.11;
  return {
    active: f.flux.outfall > 0 && f.pipeVelocity > 0 && tail < f.pipeFill * d.pipeDiameter * 0.5,
    start: [pose.x, y, 0] as Point3,
    landing,
    velocity: f.pipeVelocity,
    discharge: f.flux.outfall,
  };
}
export const ballisticPoint = (start: Point3, velocity: number, t: number): Point3 => [
  start[0] + velocity * t,
  start[1] - 4.905 * t * t,
  start[2],
];
export const flightTime = (height: number) => Math.sqrt((2 * Math.max(0, height)) / 9.81);
export function saturatedColumns(d: DrainDesign, f?: PhysicsFrame, threshold = 0.85) {
  const field = f?.soil;
  if (!field || (f?.flux.drain ?? 0) <= 0) return [];
  const row = Math.min(
    field.nz - 1,
    Math.max(0, Math.floor((d.mediaDepth + d.transitionDepth + d.gravelDepth * 0.5) / field.dz)),
  );
  return Array.from({ length: field.nx }, (_, x) => x).filter(
    (x) => field.saturation[row * field.nx + x] >= threshold,
  );
}
