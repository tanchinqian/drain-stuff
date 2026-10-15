import { beforeEach, expect, test } from 'vitest';
import { featureConfig } from './config';
import { frameAt, runConfig, useSimulation } from './store';
import { simulatePhysics } from './engine';
import { buildParts } from '../../api/parts';
const initial = useSimulation.getState();
beforeEach(() => useSimulation.setState(initial, true));
test('weather and recovery remain shared while conductivity stays local', () => {
  useSimulation.getState().weather('peak', 0.00002);
  expect(
    Object.values(useSimulation.getState().configs).every((c) => c.values.peak.value === 0.00002),
  ).toBe(true);
  useSimulation.getState().parameter('S2', 'recovery', 3600);
  expect(
    Object.values(useSimulation.getState().configs).every((c) => c.values.recovery.value === 3600),
  ).toBe(true);
  useSimulation.getState().parameter('S2', 'ks', 0.00001, 'trial-record', 6);
  expect(useSimulation.getState().configs.S2.sampleCount).toBe(6);
  expect(useSimulation.getState().configs.S1.values.ks.value).not.toBe(0.00001);
  expect(useSimulation.getState().second).toBe(0);
  expect(useSimulation.getState().busy).toBe(true);
});
test('sock scenario changes only the feature with an installed sock', () => {
  expect(runConfig(featureConfig('S1'), 'Clogged sock').values.sockOpen.value).toBe(0.1);
  for (const id of ['S2', 'S3', 'I1', 'T1', 'T2'])
    expect(runConfig(featureConfig(id), 'Clogged sock').values.sockOpen.value).toBe(1);
});
test('timeline lookup holds the latest available frame without looking ahead', () => {
  const c = featureConfig('S1');
  c.values.duration.value = 60;
  c.values.recovery.value = 60;
  const run = simulatePhysics(c, 'uniform');
  expect(frameAt(run, 0)?.second).toBe(0);
  expect(frameAt(run, 8)?.second).toBe(5);
  expect(frameAt(run, 999)?.second).toBe(120);
  expect(frameAt(undefined, 10)).toBeUndefined();
});
test('inlet and tree catalogues expose their installed feature-specific parts', () => {
  const inlet = buildParts('I1', [], []),
    tree = buildParts('T1', [], []);
  expect(inlet).toHaveLength(6);
  expect(inlet.find((p) => p.partId === 'sock')?.name).toBe('Trash screen');
  expect(tree).toHaveLength(13);
  expect(tree.find((p) => p.partId === 'liner')?.installed).toBe(true);
  expect(tree.find((p) => p.partId === 'liner')?.name).toBe('Root barrier');
});
