import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateMock, config, DEMO_NOW } from './seed';
import { mockRequest, resetMock } from './index';
import { evaluateRules, maturityReason } from './rules';
import { statusShape } from '../../components/Status';
import type { BatchDetail, TrialDetail, FaultRule, Fault } from '../types';
describe('deterministic synthetic generator', () => {
  it('repeats the seed and matches the agreed storm and zone values', () => {
    const a = generateMock();
    expect(a).toEqual(generateMock());
    expect(a.houses).toHaveLength(24);
    expect(a.zones.map((z) => z.peakMmPerHr)).toEqual([52, 68, 34, 18]);
    expect(a.zones.map((z) => z.housesHoldingWater6h)).toEqual([4, 2, 1, 0]);
    expect(Math.max(...a.rainfall.map((r) => r.mmPerHr))).toBe(63);
    expect(a.faults.filter((f) => f.status === 'open')).toHaveLength(2);
    expect(a.readings.I1.some((r) => r.metric === 'drain_down_h')).toBe(false);
    expect(
      a.readings.S1.filter((r) => r.metric === 'infiltration_mm_hr').map((r) => r.value),
    ).toEqual([16, 17, 18, 18, 19, 20, 21, 22]);
  });
  it('uses shapes as well as colour', () => {
    expect(statusShape).toEqual({
      ok: 'square',
      watch: 'circle',
      fault: 'triangle',
      offline: 'diamond',
    });
  });
});
describe('allocation and measurement guardrails', () => {
  beforeEach(resetMock);
  const allocation = {
    featureId: 'S1',
    doseLabel: 'Pilot dose B',
    lPerM2: 15,
    appliedBy: 'Synthetic tester',
  };
  it('blocks immature batches, absent baselines, wrong arms and excessive dose', async () => {
    await expect(mockRequest('/batches/B-01/allocate', 'POST', allocation)).rejects.toThrow();
    await expect(
      mockRequest('/batches/B-03/allocate', 'POST', { ...allocation, featureId: 'T1' }),
    ).rejects.toThrow(/baseline/);
    await expect(
      mockRequest('/batches/B-03/allocate', 'POST', { ...allocation, featureId: 'S2' }),
    ).rejects.toThrow(/no compost/);
    await expect(
      mockRequest('/batches/B-03/allocate', 'POST', { ...allocation, lPerM2: 26 }),
    ).rejects.toThrow(/cap/);
  });
  it('requires all marked baseline points and preserves repeat counts', async () => {
    const test = {
      phase: 'baseline',
      metric: 'infiltration_mm_hr',
      value: 15,
      n: 2,
      soilTexture: 'Clay loam · synthetic',
    };
    await expect(
      mockRequest('/trials/T1/tests', 'POST', { ...test, pointId: 'T1-NEW' }),
    ).rejects.toThrow(/marked points/);
    await expect(
      mockRequest('/trials/T1/tests', 'POST', { ...test, pointId: 'T1-P1', n: 0 }),
    ).rejects.toThrow(/repeat/);
    await mockRequest('/trials/T1/tests', 'POST', { ...test, pointId: 'T1-P1' });
    expect(((await mockRequest('/trials/T1')) as TrialDetail).baselineDone).toBe(false);
    for (const pointId of ['T1-P2', 'T1-P3'])
      await mockRequest('/trials/T1/tests', 'POST', { ...test, pointId });
    expect(((await mockRequest('/trials/T1')) as TrialDetail).baselineDone).toBe(true);
  });
  it('adds dated re-tests without changing the baseline sample count', async () => {
    const input = {
      phase: 'retest',
      metric: 'infiltration_mm_hr',
      value: 25,
      n: 2,
      pointId: 'S1-P1',
    };
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));
    await mockRequest('/trials/S1/tests', 'POST', input);
    vi.setSystemTime(new Date('2026-10-15T10:01:00Z'));
    await mockRequest('/trials/S1/tests', 'POST', { ...input, value: 26 });
    vi.useRealTimers();
    const trial = (await mockRequest('/trials/S1')) as TrialDetail;
    expect(trial.tests.filter((t) => t.pointId === 'S1-P1' && t.phase === 'retest')).toHaveLength(
      10,
    );
    expect(trial.n).toBe(6);
  });
  it('blocks contamination and temperature mismatches despite checked maturity boxes', async () => {
    const mature = (await mockRequest('/batches/B-03')) as BatchDetail;
    expect(maturityReason({ ...mature.checks, plasticsFound: true }, 29, 2)).toMatch(
      /contamination/,
    );
    expect(maturityReason(mature.checks, 47, 2)).toMatch(/ambient/);
  });
  it('records successful lineage without removing the synthetic flag', async () => {
    await mockRequest('/batches/B-03/allocate', 'POST', allocation);
    const trial = (await mockRequest('/trials/S1')) as TrialDetail;
    expect(trial.batchId).toBe('B-03');
    expect(trial.doseLabel).toBe('Pilot dose B');
    expect(trial.synthetic).toBe(true);
  });
});
describe('human prompt rules', () => {
  it('uses configured thresholds and covers leachate', () => {
    const batch = generateMock().batches[0];
    const rules = evaluateRules(batch.readings, batch.checks, config);
    expect(rules.map((r) => r.action)).toEqual([
      'Add dry carbon',
      'Cover bay, hold turning, check sump',
      'Check and empty the sump',
    ]);
    expect(
      evaluateRules(batch.readings, batch.checks, {
        ...config,
        temperature: { ...config.temperature, turnBelow: 40 },
      }).some((r) => r.action === 'Turn pile'),
    ).toBe(false);
  });
});

it('keeps unresolved carry-over faults in a date window and exposes the ponding threshold', async () => {
  resetMock();
  const rules = (await mockRequest('/fault-rules')) as FaultRule[];
  expect(rules.find((r) => r.id === 'RULE-PERSISTENT-PONDING-001')?.thresholdKeys).toContain(
    'inspection.standingWaterH',
  );
  const path =
    '/faults?from=' +
    new Date(Date.parse(DEMO_NOW) + 86400000).toISOString() +
    '&to=' +
    new Date(Date.parse(DEMO_NOW) + 2 * 86400000).toISOString();
  expect(((await mockRequest(path)) as Fault[]).some((f) => f.id === 'F-001')).toBe(true);
  await mockRequest('/faults/F-001/status', 'POST', { status: 'closed', user: 'Operator' });
  expect(((await mockRequest(path)) as Fault[]).some((f) => f.id === 'F-001')).toBe(false);
});
