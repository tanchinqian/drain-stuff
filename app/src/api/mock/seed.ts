import type {
  BatchDetail,
  Config,
  Fault,
  Feature,
  House,
  Metric,
  RainPoint,
  Reading,
  TestResult,
  TrialDetail,
  Zone,
  ZoneId,
  Sensor,
} from '../types';
import { seedSensors, sensorSnapshot } from './sensors';
export const DEMO_NOW = '2026-10-12T01:40:00.000Z';
export const config: Config = {
  synthetic: true,
  contractVersion: '2.0.0',
  placeholderLabel: 'Placeholder, to confirm with a practitioner',
  doseCapLPerM2: 25,
  pilotDoses: [
    { label: 'Pilot dose A', lPerM2: 10 },
    { label: 'Pilot dose B', lPerM2: 15 },
    { label: 'Pilot dose C', lPerM2: 20 },
  ],
  drainDownLimitH: 6,
  minimumN: 12,
  heavyRainMmHr: 50,
  temperature: {
    goodMin: 55,
    goodMax: 65,
    days: 3,
    turnBelow: 50,
    coolAbove: 77,
    ambientToleranceC: 2,
  },
  moisture: { min: 40, max: 60 },
  schematic: {
    label:
      'Typical schematic defaults, confirm against MSMA and the local authority; not a design drawing',
    lengthM: 4.9,
    widthM: 3.55,
    mediaDepthM: 0.55,
    transitionDepthM: 0.15,
    drainageDepthM: 0.3,
    mulchDepthM: 0.1,
    pondingDepthM: 0.25,
    pipeDiameterM: 0.15,
  },
  inspection: { standingWaterH: 48, compostNotHeatingC: 40, sumpWatchCm: 20 },
};
export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let v = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    v ^= v + Math.imul(v ^ (v >>> 7), 61 | v);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}
export interface Database {
  version: 2;
  sensors: Sensor[];
  zones: Zone[];
  houses: House[];
  features: Feature[];
  faults: Fault[];
  rainfall: RainPoint[];
  readings: Record<string, Reading[]>;
  trials: TrialDetail[];
  batches: BatchDetail[];
  actions: { faultId: string; action: string; t: string }[];
  config: Config;
}
export const armValues = {
  control: [13, 14, 13, 14, 13, 14, 13, 14],
  decompaction: [26, 25, 24, 23, 22, 21, 20, 19],
  compost: [16, 17, 18, 18, 19, 20, 21, 22],
};
export function generateMock(seed = 2026): Database {
  const random = seededRandom(seed);
  const ids: ZoneId[] = ['A', 'B', 'C', 'D'];
  const zones = ids.map((id, i) => ({
    synthetic: true as const,
    id,
    name: 'Zone ' + id,
    peakMmPerHr: [52, 68, 34, 18][i],
    housesHoldingWater6h: [4, 2, 1, 0][i],
    housesTotal: 6,
  }));
  const centres = [
    [-4.9, -4.05],
    [4.9, -4.05],
    [-4.9, 4.05],
    [4.9, 4.05],
  ];
  const houses: House[] = zones.flatMap((zone, i) =>
    Array.from({ length: 6 }, (_, j) => ({
      synthetic: true,
      id: zone.id + String(j + 1).padStart(2, '0'),
      zone: zone.id,
      x: centres[i][0] + ((j % 3) - 1) * 2.75,
      y: centres[i][1] + (Math.floor(j / 3) - 0.5) * 2.65,
      drainId: zone.id + String(j + 1).padStart(2, '0') + '-D',
      holdsWater6h: j < zone.housesHoldingWater6h,
      ownerOfRecord: 'Zone ' + zone.id + ' maintenance lead',
      lastReadingAt: DEMO_NOW,
      nearestFeature: ['S1', 'S2', 'S3', 'I1'][i],
    })),
  );
  const features: Feature[] = [
    {
      id: 'S1',
      name: 'Pilot swale',
      kind: 'swale',
      arm: 'compost',
      doseLabel: 'Pilot dose B',
      zone: 'A',
      x: -4.9,
      y: -0.92,
      status: 'fault',
    },
    {
      id: 'S2',
      name: 'Bioretention strip',
      kind: 'swale',
      arm: 'decompaction',
      zone: 'B',
      x: 4.9,
      y: -0.92,
      status: 'ok',
    },
    {
      id: 'S3',
      name: 'Control swale',
      kind: 'swale',
      arm: 'control',
      zone: 'C',
      x: -4.9,
      y: 0.92,
      status: 'watch',
    },
    {
      id: 'I1',
      name: 'Inlet chamber',
      kind: 'inlet',
      arm: null,
      zone: 'B',
      x: 4.9,
      y: 0.92,
      status: 'offline',
    },
    {
      id: 'T1',
      name: 'Tree pit 1',
      kind: 'tree_pit',
      arm: 'compost',
      zone: 'D',
      x: 6.8,
      y: 5.9,
      status: 'watch',
    },
    {
      id: 'T2',
      name: 'Tree pit 2',
      kind: 'tree_pit',
      arm: 'compost',
      zone: 'D',
      x: 3.5,
      y: 5.9,
      status: 'watch',
    },
  ].map((f) => ({ ...f, synthetic: true })) as Feature[];
  const faults = [
    { id: 'F-001', featureId: 'S1', partId: 'sock', type: 'blockage', severity: 3, zone: 'A' },
    {
      id: 'F-002',
      featureId: 'I1',
      partId: 'outfall',
      type: 'sensor_offline',
      severity: 2,
      zone: 'B',
    },
    {
      id: 'F-003',
      featureId: 'A04-D',
      partId: 'outfall',
      type: 'standing_water',
      severity: 2,
      zone: 'A',
    },
  ].map((f) => ({
    ...f,
    synthetic: true,
    openedAt: DEMO_NOW,
    status: 'open',
    ruleId:
      f.type === 'sensor_offline'
        ? 'sensor_trust'
        : f.type === 'standing_water'
          ? 'outlet_condition'
          : 'inlet_debris',
    sensorIds: [],
    sensorStatusesAtAlert: {},
    diagnosingInput: 'Level history + visual inspection',
  })) as Fault[];
  const rainfall: RainPoint[] = [];
  for (let day = 55; day >= 0; day--) {
    let total = 0;
    [5, 12, 24, 41, 63, 51, 36, 22, 11, 4].forEach((peak, i) => {
      const mmPerHr = day === 0 ? peak : Math.round(peak * (0.3 + random() * 0.65));
      total += mmPerHr / 6;
      rainfall.push({
        synthetic: true,
        t: new Date(Date.parse(DEMO_NOW) - day * 86400000 - (9 - i) * 600000).toISOString(),
        mmPerHr,
        cumulativeMm: Math.round(total * 10) / 10,
      });
    });
  }
  const readings: Record<string, Reading[]> = {};
  const reading = (metric: Metric, value: number, t = DEMO_NOW, n?: number): Reading => ({
    synthetic: true,
    t,
    metric,
    value,
    unit: {
      infiltration_mm_hr: 'mm/h',
      drain_down_h: 'h',
      sediment_mm: 'mm',
      water_level_cm: 'cm',
    }[metric],
    sensorId: 'DEMO-' + metric,
    n,
  });
  features.forEach((f) => {
    readings[f.id] = f.arm
      ? armValues[f.arm].map((value, i) =>
          reading(
            'infiltration_mm_hr',
            value,
            new Date(Date.parse(DEMO_NOW) - (7 - i) * 7 * 86400000).toISOString(),
            6,
          ),
        )
      : [];
    if (['S1', 'S2', 'S3'].includes(f.id))
      readings[f.id].push(
        reading('drain_down_h', ({ S1: 2.5, S2: 4, S3: 6.5 } as Record<string, number>)[f.id]),
      );
    readings[f.id].push(reading('sediment_mm', f.id === 'S1' ? 42 : 8));
  });
  houses.forEach((h) => {
    readings[h.drainId] = Array.from({ length: 5 }, (_, i) =>
      reading(
        'drain_down_h',
        Math.round((h.holdsWater6h ? 6.1 : 2.1) * 10 + random() * 7) / 10,
        new Date(Date.parse(DEMO_NOW) - (4 - i) * 86400000).toISOString(),
      ),
    );
  });
  const trials: TrialDetail[] = features
    .filter((f) => f.arm)
    .map((f) => {
      const baseline = f.id !== 'T1';
      const tests: TestResult[] = baseline
        ? Array.from({ length: 3 }, (_, i) => ({
            synthetic: true,
            t: '2026-08-10T01:40:00.000Z',
            phase: 'baseline',
            metric: 'infiltration_mm_hr',
            value: 13,
            unit: 'mm/h',
            pointId: f.id + '-P' + (i + 1),
            n: 2,
          }))
        : [];
      if (baseline && f.id !== 'T2')
        for (let week = 0; week < 8; week++)
          for (let point = 0; point < 3; point++)
            tests.push({
              synthetic: true,
              t: new Date(Date.parse(DEMO_NOW) - (7 - week) * 7 * 86400000).toISOString(),
              phase: 'retest',
              metric: 'infiltration_mm_hr',
              value: armValues[f.arm!][week],
              unit: 'mm/h',
              pointId: f.id + '-P' + (point + 1),
              n: 2,
            });
      return {
        synthetic: true,
        featureId: f.id,
        arm: f.arm!,
        doseLabel: f.doseLabel,
        doseCapOk: true,
        owner:
          f.id === 'T2'
            ? null
            : {
                name: 'Zone ' + f.zone + ' maintenance lead',
                role: 'Trial custodian',
                since: '2026-08-10',
              },
        soilTexture: f.id === 'T1' ? 'Not recorded' : 'Clay loam · synthetic',
        baselineDone: baseline,
        method: 'Fixed-point ring infiltration test',
        markedPoints: 3,
        repeatsPerPoint: 2,
        n: baseline ? 6 : 0,
        nextRetestDue: f.id === 'S3' ? '2026-10-10' : '2026-10-19',
        batchId: f.id === 'S1' ? 'B-03' : undefined,
        appliedAt: f.id === 'S1' ? '2026-08-17' : undefined,
        appliedBy: f.id === 'S1' ? 'Trial crew' : undefined,
        tests,
        guardrails: {
          nutrientExport: 'not_tested',
          noOpenDrainContact: f.id === 'S1',
          postStormCheck: 'pending',
          washoutChecked: false,
          cloggingChecked: false,
          drainDownFlag: f.id === 'S3',
        },
      };
    });
  const batches: BatchDetail[] = Array.from({ length: 3 }, (_, i) => ({
    synthetic: true,
    id: 'B-0' + (i + 1),
    bay: 'Bay ' + (i + 1),
    inputs: [
      { kind: 'food_bokashi', kg: 35 },
      { kind: 'trimmings', kg: 65 },
    ],
    startedAt: '2026-07-' + String(10 + i).padStart(2, '0'),
    status: i === 0 ? 'active' : i === 1 ? 'curing' : 'released',
    maturityGate: i === 2 ? 'passed' : 'blocked',
    gateReason:
      i === 0 ? 'Temperature has not returned to ambient.' : 'Manual maturity checks are pending.',
    readings: [
      { synthetic: true, t: DEMO_NOW, tempC: i === 0 ? 47 : 29, moisturePct: i === 0 ? 68 : 48 },
    ],
    rules: [],
    checks: {
      squeeze: i === 0 ? 'wet' : 'ok',
      smell: 'normal',
      sumpLevelCm: i === 0 ? 23 : 4,
      puddles: i === 0,
      pests: false,
      ambientTempC: 30,
      ambientReached: i === 2,
      didNotReheat: i === 2,
      manualMaturity: i === 2,
      intakeChecked: true,
      plasticsFound: false,
      glassFound: false,
      bayCovered: i === 2,
      sumpChecked: i === 2,
      rainExpected: true,
    },
  }));
  const database: Database = {
    version: 2,
    sensors: [],
    zones,
    houses,
    features,
    faults,
    rainfall,
    readings,
    trials,
    batches,
    actions: [],
    config: structuredClone(config),
  };
  database.sensors = seedSensors(database, DEMO_NOW);
  for (const [ownerId, rows] of Object.entries(database.readings))
    for (const row of rows)
      row.sensorId = `${ownerId}-${row.metric === 'infiltration_mm_hr' ? 'INF-P1' : row.metric === 'sediment_mm' ? 'SEDIMENT' : 'OUTLET'}`;
  for (const fault of faults) {
    fault.sensorIds =
      fault.partId === 'sock'
        ? [fault.featureId + '-INLET', fault.featureId + '-SEDIMENT', fault.featureId + '-VIS-sock']
        : [fault.featureId + '-OUTLET'];
    fault.sensorStatusesAtAlert = sensorSnapshot(database.sensors, fault.sensorIds);
  }
  faults.push({
    synthetic: true,
    id: 'F-004',
    featureId: 'S3',
    partId: 'media',
    type: 'sensor_suspect',
    severity: 2,
    zone: 'C',
    openedAt: DEMO_NOW,
    status: 'open',
    ruleId: 'sensor_trust',
    sensorIds: ['S3-MOIST-30'],
    sensorStatusesAtAlert: { 'S3-MOIST-30': 'suspect' },
    diagnosingInput: 'Possible drift in the 30 cm soil-moisture probe',
  });
  return database;
}
