import { nowIso, rebaseDates } from '../../clock';
import type {
  Fault,
  FaultRule,
  AuditEntry,
  AllocationInput,
  BatchDetail,
  FaultAction,
  Guardrails,
  TestInput,
} from '../types';
import { allocateBatch, parseBatchChecks, recordGuardrails, recordTrialTest } from './mutations';
import { generateMock, DEMO_NOW, SEED_REFERENCE, type Database } from './seed';
import { evaluateRules, maturityReason } from './rules';
import { buildParts } from '../parts';
import { legacyParts, faultRules } from '../modelCatalog';
import { sensorRows } from '../sensorViews';
import { seedSensors, sensorSnapshot } from './sensors';
import { inspectionFaults } from './inspectionRules';
const storageKey = 'drain-trial-console-v1';
let db = generateMock();
try {
  const raw: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (
    raw &&
    typeof raw === 'object' &&
    'version' in raw &&
    (raw.version === 1 || raw.version === 2) &&
    'trials' in raw &&
    Array.isArray(raw.trials)
  ) {
    const original = raw as Database;
    const saved = original.clockAnchor
      ? original
      : rebaseDates(original, SEED_REFERENCE, DEMO_NOW, true);
    saved.clockAnchor ??= DEMO_NOW;
    const defaults = generateMock();
    // Refresh map geometry without replacing saved inspections, trials or allocations.
    saved.houses.forEach((h) => {
      const mapped = defaults.houses.find((p) => p.id === h.id);
      if (mapped) {
        h.x = mapped.x;
        h.y = mapped.y;
      }
    });
    saved.features.forEach((f) => {
      const mapped = defaults.features.find((p) => p.id === f.id);
      if (mapped) {
        f.x = mapped.x;
        f.y = mapped.y;
      }
    });
    saved.version = 2;
    saved.config = {
      ...defaults.config,
      ...saved.config,
      contractVersion: '2.0.0',
      temperature: { ...defaults.config.temperature, ...saved.config.temperature },
      schematic: saved.config.schematic ?? defaults.config.schematic,
      inspection: saved.config.inspection ?? defaults.config.inspection,
    };
    saved.batches.forEach((b) => {
      b.checks.squeeze ??= 'ok';
      b.checks.smell ??= 'normal';
      b.checks.sumpLevelCm ??= 4;
      b.checks.puddles ??= false;
      b.checks.pests ??= false;
    });
    saved.sensors ??= seedSensors(saved, DEMO_NOW);
    saved.faults.forEach((f) => {
      f.partId = legacyParts[f.partId] ?? f.partId;
      f.ruleId ??= f.type === 'sensor_offline' ? 'sensor_trust' : 'inlet_debris';
      f.sensorIds ??= [f.featureId + (f.partId === 'sock' ? '-INLET' : '-OUTLET')];
      f.sensorStatusesAtAlert ??= sensorSnapshot(saved.sensors, f.sensorIds);
      f.diagnosingInput ??= 'Legacy record: verify the original inspection input';
    });
    Object.entries(saved.readings).forEach(([owner, rows]) =>
      rows.forEach((r) => {
        if (r.sensorId.startsWith('DEMO-'))
          r.sensorId =
            owner +
            (r.metric === 'infiltration_mm_hr'
              ? '-INF-P1'
              : r.metric === 'sediment_mm'
                ? '-SEDIMENT'
                : '-OUTLET');
      }),
    );
    db = saved;
  }
} catch {
  /* Missing or incompatible demo storage starts with the deterministic seed. */
}
export const resetMock = () => {
  db = generateMock();
  refreshSensors();
  normalizeFaults();
  persist();
};
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(db));
  } catch {
    /* The mock remains usable in memory when storage is unavailable. */
  }
}
const find = <T>(items: T[], predicate: (item: T) => boolean) => {
  const item = items.find(predicate);
  if (!item) throw new Error('Record not found. Refresh the list and choose another record.');
  return item;
};
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') throw new Error('Invalid request.');
  return value as Record<string, unknown>;
};
const finite = (value: unknown, min = 0, max = 1000): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Enter a number between ${min} and ${max}.`);
  return value;
};
const ok = { ok: true as const, synthetic: true as const };
function batchDetail(batch: BatchDetail) {
  const reason = maturityReason(
    batch.checks,
    batch.readings.at(-1)?.tempC,
    db.config.temperature.ambientToleranceC,
  );
  return {
    ...batch,
    maturityGate: reason ? 'blocked' : 'passed',
    gateReason: reason || undefined,
    rules: evaluateRules(batch.readings, batch.checks, db.config),
  };
}
function refreshSensors() {
  const previous = db.sensors;
  db.sensors = seedSensors(db, DEMO_NOW).map((s) => {
    const old = previous.find((p) => p.sensorId === s.sensorId);
    return old ? { ...s, calibratedAt: old.calibratedAt, status: old.status, drift: old.drift } : s;
  });
  for (const alert of inspectionFaults(db.sensors, db.batches, db.config))
    if (
      !db.faults.some(
        (f) =>
          f.featureId === alert.featureId &&
          f.partId === alert.partId &&
          (f.ruleId === alert.ruleId ||
            f.ruleId === registry.find((r) => r.legacyId === alert.ruleId)?.id),
      )
    )
      db.faults.push(alert);
}
const audit = (action: string, note?: string, user = 'Local operator'): AuditEntry => ({
  id: crypto.randomUUID(),
  t: nowIso(),
  user,
  action,
  note,
});
const ruleThresholds: Record<string, string[]> = {
  persistent_ponding: ['inspection.standingWaterH'],
  not_heating: ['inspection.compostNotHeatingC'],
  too_wet: ['moisture.max'],
  leachate_after_rain: ['inspection.sumpWatchCm'],
  maturity: ['temperature.ambientToleranceC'],
  infiltration_protocol: ['minTests'],
};
const ruleTriggers: Record<string, string> = {
  persistent_ponding: 'Standing water persists beyond inspection.standingWaterH after rain.',
  not_heating: 'Latest pile temperature is below inspection.compostNotHeatingC.',
  too_wet: 'Moisture exceeds moisture.max, squeeze is Wet, or puddles are recorded.',
  leachate_after_rain:
    'Rain expected with incomplete cover or sump check, or sump exceeds inspection.sumpWatchCm.',
  sensor_trust: 'Input is suspect, offline or has a drift flag.',
  maturity: 'Ambient reached, no reheat and manual maturity checks must all pass.',
};
const registry: (FaultRule & { legacyId: string })[] = faultRules.map((r) => {
  const inputs = db.sensors.filter((s) => s.usedByRules.includes(r.id));
  return {
    ...r,
    id: `RULE-${r.id.replaceAll('_', '-').toUpperCase()}-001`,
    legacyId: r.id,
    title: r.label,
    appliesTo: Array.from(new Set(inputs.flatMap((s) => s.linkedPartIds))),
    diagnosingInputs: inputs.map((s) => s.sensorId),
    sensorTypes: Array.from(new Set(inputs.map((s) => s.type))),
    thresholdKeys: ruleThresholds[r.id] ?? [],
    triggerCondition: ruleTriggers[r.id] ?? 'A positive manual inspection finding for this part.',
    severity: r.id === 'inlet_debris' || r.id === 'leachate_after_rain' ? 3 : 2,
    steps: [r.check],
    source: 'Practitioner review required',
    version: '1.0.0',
  };
});
function normalizeFaults() {
  db.config.contractVersion = '3.0.0';
  db.config.dataThrough = db.rainfall.at(-1)?.t ?? DEMO_NOW;
  db.batches.forEach((b) =>
    b.readings.forEach((r, i) => {
      r.prompts ??= evaluateRules(b.readings.slice(0, i + 1), b.checks, db.config);
    }),
  );
  db.config.minTests ??= db.config.minimumN;
  db.faults.forEach((f, i) => {
    f.ruleKey ??= f.id;
    f.id = `F-${String(i + 1).padStart(3, '0')}`;
    f.raisedBy ??= 'rule';
    f.history ??= [];
    const r = registry.find((r) => r.id === f.ruleId || r.legacyId === f.ruleId);
    if (r) f.ruleId = r.id;
    if (f.openedAt === DEMO_NOW)
      f.openedAt = new Date(Date.parse(DEMO_NOW) - (i + 1) * 3 * 3600000).toISOString();
  });
}
refreshSensors();
normalizeFaults();
export async function mockRequest(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const url = new URL(path, 'http://mock.local');
  const segments = url.pathname.split('/').filter(Boolean);
  const [resource, id, action] = segments;
  if (method === 'GET') {
    if (resource === 'sensors' && id && action === 'readings') {
      const sensor = find(db.sensors, (s) => s.sensorId === id);
      const rows = (db.readings[sensor.ownerId] ?? []).filter((r) => r.sensorId === id);
      return structuredClone(
        rows.length
          ? rows
          : sensor.lastValue === null
            ? []
            : [
                {
                  synthetic: true,
                  t: sensor.lastAt,
                  metric: sensor.metric,
                  value: sensor.lastValue,
                  unit: sensor.unit,
                  sensorId: id,
                },
              ],
      );
    }
    if (resource === 'sensors' && id)
      return structuredClone(find(db.sensors, (s) => s.sensorId === id));
    if (resource === 'sensors')
      return structuredClone(
        sensorRows(db.sensors, {
          ownerId: url.searchParams.get('ownerId') || undefined,
          zone: url.searchParams.get('zone') || undefined,
          partId: url.searchParams.get('partId') || undefined,
          status: url.searchParams.get('status') || undefined,
        }),
      );
    if (resource === 'fault-rules')
      return structuredClone(id ? find(registry, (r) => r.id === id) : registry);
    if (resource === 'config') return structuredClone(db.config);
    if (resource === 'zones') return structuredClone(db.zones);
    if (resource === 'houses')
      return structuredClone(
        db.houses.filter(
          (h) => !url.searchParams.get('zone') || h.zone === url.searchParams.get('zone'),
        ),
      );
    if (resource === 'features' && !id) return structuredClone(db.features);
    if (resource === 'features' && id) {
      const feature = db.features.find((f) => f.id === id);
      const house = db.houses.find((h) => h.drainId === id);
      if (!feature && !house) throw new Error('Feature not found.');
      return structuredClone({
        ...feature,
        ...(house
          ? {
              synthetic: true,
              id,
              name: house.id + ' house drain',
              kind: 'inlet',
              arm: null,
              zone: house.zone,
              x: house.x,
              y: house.y,
              status: 'watch',
            }
          : {}),
        parts: buildParts(id, db.sensors, db.faults),
        ownerOfRecord: house?.ownerOfRecord || 'Zone ' + feature?.zone + ' maintenance lead',
        installedAt: '2026-08-17',
      });
    }
    if (resource === 'rainfall' && id === 'zones') {
      const from = url.searchParams.get('from') || '',
        to = url.searchParams.get('to') || '9999';
      return db.zones.flatMap((z) =>
        db.rainfall
          .filter((r) => r.t >= from && r.t <= to)
          .map((r) => ({
            synthetic: true,
            zone: z.id,
            t: r.t,
            mmPerHr: (r.mmPerHr * z.peakMmPerHr) / 63,
            peakMmPerHr: (r.mmPerHr * z.peakMmPerHr) / 63,
            totalMm: (r.cumulativeMm * z.peakMmPerHr) / 63,
          })),
      );
    }
    if (resource === 'rainfall') {
      const from = url.searchParams.get('from') || '',
        to = url.searchParams.get('to') || '9999';
      return structuredClone(db.rainfall.filter((p) => p.t >= from && p.t <= to));
    }
    if (resource === 'readings') {
      const rows = db.readings[url.searchParams.get('featureId') || ''] || [];
      return structuredClone(
        rows.filter(
          (r) =>
            (!url.searchParams.get('metric') || r.metric === url.searchParams.get('metric')) &&
            (!url.searchParams.get('from') || r.t >= url.searchParams.get('from')!) &&
            (!url.searchParams.get('to') || r.t <= url.searchParams.get('to')!),
        ),
      );
    }
    if (resource === 'faults')
      return structuredClone(
        db.faults.filter(
          (f) =>
            (!url.searchParams.get('status') || f.status === url.searchParams.get('status')) &&
            (f.status !== 'closed' ||
              ((!url.searchParams.get('from') || f.openedAt >= url.searchParams.get('from')!) &&
                (!url.searchParams.get('to') || f.openedAt <= url.searchParams.get('to')!))),
        ),
      );
    if (resource === 'trials')
      return structuredClone(id ? find(db.trials, (t) => t.featureId === id) : db.trials);
    if (resource === 'batch-parts')
      return structuredClone(buildParts(id, db.sensors, db.faults, true));
    if (resource === 'batches')
      return structuredClone(
        id ? batchDetail(find(db.batches, (b) => b.id === id)) : db.batches.map(batchDetail),
      );
  }
  if (method !== 'POST') throw new Error('Unsupported mock request.');
  const input = record(body);
  if (resource === 'faults' && action === 'status') {
    const fault = find(db.faults, (f) => f.id === id);
    if (!['open', 'inspected', 'closed'].includes(String(input.status)))
      throw new Error('Choose a valid status.');
    if (typeof input.user !== 'string' || !input.user.trim())
      throw new Error('Record who made the change.');
    const previous = fault.status;
    fault.status = input.status as Fault['status'];
    (fault.history ??= []).push(
      audit(
        `${fault.id} moved to ${fault.status[0].toUpperCase() + fault.status.slice(1)} (from ${previous})`,
        typeof input.note === 'string' ? input.note : undefined,
        input.user,
      ),
    );
    persist();
    return structuredClone(fault);
  } else if (resource === 'faults' && !id) {
    const feature = find(db.features, (f) => f.id === input.featureId);
    if (
      ![
        'blockage',
        'sediment',
        'standing_water',
        'mulch_loss',
        'sensor_offline',
        'scour',
        'joint_leak',
        'missing_cap',
        'sparse_planting',
        'not_heating',
        'too_wet',
        'pests',
        'leachate',
      ].includes(String(input.type))
    )
      throw new Error('Choose a valid fault type.');
    if (
      typeof input.note !== 'string' ||
      !input.note.trim() ||
      typeof input.user !== 'string' ||
      !input.user.trim()
    )
      throw new Error('Add a description and reporter.');
    const part = buildParts(feature.id, db.sensors, []).find((p) => p.partId === input.partId);
    if (!part) throw new Error('Choose a part at this asset.');
    const row: Fault = {
      synthetic: true,
      id: `F-${String(db.faults.length + 1).padStart(3, '0')}`,
      ruleKey: crypto.randomUUID(),
      featureId: feature.id,
      partId: part.partId,
      type: input.type as Fault['type'],
      ruleId: 'MANUAL',
      sensorIds: [],
      sensorStatusesAtAlert: {},
      diagnosingInput: input.note,
      severity: finite(input.severity, 1, 3) as 1 | 2 | 3,
      openedAt: nowIso(),
      status: 'open',
      zone: feature.zone,
      raisedBy: 'manual',
      history: [audit('Reported', input.note, input.user)],
    };
    db.faults.push(row);
    persist();
    return structuredClone(row);
  } else if (resource === 'faults' && action === 'actions') {
    const fault = find(db.faults, (f) => f.id === id);
    const a = input.action as FaultAction;
    if (!['inspected', 'cleaned', 'work_order'].includes(a))
      throw new Error('Unknown fault action.');
    fault.status = a === 'cleaned' ? 'closed' : 'inspected';
    db.actions.push({ faultId: id, action: a, t: nowIso() });
    (fault.history ??= []).push(
      audit(
        a === 'inspected'
          ? 'Inspected'
          : a === 'cleaned'
            ? 'Cleaned and closed'
            : 'Work order raised',
      ),
    );
  } else if (resource === 'trials' && action === 'tests') {
    recordTrialTest(
      db,
      find(db.trials, (t) => t.featureId === id),
      input as unknown as TestInput,
    );
    const trial = find(db.trials, (t) => t.featureId === id);
    (trial.history ??= []).push(
      audit('Test saved', String(input.pointId) + ' / ' + String(input.value)),
    );
  } else if (resource === 'trials' && (action === 'guardrails' || action === 'checks')) {
    const trial = find(db.trials, (t) => t.featureId === id);
    recordGuardrails(trial, input as unknown as Guardrails);
    (trial.history ??= []).push(audit('Safety checks saved'));
  } else if (resource === 'batches' && action === 'readings') {
    const batch = find(db.batches, (b) => b.id === id);
    batch.readings.push({
      synthetic: true,
      t: nowIso(),
      tempC: finite(input.tempC, 0, 100),
      moisturePct: finite(input.moisturePct, 0, 100),
      photoUrl: typeof input.photoUrl === 'string' ? input.photoUrl : undefined,
    });
    batch.readings.at(-1)!.prompts = evaluateRules(batch.readings, batch.checks, db.config);
  } else if (resource === 'batches' && action === 'checks') {
    const batch = find(db.batches, (b) => b.id === id);
    batch.checks = parseBatchChecks(batch.checks, input);
    (batch.checkHistory ??= []).push({
      ...audit(batch.id+' checks saved',`Squeeze: ${batch.checks.squeeze}; smell: ${batch.checks.smell}; sump: ${batch.checks.sumpLevelCm} cm`),
      checks: structuredClone(batch.checks),
    });
    const reason = maturityReason(
      batch.checks,
      batch.readings.at(-1)?.tempC,
      db.config.temperature.ambientToleranceC,
    );
    batch.maturityGate = reason ? 'blocked' : 'passed';
    batch.gateReason = reason || undefined;
    if (!reason) batch.status = 'matured';
    else if (batch.checks.ambientReached) batch.status = 'curing';
  } else if (resource === 'batches' && action === 'allocate') {
    allocateBatch(
      db,
      find(db.batches, (b) => b.id === id),
      input as unknown as AllocationInput,
    );
  } else if (resource === 'batches' && !id) {
    db.batches.push({
      synthetic: true,
      id: 'B-DEMO',
      bay: 'Demo bay',
      inputs: [
        { kind: 'food_bokashi', kg: 20 },
        { kind: 'trimmings', kg: 30 },
      ],
      startedAt: DEMO_NOW,
      status: 'active',
      maturityGate: 'blocked',
      readings: [{ synthetic: true, t: DEMO_NOW, tempC: 47, moisturePct: 68 }],
      rules: [],
      checks: {
        squeeze: 'wet',
        smell: 'normal',
        sumpLevelCm: 23,
        puddles: true,
        pests: false,
        ambientTempC: 30,
        ambientReached: false,
        didNotReheat: false,
        manualMaturity: false,
        intakeChecked: true,
        plasticsFound: true,
        glassFound: false,
        bayCovered: false,
        sumpChecked: false,
        rainExpected: true,
      },
    });
  } else throw new Error('Unsupported mock endpoint.');
  refreshSensors();
  normalizeFaults();
  persist();
  return ok;
}
