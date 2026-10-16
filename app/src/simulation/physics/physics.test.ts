import { describe, it, expect } from 'vitest';
import { featureConfig, scenarios, withScenario, validateConfig } from './config';
import {
  circularSection,
  manning,
  orifice,
  weir,
  rational,
  stageVolume,
  volumeStage,
} from './hydraulics';
import { hyetograph, zoneRain } from './rainfall';
import { simulatePhysics, compareConductivities } from './engine';
import { simulateCompost } from './compost';
import { inputDriver, virtualInput } from './sensors';
import { contradictions, frameRecords } from './records';
import { runCsv } from './export';
import { generateMock } from '../../api/mock/seed';
import { nearestConnection } from './network';

describe('reduced-order hydraulic engine (SI units)', () => {
  it('keeps water in a flowing inlet pipe and derives velocity from its circular area', () => {
    const run = simulatePhysics(featureConfig('I1'));
    const flowing = run.frames.filter((f) => f.flux.outfall > 1e-9);
    expect(flowing.length).toBeGreaterThan(0);
    for (const f of flowing) {
      expect(f.cell.pipe).toBeGreaterThan(0);
      expect(f.pipeFill).toBeGreaterThan(0);
      expect(f.pipeVelocity).toBeCloseTo(
        f.flux.outfall / circularSection(run.config.values.pipeDiameter.value, f.pipeFill).area,
        8,
      );
      expect(f.relativeError).toBeLessThan(1e-6);
    }
  });
  it('matches independent hand calculations and invertible stage storage', () => {
    expect(circularSection(1, 0.5).area).toBeCloseTo(Math.PI / 8, 12);
    expect(manning(1, 1, 0.01, 0.013)).toBeCloseTo(2.3975805208, 8);
    expect(weir(1.7, 2, 0.1)).toBeCloseTo(0.1075174404, 9);
    expect(orifice(0.62, 0.03, 0.2)).toBeCloseTo(0.0368449052, 8);
    expect(rational(0.5, 50, 12700)).toBeCloseTo(0.0881944444, 10);
    expect(volumeStage(stageVolume(0.2, 6, 3, 3), 6, 3, 3)).toBeCloseTo(0.2, 12);
  });
  it('generates a nonuniform design storm, exact peak, zone scaling, and validates drawn input', () => {
    const c = featureConfig('S1'),
      rain = hyetograph(c, 'alternating-block');
    expect(new Set(rain.map((p) => p.intensity)).size).toBeGreaterThan(3);
    expect(Math.max(...rain.map((p) => p.intensity)) * 3.6e6).toBeCloseTo(63);
    expect(Math.max(...zoneRain(rain, 'B').map((p) => p.intensity)) * 3.6e6).toBeCloseTo(68);
    expect(() => hyetograph(c, 'drawn', [{ second: 0, intensity: -1 }])).toThrow();
    expect(
      hyetograph(c, 'drawn', [
        { second: 0, intensity: 0 },
        { second: 300, intensity: 1e-5 },
      ]).at(-1)?.intensity,
    ).toBe(0);
  });
  for (const id of ['S1', 'S2', 'S3', 'I1', 'T1', 'T2'])
    it(`${id} conserves water at every substep`, () => {
      const c = featureConfig(id);
      c.values.peak.value = 120 / 3.6e6;
      const run = simulatePhysics(c, 'uniform');
      for (const f of run.frames) {
        expect(f.relativeError).toBeLessThan(1e-6);
        expect(f.ponding).toBeGreaterThanOrEqual(0);
        expect(f.moisture).toBeLessThanOrEqual(c.values.porosity.value + 1e-9);
        expect(f.moisture).toBeGreaterThanOrEqual(
          c.kind === 'inlet' ? c.values.wilting.value - 1e-9 : 0.065 - 1e-9,
        );
        expect(f.dt).toBeLessThanOrEqual(10);
        expect(f.network.every((n) => n.volume >= -1e-12)).toBe(true);
      }
      expect(run.config.kind).toBe(id[0] === 'I' ? 'inlet' : id[0] === 'T' ? 'tree_pit' : 'swale');
    });
  it('is dry with zero rainfall and routes runoff with a lag and steady rational inflow', () => {
    const c = featureConfig('S1');
    c.values.peak.value = 0;
    expect(
      simulatePhysics(c).frames.every(
        (f) =>
          f.ponding === 0 &&
          f.cumulative.input === 0 &&
          f.flux.drain === 0 &&
          Math.abs(f.storage + f.cumulative.seepage + f.cumulative.et) < 1e-8,
      ),
    ).toBe(true);
    c.values.peak.value = 63 / 3.6e6;
    c.values.duration.value = 7200;
    c.values.recovery.value = 0;
    const run = simulatePhysics(c, 'uniform'),
      v = c.values;
    const rationalPeak =
      rational(v.roofC.value, 63, v.roofArea.value) +
      rational(v.pavedC.value, 63, v.pavedArea.value) +
      rational(v.lawnC.value, 63, v.lawnArea.value);
    expect(run.frames[1].flux.runoff).toBeLessThan(rationalPeak / 10);
    expect(run.frames.at(-1)!.flux.runoff).toBeCloseTo(rationalPeak, 9);
  });
  it('raises upstream ponding for blocked inlet and lowers cell peak for greater Ks', () => {
    const c = featureConfig('S1');
    c.values.peak.value = 120 / 3.6e6;
    const clear = simulatePhysics(c, 'uniform'),
      blocked = simulatePhysics(withScenario(c, 'Blocked inlet'), 'uniform');
    const upstream = (run: typeof clear) =>
      Math.max(...run.frames.map((f) => f.network.find((n) => n.id === 'kerb flow')!.depth));
    expect(upstream(blocked)).toBeGreaterThanOrEqual(upstream(clear));
    const runs = compareConductivities(c, [
      { label: 'low', ks: 5 / 3.6e6, source: 'placeholder', n: 0 },
      { label: 'high', ks: 40 / 3.6e6, source: 'placeholder', n: 0 },
    ]);
    expect(Math.max(...runs[1].frames.map((f) => f.ponding))).toBeLessThanOrEqual(
      Math.max(...runs[0].frames.map((f) => f.ponding)),
    );
    expect(c.values.ks.value).toBe(22 / 3.6e6);
  });
  for (const scenario of scenarios)
    it(`${scenario} is deterministic and has a stable checkpoint`, () => {
      const c = withScenario(featureConfig('S1'), scenario);
      c.values.peak.value = 120 / 3.6e6;
      c.values.duration.value = 7200;
      c.values.recovery.value = 3600;
      const run = simulatePhysics(c, 'uniform'),
        last = run.frames.at(-1)!;
      expect(simulatePhysics(c, 'uniform').frames.at(-1)).toEqual(last);
      expect(
        [last.ponding, last.cumulative.outlet, last.cumulative.overflow, last.storage].map((x) =>
          Number(x.toFixed(7)),
        ),
      ).toMatchSnapshot();
      expect(last.relativeError).toBeLessThan(1e-6);
    });
  it('does not route tailwater backwards or drain through a liner', () => {
    const c = withScenario(featureConfig('S1'), 'High tailwater');
    c.values.liner.value = 1;
    expect(simulatePhysics(c).frames.every((f) => f.flux.drain === 0 && f.flux.seepage === 0)).toBe(
      true,
    );
  });
  it('rejects unsafe parameter sets and reconnects moved positions deterministically', () => {
    const c = featureConfig('S1');
    c.values.porosity.value = 0;
    expect(() => validateConfig(c)).toThrow();
    expect(() => featureConfig('bad')).toThrow();
    expect(
      nearestConnection({ x: 9, y: 0 }, [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 10, y: 0 },
      ]),
    ).toBe('b');
  });
});
describe('thermal model and record boundaries', () => {
  it('reduces underdrain discharge when silting acts on a wet cell', () => {
    const c = featureConfig('S1');
    c.values.peak.value = 120 / 3.6e6;
    c.values.duration.value = 21600;
    c.values.recovery.value = 21600;
    c.values.nativeKs.value = 0;
    c.values.drainOffset.value = 0;
    const clear = simulatePhysics(c, 'uniform').frames.at(-1)!;
    const silted = simulatePhysics(withScenario(c, 'Silted underdrain'), 'uniform').frames.at(-1)!;
    expect(clear.cumulative.outlet).toBeGreaterThan(0);
    expect(silted.cumulative.outlet).toBeLessThan(clear.cumulative.outlet);
  });
  it('resolves the same storm under a smaller explicit time step', () => {
    const c = featureConfig('S1');
    c.values.peak.value = 120 / 3.6e6;
    const coarse = simulatePhysics(c, 'uniform');
    c.values.step.value = 1;
    const fine = simulatePhysics(c, 'uniform');
    const peak = (run: typeof coarse) => Math.max(...run.frames.map((f) => f.ponding));
    expect(Math.abs(peak(coarse) - peak(fine)) / peak(fine)).toBeLessThan(0.05);
  });
  it('conserves water and develops a warmer core than surface', () => {
    const c = featureConfig('S1');
    c.values.covered.value = 0;
    const frames = simulateCompost(c, { seconds: 3600, rain: 20 / 3.6e6, turning: [1800] });
    for (const f of frames) {
      expect(Math.abs(f.waterResidual)).toBeLessThan(1e-7);
      expect(
        f.cells.every(
          (cell) => Number.isFinite(cell.temperature) && cell.moisture >= 0 && cell.oxygen >= 0,
        ),
      ).toBe(true);
    }
    expect(frames.at(-1)!.core).toBeGreaterThan(frames.at(-1)!.surface);
    expect(frames.at(-1)!.didNotReheat).toBe(false);
    expect(simulateCompost(c, { seconds: 60, rain: 0, turning: [] })).toEqual(
      simulateCompost(c, { seconds: 60, rain: 0, turning: [] }),
    );
  });
  it('routes excess uncovered rain into sump; a cover intercepts it', () => {
    const c = featureConfig('S1');
    c.values.initialMoisture.value = 0.65;
    c.values.covered.value = 0;
    const wet = simulateCompost(c, { seconds: 600, rain: 120 / 3.6e6, turning: [] }).at(-1)!;
    c.values.covered.value = 1;
    const dry = simulateCompost(c, { seconds: 600, rain: 120 / 3.6e6, turning: [] }).at(-1)!;
    expect(wet.sump).toBeGreaterThan(dry.sump);
    expect(dry.rainInput).toBe(0);
  });
  it('classifies every existing input without overwriting human or offline records', () => {
    const db = generateMock(),
      c = featureConfig('S1'),
      frame = simulatePhysics(c).frames[120];
    expect(db.sensors).toHaveLength(216);
    for (const s of db.sensors) {
      expect(['hydraulic', 'thermal', 'human/seeded']).toContain(inputDriver(s));
      const reading = virtualInput(s, frame, c);
      if (
        inputDriver(s) === 'human/seeded' ||
        s.status === 'offline' ||
        inputDriver(s) === 'thermal'
      )
        expect(reading.sensor).toEqual(s);
    }
    const rain = db.sensors.find((s) => s.sensorId === 'SITE-RAIN')!;
    expect(virtualInput(rain, frame, c).sensor.lastValue).toBe(frame.rainTenMinuteMm);
    const other = db.sensors.find((s) => s.sensorId === 'S2-INLET')!;
    expect(virtualInput(other, frame, c).sensor).toEqual(other);
  });
  it('exports run provenance, rejects same-time contradictory quantities, preserves distinct histories', () => {
    const c = featureConfig('S1');
    c.values.recovery.value = 0;
    const run = simulatePhysics(c);
    const records = frameRecords(run, 1);
    expect(contradictions([...records, ...records])).toEqual([]);
    expect(contradictions([...records, { ...records[0], value: 99 }])).toHaveLength(1);
    expect(contradictions([...records, { ...records[0], value: 99, provenance: 'human' }])).toEqual(
      [],
    );
    const csv = runCsv(run);
    expect(csv.includes('Configuration')).toBe(true);
    expect(csv).toContain('relative residual');
    expect(csv).toContain('node');
  });
});
