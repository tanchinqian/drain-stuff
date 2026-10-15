import type {
  AllocationInput,
  BatchChecks,
  BatchDetail,
  Guardrails,
  Metric,
  Reading,
  TestInput,
  TrialDetail,
} from '../types';
import { type Database } from './seed';
import { maturityReason } from './rules';
const finite = (v: unknown, max = 1000) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max)
    throw new Error('Enter a finite value within the configured range.');
  return v;
};
export function recordTrialTest(db: Database, trial: TrialDetail, input: TestInput) {
  const recordedAt = new Date().toISOString();
  finite(input.value);
  if (
    !['baseline', 'retest'].includes(input.phase) ||
    !['infiltration_mm_hr', 'drain_down_h', 'sediment_mm'].includes(input.metric)
  )
    throw new Error('Choose a valid phase and measurement.');
  if (
    !Array.from(
      { length: trial.markedPoints },
      (_, i) => trial.featureId + '-P' + (i + 1),
    ).includes(input.pointId)
  )
    throw new Error('Use the trial’s existing marked points.');
  if (!Number.isInteger(input.n) || input.n < 1 || input.n > 20)
    throw new Error('Enter 1 to 20 repeats.');
  if (input.phase === 'retest' && !trial.baselineDone)
    throw new Error('Complete the baseline first.');
  if (input.phase === 'baseline' && trial.baselineDone)
    throw new Error('The completed baseline is locked. Record a re-test.');
  if (input.phase === 'baseline' && input.metric !== 'infiltration_mm_hr')
    throw new Error('The baseline requires an infiltration test.');
  if (input.phase === 'baseline' && trial.soilTexture === 'Not recorded') {
    if (!input.soilTexture || input.soilTexture === 'Not recorded')
      throw new Error('Record the soil texture before the baseline.');
    trial.soilTexture = input.soilTexture;
  }
  const unit =
    input.metric === 'infiltration_mm_hr' ? 'mm/h' : input.metric === 'drain_down_h' ? 'h' : 'mm';
  const test = {
    synthetic: true as const,
    t: recordedAt,
    phase: input.phase,
    metric: input.metric,
    value: input.value,
    unit,
    pointId: input.pointId,
    n: input.n,
  };
  const existing = trial.tests.findIndex(
    (t) =>
      (input.phase === 'baseline' || t.t === recordedAt) &&
      t.pointId === input.pointId &&
      t.phase === input.phase &&
      t.metric === input.metric,
  );
  if (existing >= 0) trial.tests[existing] = test;
  else trial.tests.push(test);
  trial.baselineDone = Array.from({ length: trial.markedPoints }, (_, i) =>
    trial.tests.some(
      (t) =>
        t.phase === 'baseline' &&
        t.metric === 'infiltration_mm_hr' &&
        t.pointId === trial.featureId + '-P' + (i + 1),
    ),
  ).every(Boolean);
  trial.n = trial.baselineDone
    ? trial.tests.filter((t) => t.phase === 'baseline').reduce((n, t) => n + t.n, 0)
    : 0;
  trial.nextRetestDue = new Date(Date.parse(recordedAt) + 7 * 86400000).toISOString().slice(0, 10);
  const current = trial.tests.filter(
    (t) => t.t === recordedAt && t.phase === input.phase && t.metric === input.metric,
  );
  const value = current.reduce((sum, t) => sum + t.value, 0) / current.length;
  const reading: Reading = {
    synthetic: true,
    t: recordedAt,
    metric: input.metric,
    value,
    unit,
    sensorId:
      trial.featureId +
      (input.metric === 'infiltration_mm_hr'
        ? '-INF-P' + input.pointId.split('-P')[1]
        : input.metric === 'sediment_mm'
          ? '-SEDIMENT'
          : '-OUTLET'),
    n: current.reduce((sum, t) => sum + t.n, 0),
  };
  const series = db.readings[trial.featureId] || [];
  const at = series.findIndex((r) => r.t === recordedAt && r.metric === input.metric);
  if (at >= 0) series[at] = reading;
  else series.push(reading);
  db.readings[trial.featureId] = series;
  if (input.metric === 'drain_down_h')
    trial.guardrails.drainDownFlag = current.some((t) => t.value > db.config.drainDownLimitH);
}
export function recordGuardrails(trial: TrialDetail, checks: Guardrails) {
  if (
    !['not_tested', 'pass', 'fail'].includes(checks.nutrientExport) ||
    !['pending', 'ok', 'issue'].includes(checks.postStormCheck)
  )
    throw new Error('Choose valid guardrail results.');
  if (
    typeof checks.noOpenDrainContact !== 'boolean' ||
    typeof checks.washoutChecked !== 'boolean' ||
    typeof checks.cloggingChecked !== 'boolean'
  )
    throw new Error('Record each guardrail checklist item.');
  if (checks.nutrientExport !== 'not_tested' && !checks.outletSample)
    throw new Error('Record an outlet sample before marking the nutrient check.');
  if (checks.outletSample) finite(checks.outletSample.value);
  if (checks.postStormCheck !== 'pending' && (!checks.washoutChecked || !checks.cloggingChecked))
    throw new Error('Check washout and clogging before completing the post-storm result.');
  trial.guardrails = { ...checks, drainDownFlag: trial.guardrails.drainDownFlag };
}
export function allocateBatch(db: Database, batch: BatchDetail, input: AllocationInput) {
  const trial = db.trials.find((t) => t.featureId === input.featureId);
  if (!trial) throw new Error('Trial not found.');
  const reason = maturityReason(
    batch.checks,
    batch.readings.at(-1)?.tempC,
    db.config.temperature.ambientToleranceC,
  );
  if (reason) throw new Error(reason);
  if (!trial.baselineDone)
    throw new Error('Complete the baseline at the same marked points first.');
  if (trial.arm !== 'compost')
    throw new Error('The control and decompaction arms receive no compost.');
  finite(input.lPerM2);
  if (input.lPerM2 > db.config.doseCapLPerM2)
    throw new Error('Pilot dose exceeds the configured dose cap.');
  if (!db.config.pilotDoses.some((d) => d.label === input.doseLabel && d.lPerM2 === input.lPerM2))
    throw new Error('Choose a configured, labelled pilot dose.');
  if (!trial.guardrails.noOpenDrainContact)
    throw new Error('Confirm no contact with an open drain before allocation.');
  if (typeof input.appliedBy !== 'string' || !input.appliedBy.trim())
    throw new Error('Record who applied the batch.');
  if (input.amendedDepthM !== undefined) {
    finite(input.amendedDepthM, 1);
    if (input.amendedDepthM <= 0) throw new Error('Record a positive mixing depth.');
  }
  trial.doseLabel = input.doseLabel;
  trial.doseCapOk = true;
  trial.batchId = batch.id;
  trial.appliedAt = new Date().toISOString();
  trial.appliedBy = input.appliedBy;
  if (input.amendedDepthM !== undefined) trial.amendedDepthM = input.amendedDepthM;
  (trial.history ??= []).push({
    id: crypto.randomUUID(),
    t: new Date().toISOString(),
    user: input.appliedBy,
    action: 'Compost allocated',
    note: batch.id + ' / ' + input.lPerM2 + ' L/m2',
  });
  batch.status = 'released';
}
export function parseBatchChecks(
  previous: BatchChecks,
  input: Record<string, unknown>,
): BatchChecks {
  const keys = [
    'ambientReached',
    'didNotReheat',
    'manualMaturity',
    'intakeChecked',
    'plasticsFound',
    'glassFound',
    'bayCovered',
    'sumpChecked',
    'rainExpected',
    'puddles',
    'pests',
  ] as const;
  keys.forEach((key) => {
    if (typeof input[key] !== 'boolean') throw new Error('Complete the batch checklist.');
  });
  if (
    !['wet', 'ok', 'dry'].includes(String(input.squeeze)) ||
    !['normal', 'putrid', 'ammonia', 'sour'].includes(String(input.smell))
  )
    throw new Error('Choose a squeeze result and smell log.');
  return {
    ...previous,
    squeeze: input.squeeze as BatchChecks['squeeze'],
    smell: input.smell as BatchChecks['smell'],
    sumpLevelCm: finite(input.sumpLevelCm, 200),
    ...(Object.fromEntries(keys.map((key) => [key, input[key]])) as Omit<
      BatchChecks,
      'photoUrl' | 'ambientTempC' | 'squeeze' | 'smell' | 'sumpLevelCm'
    >),
    ambientTempC: finite(input.ambientTempC, 60),
    photoUrl: typeof input.photoUrl === 'string' ? input.photoUrl : previous.photoUrl,
  };
}
export const metricUnit: Record<Metric, string> = {
  infiltration_mm_hr: 'mm/h',
  drain_down_h: 'h',
  sediment_mm: 'mm',
  water_level_cm: 'cm',
};
