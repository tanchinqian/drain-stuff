import { type PhysicsConfig, validateConfig } from './config';
import {
  clamp,
  circularSection,
  manning,
  orifice,
  stageVolume,
  tailwaterFactor,
  volumeStage,
  weir,
} from './hydraulics';
import { createNetwork, stepNetwork, type LinkReading } from './network';
import { hyetograph, intensityAt, type Pattern, type RainPoint } from './rainfall';
import { RichardsGrid, type MoistureField } from './richards';
import { drainDesign } from './design';
export interface CellState {
  surface: number;
  media: number;
  transition: number;
  gravel: number;
  clog: number;
  native?: number;
  pipe?: number;
}
export interface Fluxes {
  runoff: number;
  inlet: number;
  infiltration: number;
  percolation: number;
  transition: number;
  drain: number;
  overflow: number;
  seepage: number;
  et: number;
  outfall: number;
}
export interface PhysicsFrame {
  soil?: MoistureField;
  pipeFill: number;
  pipeVelocity: number;
  soilResidual: number;
  second: number;
  dt: number;
  rain: number;
  rainDepth: number;
  rainTips: number;
  rainTenMinuteMm: number;
  cell: CellState;
  ponding: number;
  moisture: number;
  gravelHead: number;
  network: { id: string; volume: number; depth: number }[];
  links: LinkReading[];
  flux: Fluxes;
  cumulative: {
    input: number;
    outlet: number;
    overflow: number;
    seepage: number;
    et: number;
    treated: number;
  };
  storage: number;
  balanceResidual: number;
  relativeError: number;
  catchments: { depression: number; reservoir: number }[];
}
export interface PhysicsRun {
  computeMs: number;
  config: PhysicsConfig;
  rain: RainPoint[];
  frames: PhysicsFrame[];
}
export function peakFrame(run: PhysicsRun) {
  return run.frames.reduce(
    (best, f) =>
      f.ponding > best.ponding || (f.ponding === best.ponding && f.flux.inlet > best.flux.inlet)
        ? f
        : best,
    run.frames[0],
  );
}
const emptyFlux = (): Fluxes => ({
  runoff: 0,
  inlet: 0,
  infiltration: 0,
  percolation: 0,
  transition: 0,
  drain: 0,
  overflow: 0,
  seepage: 0,
  et: 0,
  outfall: 0,
});
export function simulatePhysics(
  config: PhysicsConfig,
  pattern: Pattern = 'alternating-block',
  drawn: RainPoint[] = [],
): PhysicsRun {
  const started = performance.now();
  validateConfig(config);
  const c = structuredClone(config),
    v = c.values,
    rain = hyetograph(c, pattern, drawn),
    network = createNetwork(c);
  const design = drainDesign(c),
    area = design.length * design.bedWidth;
  const soil = c.kind === 'inlet' ? undefined : new RichardsGrid(c);
  let soilResidual = 0;
  let surfaceWetness = soil ? new Float32Array(soil.nx) : undefined,
    wetBandHeight = 0;
  const cell: CellState = { surface: 0, media: 0, transition: 0, gravel: 0, clog: 0 };
  cell.pipe = 0;
  const pipeCapacity = ((Math.PI * design.pipeDiameter ** 2) / 4) * v.pipeLength.value;
  const pipeFill = () => {
    let lo = 0,
      hi = 1;
    const crossArea = (cell.pipe ?? 0) / v.pipeLength.value;
    if (crossArea <= 0) return 0;
    for (let iteration = 0; iteration < 28; iteration++) {
      const mid = (lo + hi) / 2;
      if (circularSection(design.pipeDiameter, mid).area < crossArea) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const cumulative = { input: 0, outlet: 0, overflow: 0, seepage: 0, et: 0, treated: 0 };
  const catchments = [
    ['roofArea', 'roofC', 'roofDepression'],
    ['pavedArea', 'pavedC', 'pavedDepression'],
    ['lawnArea', 'lawnC', 'lawnDepression'],
  ].map((keys) => {
    const [a, coeff, depression] = keys as ['roofArea', 'roofC', 'roofDepression'];
    return {
      area: v[a].value,
      coefficient: v[coeff].value,
      capacity: v[depression].value * v[a].value,
      depression: 0,
      reservoir: 0,
    };
  });
  const routingTime = v.overlandTime.value + v.drainTime.value;
  const maxStep = Math.min(
    10,
    v.step.value,
    routingTime / 4,
    Math.max(10, v.drainTime.value / 6) / 4,
  );
  if (maxStep < 0.1) throw new Error('Travel time too small for supported stable step');
  const end = v.duration.value + v.recovery.value,
    frames: PhysicsFrame[] = [];
  let second = 0,
    rainDepth = 0,
    rainWindowIndex = -1;
  const snapshot = (dt: number, intensity: number, flux: Fluxes, links: LinkReading[]) => {
    const field = soil?.frame();
    const stage = volumeStage(cell.surface, design.length, design.bedWidth, design.sideSlope);
    if (field && surfaceWetness) {
      const elapsed = second - (frames.at(-1)?.second ?? 0),
        drying = Math.exp(-elapsed / 1800);
      surfaceWetness = Float32Array.from(surfaceWetness, (s, i) =>
        Math.max(field.saturation[i], s * drying, stage > 0 ? 1 : 0),
      );
      field.surfaceWetness = surfaceWetness;
      wetBandHeight = Math.max(stage, wetBandHeight * drying);
      field.wetBandHeight = wetBandHeight;
    }
    const storage =
      cell.surface +
      cell.media +
      cell.transition +
      cell.gravel +
      (cell.native ?? 0) +
      (cell.pipe ?? 0) +
      network.nodes.reduce((s, n) => s + n.volume, 0) +
      catchments.reduce((s, n) => s + n.depression + n.reservoir, 0);
    const balanceResidual =
      cumulative.input -
      storage -
      cumulative.outlet -
      cumulative.overflow -
      cumulative.seepage -
      cumulative.et;
    const rainTips = Math.floor((rainDepth + 1e-12) / 0.0002);
    while (
      rainWindowIndex + 1 < frames.length &&
      frames[rainWindowIndex + 1].second <= second - 600
    )
      rainWindowIndex++;
    const old = frames[rainWindowIndex]?.rainTips ?? 0;
    frames.push({
      soil: field,
      soilResidual,
      pipeFill: pipeFill(),
      pipeVelocity: 0,
      second,
      dt,
      rain: intensity,
      rainDepth,
      rainTips,
      rainTenMinuteMm: (rainTips - old) * 0.2,
      cell: { ...cell },
      ponding: volumeStage(cell.surface, v.length.value, v.width.value, v.sideSlope.value),
      moisture: soil?.meanAt(0.1) ?? v.wilting.value,
      gravelHead: soil?.gravelHead() ?? 0,
      network: network.nodes.map((n) => ({ id: n.id, volume: n.volume, depth: n.volume / n.area })),
      links,
      flux,
      cumulative: { ...cumulative },
      storage,
      balanceResidual,
      relativeError: Math.abs(balanceResidual) / Math.max(cumulative.input, 1e-9),
      catchments: catchments.map((n) => ({ depression: n.depression, reservoir: n.reservoir })),
    });
    const frame = frames.at(-1)!;
    const angle = 2 * Math.acos(1 - 2 * frame.pipeFill);
    const pipeArea = (design.pipeDiameter ** 2 * (angle - Math.sin(angle))) / 8;
    frame.pipeVelocity = pipeArea > 1e-12 ? frame.flux.outfall / pipeArea : 0;
  };
  snapshot(0, 0, emptyFlux(), []);
  while (second < end - 1e-8) {
    const nextRainBoundary = rain.find((p) => p.second > second + 1e-8)?.second ?? end;
    const nextOutput = (Math.floor((second + 1e-8) / 60) + 1) * 60;
    const dt = Math.min(maxStep, end - second, nextRainBoundary - second, nextOutput - second),
      intensity = intensityAt(rain, second);
    rainDepth += intensity * dt;
    const runoff = catchments.map((catchment) => {
      const input = intensity * catchment.area * catchment.coefficient * dt;
      cumulative.input += input;
      const retained = Math.min(input, catchment.capacity - catchment.depression);
      catchment.depression += retained;
      catchment.reservoir += input - retained;
      const release = Math.min(catchment.reservoir, (catchment.reservoir * dt) / routingTime);
      catchment.reservoir -= release;
      return release;
    });
    const networkStep = stepNetwork(network, c, dt, {
      'roof outlet': runoff[0],
      'property drain': runoff[1],
      'kerb flow': runoff[2],
    });
    const directRain = intensity * area * dt;
    cumulative.input += directRain;
    cell.surface += networkStep.delivered + directRain;
    const flux = emptyFlux();
    flux.runoff = runoff.reduce((a, b) => a + b, 0) / dt;
    flux.inlet = networkStep.delivered / dt;
    const head = volumeStage(cell.surface, v.length.value, v.width.value, v.sideSlope.value);
    const downstream = Math.max(0, v.tailwater.value - v.outfallInvert.value);
    if (c.kind === 'inlet') {
      const flow = Math.min(
        cell.surface,
        Math.max(0, pipeCapacity - (cell.pipe ?? 0)),
        orifice(
          v.co.value,
          (Math.PI * v.pipeDiameter.value ** 2) / 4,
          Math.max(0, head - downstream),
          v.gravity.value,
        ) * dt,
      );
      cell.surface -= flow;
      cell.pipe! += flow;
      flux.drain = flow / dt;
    } else {
      const gravelHead = soil!.gravelHead();
      const requestedDrain = Math.min(
        Math.max(0, pipeCapacity - (cell.pipe ?? 0)) / dt,
        v.drainC.value *
          Math.max(0, gravelHead - v.drainOffset.value) ** v.drainN.value *
          tailwaterFactor(gravelHead, downstream),
      );
      const result = soil!.step(
        dt,
        head,
        cell.surface,
        requestedDrain,
        v.et.value * area,
        1 - cell.clog,
      );
      cell.surface = Math.max(0, cell.surface - result.infiltration);
      Object.assign(cell, soil!.layerStorage());
      soilResidual += result.residual;
      cumulative.treated += result.infiltration;
      cell.pipe! += result.drain;
      cumulative.seepage += result.bottom;
      cumulative.et += result.et;
      flux.infiltration = result.infiltration / dt;
      flux.drain = result.drain / dt;
      flux.seepage = result.bottom / dt;
      flux.et = result.et / dt;
      flux.percolation = Math.max(0, soil!.fluxAt(design.mediaDepth));
      flux.transition = Math.max(0, soil!.fluxAt(design.mediaDepth + design.transitionDepth));
      cell.clog = clamp(
        v.clogPerVolume.value * cumulative.treated + v.sedimentClog.value * v.sediment.value,
        0,
        0.95,
      );
    }
    const fill = pipeFill();
    const pipeOut = Math.min(
      cell.pipe ?? 0,
      manning(design.pipeDiameter, fill, v.pipeSlope.value, v.manningN.value) *
        tailwaterFactor(fill * design.pipeDiameter, downstream) *
        dt,
      ((cell.pipe ?? 0) * dt) / Math.max(1, v.pipeLength.value),
    );
    cell.pipe! -= pipeOut;
    cumulative.outlet += pipeOut;
    flux.outfall = pipeOut / dt;
    const h = volumeStage(cell.surface, v.length.value, v.width.value, v.sideSlope.value);
    const overflow = Math.min(
      Math.max(
        0,
        cell.surface - stageVolume(v.crest.value, v.length.value, v.width.value, v.sideSlope.value),
      ),
      weir(
        v.cw.value,
        v.overflowLength.value,
        Math.max(0, h - Math.max(v.crest.value, downstream)),
      ) * dt,
    );
    cell.surface -= overflow;
    cumulative.overflow += overflow;
    flux.overflow = overflow / dt;
    second += dt;
    if (Math.abs(second / 60 - Math.round(second / 60)) < 1e-7 || second >= end - 1e-8)
      snapshot(dt, intensityAt(rain, second), flux, networkStep.links);
  }
  return { config: c, rain, frames, computeMs: performance.now() - started };
}
// Controlled comparison copies every input except conductivity and its provenance.
export function compareConductivities(
  base: PhysicsConfig,
  conductivities: {
    label: string;
    ks: number;
    source: 'placeholder' | 'trial-record';
    n: number;
  }[],
) {
  return conductivities.map((entry) => {
    const config = structuredClone(base);
    config.id = entry.label;
    config.sampleCount = entry.n;
    config.values.ks = { ...config.values.ks, value: entry.ks, source: entry.source };
    return simulatePhysics(config);
  });
}
