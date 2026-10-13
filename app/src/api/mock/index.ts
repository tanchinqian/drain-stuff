import type { AllocationInput, BatchDetail, FaultAction, Guardrails, TestInput } from '../types';
import { allocateBatch, parseBatchChecks, recordGuardrails, recordTrialTest } from './mutations';
import { generateMock, DEMO_NOW, type Database } from './seed';
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
    const saved = raw as Database;
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
          f.featureId === alert.featureId && f.partId === alert.partId && f.ruleId === alert.ruleId,
      )
    )
      db.faults.push(alert);
}
refreshSensors();
export async function mockRequest(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const url = new URL(path, 'http://mock.local');
  const segments = url.pathname.split('/').filter(Boolean);
  const [resource, id, action] = segments;
  if (method === 'GET') {
    if (resource === 'sensors')
      return structuredClone(
        sensorRows(db.sensors, {
          ownerId: url.searchParams.get('ownerId') || undefined,
          zone: url.searchParams.get('zone') || undefined,
          partId: url.searchParams.get('partId') || undefined,
          status: url.searchParams.get('status') || undefined,
        }),
      );
    if (resource === 'fault-rules') return structuredClone(faultRules);
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
    if (resource === 'rainfall' && id === 'zones')
      return db.zones.map((z) => ({
        synthetic: true,
        zone: z.id,
        peakMmPerHr: z.peakMmPerHr,
        totalMm: z.peakMmPerHr * 0.57,
      }));
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
          (f) => !url.searchParams.get('status') || f.status === url.searchParams.get('status'),
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
  if (resource === 'faults' && action === 'actions') {
    const fault = find(db.faults, (f) => f.id === id);
    const a = input.action as FaultAction;
    if (!['inspected', 'cleaned', 'work_order'].includes(a))
      throw new Error('Unknown fault action.');
    fault.status = a === 'cleaned' ? 'closed' : 'inspected';
    db.actions.push({ faultId: id, action: a, t: DEMO_NOW });
  } else if (resource === 'trials' && action === 'tests') {
    recordTrialTest(
      db,
      find(db.trials, (t) => t.featureId === id),
      input as unknown as TestInput,
    );
  } else if (resource === 'trials' && action === 'guardrails') {
    recordGuardrails(
      find(db.trials, (t) => t.featureId === id),
      input as unknown as Guardrails,
    );
  } else if (resource === 'batches' && action === 'readings') {
    const batch = find(db.batches, (b) => b.id === id);
    batch.readings.push({
      synthetic: true,
      t: DEMO_NOW,
      tempC: finite(input.tempC, 0, 100),
      moisturePct: finite(input.moisturePct, 0, 100),
      photoUrl: typeof input.photoUrl === 'string' ? input.photoUrl : undefined,
    });
  } else if (resource === 'batches' && action === 'checks') {
    const batch = find(db.batches, (b) => b.id === id);
    batch.checks = parseBatchChecks(batch.checks, input);
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
  persist();
  return ok;
}
