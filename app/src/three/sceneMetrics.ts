import type { PhysicsConfig } from '../simulation/physics/config';
import type { PhysicsFrame, PhysicsRun } from '../simulation/physics/engine';
import { drainDesign, type DrainDesign } from '../simulation/physics/design';
import { frontDepth } from './visibility';

export type CutAxis = 'X' | 'Y' | 'Z';
export type CameraPreset = 'default' | 'overview' | 'drain' | 'inlet' | 'fault';
// UI axes: across the bed, along the asset, and depth; Three.js uses Y up.
export const cutNormal = (axis: CutAxis): [number, number, number] =>
  axis === 'X' ? [0, 0, -1] : axis === 'Y' ? [-1, 0, 0] : [0, -1, 0];
export function cutRange(d: DrainDesign, axis: CutAxis, inlet = false): [number, number] {
  return axis === 'X'
    ? [-d.topWidth / 2, d.topWidth / 2]
    : axis === 'Y'
      ? [-d.length / 2, d.length / 2]
      : [inlet ? 0 : d.bottomY - d.nativeDepth, d.depressionDepth];
}
export const flowVisual = (discharge: number, velocity: number) => ({
  active: discharge > 0,
  width: Math.max(0, discharge) * 60000 * 0.003,
  speed: discharge > 0 ? Math.max(0, velocity) : 0,
});
export function surfaceWetness(config: PhysicsConfig, frame?: PhysicsFrame) {
  if (!frame || frame.second <= 0) return 0;
  const stored = frame.soil?.surfaceWetness;
  if (stored?.length)
    return Math.max(0, Math.min(1, stored.reduce((a, b) => a + b, 0) / stored.length));
  return frame.rain > 0
    ? Math.min(1, (frame.rain * 3.6e6) / 25)
    : Math.exp(-Math.max(0, frame.second - config.values.duration.value) / 1800);
}
export function cutSample(
  config: PhysicsConfig,
  frame: PhysicsFrame | undefined,
  axis: CutAxis,
  position: number,
  depth?: number,
  hoverAcross?: number,
) {
  const d = drainDesign(config),
    field = frame?.soil;
  const waterDepth = frame?.ponding ?? 0,
    pipeFill = frame?.pipeFill ?? 0;
  if (config.kind === 'inlet') {
    const height =
      axis === 'Z' ? position : depth === undefined ? waterDepth / 2 : -depth - d.mulchDepth;
    const layer =
      height <= 0
        ? 'Chamber floor'
        : height < config.values.sediment.value
          ? 'Sediment'
          : height < waterDepth
            ? 'Chamber water'
            : 'Chamber air';
    return { layer, saturation: null, waterDepth, pipeFill, front: null };
  }
  const across = axis === 'X' ? position : (hoverAcross ?? 0);
  const sampleDepth = axis === 'Z' ? -position - d.mulchDepth : (depth ?? d.mediaDepth / 2);
  const inColumn = !!field && Math.abs(across) <= field.width / 2;
  const column = field
    ? Math.max(0, Math.min(field.nx - 1, Math.floor((across / field.width + 0.5) * field.nx)))
    : 0;
  const row = field ? Math.max(0, Math.min(field.nz - 1, Math.floor(sampleDepth / field.dz))) : 0;
  let layer =
    sampleDepth < 0
      ? 'Mulch'
      : sampleDepth < d.mediaDepth
        ? 'Filter media'
        : sampleDepth < d.mediaDepth + d.transitionDepth
          ? 'Transition sand'
          : sampleDepth < d.soilDepth
            ? 'Drainage gravel'
            : 'Native subsoil';
  if (sampleDepth < -d.mulchDepth)
    layer = -sampleDepth - d.mulchDepth <= waterDepth ? 'Ponded water' : 'Above surface';
  if (field && !inColumn) layer = 'Outside soil field';
  if (field && sampleDepth > field.depth) layer = 'Below soil field';
  const saturation =
    inColumn && sampleDepth >= -d.mulchDepth && sampleDepth <= field!.depth
      ? sampleDepth < 0
        ? (field!.surfaceWetness?.[column] ?? field!.saturation[column])
        : field!.saturation[row * field!.nx + column]
      : null;
  const front = inColumn
    ? frontDepth(
        axis === 'X'
          ? {
              ...field!,
              nx: 1,
              saturation: Float32Array.from(
                { length: field!.nz },
                (_, z) => field!.saturation[z * field!.nx + column],
              ),
            }
          : field,
        d.mediaDepth,
      )
    : null;
  return { layer, saturation, waterDepth, pipeFill, front };
}
export function stageTotals(run: PhysicsRun | undefined, f: PhysicsFrame) {
  let inlet = 0;
  if (run)
    for (let i = 1; i < run.frames.length; i++) {
      const a = run.frames[i - 1],
        b = run.frames[i];
      if (a.second >= f.second) break;
      const end = Math.min(b.second, f.second),
        t = (end - a.second) / Math.max(1, b.second - a.second);
      inlet +=
        (a.flux.inlet + (a.flux.inlet + (b.flux.inlet - a.flux.inlet) * t)) *
        0.5 *
        (end - a.second);
    }
  return {
    inlet: inlet * 1000,
    pond: f.cell.surface * 1000,
    soil: f.cumulative.treated * 1000,
    underdrain: (f.cumulative.outlet + (f.cell.pipe ?? 0)) * 1000,
    outfall: f.cumulative.outlet * 1000,
    overflow: f.cumulative.overflow * 1000,
  };
}
