import { type PhysicsConfig, validateConfig } from './config';
import { clamp } from './hydraulics';
export interface CompostCell {
  temperature: number;
  moisture: number;
  volatileSolids: number;
  oxygen: number;
}
export interface CompostFrame {
  second: number;
  cells: CompostCell[];
  core: number;
  surface: number;
  moisture: number;
  sump: number;
  evaporation: number;
  rainInput: number;
  waterResidual: number;
  lowOxygen: boolean;
  ambientReached: boolean;
  didNotReheat: boolean;
}
export interface CompostOptions {
  seconds: number;
  rain: number;
  turning: number[];
}
export function simulateCompost(config: PhysicsConfig, options: CompostOptions): CompostFrame[] {
  validateConfig(config);
  if (
    !Number.isFinite(options.seconds) ||
    options.seconds < 0 ||
    options.seconds > 7 * 86400 ||
    !Number.isFinite(options.rain) ||
    options.rain < 0 ||
    options.turning.some((t) => !Number.isFinite(t) || t < 0)
  )
    throw new Error('Invalid compost event');
  const v = config.values,
    cols = 12,
    rows = 8,
    dx = v.compostDx.value,
    dz = v.compostDepth.value / rows;
  if (dz <= 0) throw new Error('Compost depth must be positive');
  const cellVolume = dx * dz,
    mass = cellVolume * v.density.value,
    ambient = v.ambient.value;
  const alpha = v.thermalK.value / (v.density.value * v.heatCapacity.value);
  const conductionLimit = alpha > 0 ? 0.45 / (alpha * (1 / dx ** 2 + 1 / dz ** 2)) : 10;
  const surfaceLimit =
    v.convection.value > 0
      ? (0.25 * mass * v.heatCapacity.value) / (v.convection.value * (2 * dx + 2 * dz))
      : 10;
  const step = Math.min(10, v.step.value, conductionLimit, surfaceLimit);
  if (step < 0.1) throw new Error('Thermal coefficients require an unsupported step below 0.1 s');
  let cells = Array.from({ length: cols * rows }, () => ({
    temperature: v.initialTemperature.value,
    moisture: v.initialMoisture.value,
    volatileSolids: 1,
    oxygen: 1,
  }));
  const initialWater = cells.reduce((sum, c) => sum + c.moisture * mass, 0);
  const frames: CompostFrame[] = [];
  let second = 0,
    sump = 0,
    evaporation = 0,
    rainInput = 0,
    lastTurn = -Infinity,
    turnTemperature = 0,
    maxAfterTurn = 0;
  const turns = [...new Set(options.turning)].sort((a, b) => a - b);
  const save = () => {
    const core = cells[4 * cols + 6].temperature,
      surface = cells[6].temperature,
      moisture = cells.reduce((sum, c) => sum + c.moisture, 0) / cells.length;
    const water = cells.reduce((sum, c) => sum + c.moisture * mass, 0);
    frames.push({
      second,
      cells: cells.map((c) => ({ ...c })),
      core,
      surface,
      moisture,
      sump: sump / 1000 / v.sumpArea.value,
      evaporation,
      rainInput,
      waterResidual: initialWater + rainInput - water - sump - evaporation,
      lowOxygen: cells.some((c) => c.oxygen < v.lowOxygenThreshold.value),
      ambientReached: cells.every(
        (c) => Math.abs(c.temperature - ambient) < v.maturityTolerance.value,
      ),
      didNotReheat:
        second - lastTurn >= v.maturityWindow.value &&
        Number.isFinite(lastTurn) &&
        maxAfterTurn <= turnTemperature + v.maturityTolerance.value,
    });
  };
  save();
  while (second < options.seconds - 1e-8) {
    if (turns.some((t) => Math.abs(t - second) < 1e-8)) {
      const mean = cells.reduce((s, c) => s + c.temperature, 0) / cells.length;
      cells = cells.map((c) => ({ ...c, oxygen: 1, temperature: mean }));
      lastTurn = second;
      turnTemperature = mean;
      maxAfterTurn = mean;
    }
    const nextTurn = turns.find((t) => t > second + 1e-8) ?? options.seconds;
    const nextMinute = (Math.floor(second / 60) + 1) * 60;
    const dt = Math.min(step, options.seconds - second, nextTurn - second, nextMinute - second);
    const next = cells.map((cell, index) => {
      const x = index % cols,
        y = Math.floor(index / cols);
      const fT =
        clamp(
          (cell.temperature - v.tempMin.value) / (v.tempOptimum.value - v.tempMin.value),
          0,
          1,
        ) *
        clamp(
          (v.tempMax.value - cell.temperature) / (v.tempMax.value - v.tempPlateauEnd.value),
          0,
          1,
        );
      const fM =
        clamp(cell.moisture / v.moistureOptimum.value, 0, 1) *
        clamp(
          (v.moistureMax.value - cell.moisture) /
            (v.moistureMax.value - v.moisturePlateauEnd.value),
          0,
          1,
        );
      const heat = v.heatRate.value * fT * fM * cell.oxygen * cell.volatileSolids;
      let change = heat / v.heatCapacity.value;
      for (const [nx, ny, distance] of [
        [x - 1, y, dx],
        [x + 1, y, dx],
        [x, y - 1, dz],
        [x, y + 1, dz],
      ]) {
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows)
          change +=
            (alpha * (cells[ny * cols + nx].temperature - cell.temperature)) / distance ** 2;
      }
      const boundaryArea =
        (x === 0 || x === cols - 1 ? dz : 0) + (y === 0 || y === rows - 1 ? dx : 0);
      change -=
        (v.convection.value * boundaryArea * (cell.temperature - ambient)) /
        (mass * v.heatCapacity.value);
      const rain = y === 0 ? options.rain * dx * dt * 1000 * (1 - v.covered.value) : 0;
      rainInput += rain;
      const evaporated = Math.min(
        cell.moisture * mass + rain,
        v.evaporation.value * boundaryArea * Math.max(0, cell.temperature - ambient) * dt,
      );
      evaporation += evaporated;
      change -= (evaporated * v.latentHeat.value) / (dt * mass * v.heatCapacity.value);
      return {
        temperature: cell.temperature + change * dt,
        moisture: (cell.moisture * mass + rain - evaporated) / mass,
        volatileSolids: Math.max(
          0,
          cell.volatileSolids - v.vsDecay.value * fT * fM * cell.oxygen * cell.volatileSolids * dt,
        ),
        oxygen: clamp(
          cell.oxygen -
            v.oxygenDecay.value *
              (1 +
                v.oxygenWetMultiplier.value *
                  Math.max(0, cell.moisture - v.oxygenWetThreshold.value)) *
              dt,
          0,
          1,
        ),
      };
    });
    // Top-to-bottom excess water transport, with an explicit sump ledger.
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const cell = next[y * cols + x],
          excess = Math.max(0, cell.moisture - v.holding.value) * mass;
        cell.moisture -= excess / mass;
        if (y < rows - 1) next[(y + 1) * cols + x].moisture += excess / mass;
        else sump += excess;
      }
    cells = next;
    second += dt;
    if (Number.isFinite(lastTurn))
      maxAfterTurn = Math.max(maxAfterTurn, ...cells.map((c) => c.temperature));
    if (Math.abs(second % 60) < 1e-8 || Math.abs(second - options.seconds) < 1e-8) save();
  }
  return frames;
}
