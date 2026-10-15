import { expect, test } from 'vitest';
import { loadedAt, rebaseDates } from './clock';
import { generateMock, DEMO_NOW } from './api/mock/seed';
import { trialStatus } from './utils';
test('new observations are anchored to the real load clock', () => {
  const db = generateMock();
  expect(db.clockAnchor).toBe(loadedAt);
  expect(db.rainfall.at(-1)?.t).toBe(DEMO_NOW);
  expect(Math.abs(Date.now() - Date.parse(DEMO_NOW))).toBeLessThan(60000);
  expect(db.batches[0].startedAt).not.toBe('2026-07-10');
});
test('legacy date migration preserves audit history and newer manual observations', () => {
  const v = {
    t: '2026-10-12T01:40:00.000Z',
    history: [{ t: '2026-10-15T10:00:00.000Z' }],
    manual: { t: '2026-10-15T10:00:00.000Z' },
  };
  const moved = rebaseDates(v, '2026-10-12T01:40:00.000Z', '2026-10-20T01:40:00.000Z', true);
  expect(moved.t).toBe('2026-10-20T01:40:00.000Z');
  expect(moved.history).toEqual(v.history);
  expect(moved.manual).toEqual(v.manual);
});
test('trial readiness uses the latest test as well as the recorded due date', () => {
  const trials = generateMock().trials;
  expect(trialStatus(trials.find((t) => t.featureId === 'T1')!)).toBe('Needs baseline');
  expect(trialStatus(trials.find((t) => t.featureId === 'T2')!)).toBe('Overdue');
  expect(
    trialStatus(
      trials.find((t) => t.featureId === 'S1')!,
      new Date(DEMO_NOW),
    ),
  ).toBe('On track');
});
