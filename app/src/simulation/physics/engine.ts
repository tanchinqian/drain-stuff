import { type PhysicsConfig, validateConfig } from './config';
import { clamp, orifice, stageVolume, tailwaterFactor, volumeStage, weir } from './hydraulics';
import { createNetwork, stepNetwork, type LinkReading } from './network';
import { hyetograph, intensityAt, type Pattern, type RainPoint } from './rainfall';
export interface CellState {
  surface: number;
  media: number;
  transition: number;
  gravel: number;
  clog: number;
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
}
export interface PhysicsFrame {
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
  config: PhysicsConfig;
  rain: RainPoint[];
  frames: PhysicsFrame[];
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
});
export function simulatePhysics(
  config: PhysicsConfig,
  pattern: Pattern = 'alternating-block',
  drawn: RainPoint[] = [],
): PhysicsRun {
  validateConfig(config);
  const c = structuredClone(config),
    v = c.values,
    rain = hyetograph(c, pattern, drawn),
    network = createNetwork(c);
  const area = v.length.value * v.width.value,
    mediaVolume = area * v.mediaDepth.value;
  // Only water above residual (wilting) moisture belongs to the event ledger.
  const mediaCapacity = mediaVolume * (v.porosity.value - v.wilting.value),
    fieldStorage = mediaVolume * (v.fieldCapacity.value - v.wilting.value);
  const transitionCapacity = area * v.transitionDepth.value * v.transitionVoid.value,
    gravelCapacity = area * v.gravelDepth.value * v.gravelVoid.value;
  const cell: CellState = { surface: 0, media: 0, transition: 0, gravel: 0, clog: 0 };
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
    const storage =
      cell.surface +
      cell.media +
      cell.transition +
      cell.gravel +
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
      second,
      dt,
      rain: intensity,
      rainDepth,
      rainTips,
      rainTenMinuteMm: (rainTips - old) * 0.2,
      cell: { ...cell },
      ponding: volumeStage(cell.surface, v.length.value, v.width.value, v.sideSlope.value),
      moisture: v.wilting.value + cell.media / mediaVolume,
      gravelHead: cell.gravel / (area * v.gravelVoid.value),
      network: network.nodes.map((n) => ({ id: n.id, volume: n.volume, depth: n.volume / n.area })),
      links,
      flux,
      cumulative: { ...cumulative },
      storage,
      balanceResidual,
      relativeError: Math.abs(balanceResidual) / Math.max(cumulative.input, 1e-9),
      catchments: catchments.map((n) => ({ depression: n.depression, reservoir: n.reservoir })),
    });
  };
  snapshot(0, 0, emptyFlux(), []);
  while (second < end - 1e-8) {
    const nextRainBoundary = rain.find((p) => p.second > second + 1e-8)?.second ?? end;
    const dt = Math.min(maxStep, end - second, nextRainBoundary - second),
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
    cell.surface += networkStep.delivered;
    const flux = emptyFlux();
    flux.runoff = runoff.reduce((a, b) => a + b, 0) / dt;
    flux.inlet = networkStep.delivered / dt;
    const head = volumeStage(cell.surface, v.length.value, v.width.value, v.sideSlope.value);
    const downstream = Math.max(0, v.tailwater.value - v.outfallInvert.value);
    if (c.kind === 'inlet') {
      const flow = Math.min(
        cell.surface,
        orifice(
          v.co.value,
          (Math.PI * v.pipeDiameter.value ** 2) / 4,
          Math.max(0, head - downstream),
          v.gravity.value,
        ) * dt,
      );
      cell.surface -= flow;
      cumulative.outlet += flow;
      flux.drain = flow / dt;
    } else {
      const effectiveKs = v.ks.value * (1 - cell.clog);
      const infiltrated = Math.min(
        cell.surface,
        mediaCapacity - cell.media,
        effectiveKs * (1 + (head + v.suction.value) / v.mediaDepth.value) * area * dt,
      );
      cell.surface -= infiltrated;
      cell.media += infiltrated;
      cumulative.treated += infiltrated;
      flux.infiltration = infiltrated / dt;
      const theta = v.wilting.value + cell.media / mediaVolume;
      const percolation = Math.min(
        Math.max(0, cell.media - fieldStorage),
        transitionCapacity - cell.transition,
        effectiveKs * Math.exp(-v.hco.value * (v.porosity.value - theta)) * area * dt,
      );
      cell.media -= percolation;
      cell.transition += percolation;
      flux.percolation = percolation / dt;
      const transfer = Math.min(
        cell.transition,
        gravelCapacity - cell.gravel,
        (cell.transition * dt) / Math.max(60, routingTime),
      );
      cell.transition -= transfer;
      cell.gravel += transfer;
      flux.transition = transfer / dt;
      const gravelHead = cell.gravel / (area * v.gravelVoid.value);
      const drain = Math.min(
        cell.gravel,
        v.drainC.value *
          Math.max(0, gravelHead - v.drainOffset.value) ** v.drainN.value *
          tailwaterFactor(gravelHead, downstream) *
          dt,
      );
      cell.gravel -= drain;
      cumulative.outlet += drain;
      flux.drain = drain / dt;
      const seepage = Math.min(cell.gravel, v.nativeKs.value * area * (1 - v.liner.value) * dt);
      cell.gravel -= seepage;
      cumulative.seepage += seepage;
      flux.seepage = seepage / dt;
      const et = Math.min(cell.media, v.et.value * area * dt);
      cell.media -= et;
      cumulative.et += et;
      flux.et = et / dt;
      cell.clog = clamp(
        v.clogPerVolume.value * cumulative.treated + v.sedimentClog.value * v.sediment.value,
        0,
        0.95,
      );
    }
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
    snapshot(dt, intensity, flux, networkStep.links);
  }
  return { config: c, rain, frames };
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
