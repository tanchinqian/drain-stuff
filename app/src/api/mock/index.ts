import { createOfflineApi } from '../../../../shared/src/offlineApi';
import { createDataStore } from '../../../../shared/src/api/store';
import { rebaseDates } from '../../clock';
import { generateMock, DEMO_NOW, SEED_REFERENCE, type Database } from './seed';
import { legacyParts } from '../modelCatalog';
import { seedSensors, sensorSnapshot } from './sensors';
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

const store = createDataStore(db, (snapshot) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    /* Continue in memory. */
  }
});
let offline = createOfflineApi(store);
export const resetMock = () => {
  store.reset();
  offline = createOfflineApi(store);
};
export async function mockRequest(path: string, method = 'GET', body?: unknown) {
  const extra = await offline(path, method, body);
  return extra === undefined ? store.request(path, method, body) : extra;
}
