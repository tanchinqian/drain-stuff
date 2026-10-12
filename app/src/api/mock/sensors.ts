import type { Database } from './seed';
import type { PartId, Sensor, SensorStatus, ZoneId } from '../types';
import { bayParts, drainParts } from '../modelCatalog';

export function seedSensors(db: Database, now: string): Sensor[] {
  const rows: Sensor[] = [];
  const add = (
    ownerId: string,
    scope: Sensor['scope'],
    zone: ZoneId,
    site: readonly [number, number],
    suffix: string,
    partId: PartId,
    type: string,
    metric: string,
    unit: string,
    lastValue: number | null,
    role: Sensor['role'],
    proxyFor: string,
    location: [number, number, number],
    rules: string[],
    extra: Partial<Sensor> = {},
  ) => {
    rows.push({
      synthetic: true,
      sensorId: `${ownerId}-${suffix}`,
      ownerId,
      scope,
      zone,
      partId,
      linkedPartIds: [partId],
      type,
      metric,
      unit,
      lastValue,
      role,
      proxyFor,
      location: {
        x: Number(location[0].toFixed(2)),
        y: Number(location[1].toFixed(2)),
        z: Number(location[2].toFixed(2)),
      },
      siteLocation: {
        x: site[0] + (rows.length % 5) * 0.19,
        y: 0.18,
        z: site[1] + (Math.floor(rows.length / 5) % 3) * 0.19,
      },
      lastAt: now,
      calibratedAt: '2026-10-01T01:40:00.000Z',
      drift: 'none',
      status: 'ok',
      usedByRules: rules,
      ...extra,
    });
  };
  for (const f of db.features) {
    const args = [f.id, 'drainage', f.zone, [f.x, f.y]] as const;
    add(
      ...args,
      'INLET',
      'inlet',
      'Ultrasonic inlet level',
      'Inlet water level',
      'cm',
      f.id === 'S1' ? 18 : 3,
      'reference',
      'Reference for inlet water level',
      [-3, 0.8, 0],
      ['inlet_debris'],
      { linkedPartIds: ['inlet', 'pretreat', ...(f.id === 'S1' ? ['sock' as const] : [])] },
    );
    add(
      ...args,
      'OUTLET',
      'outfall',
      'Underdrain outlet level',
      'Outlet water level',
      'cm',
      f.id === 'I1' ? null : 2,
      'proxy',
      'Indirect proxy for drain-down; derive duration from the level history',
      [3.9, -0.55, 0],
      ['outlet_condition', 'sensor_trust'],
      { linkedPartIds: ['underdrain', 'outfall'], status: f.id === 'I1' ? 'offline' : 'ok' },
    );
    add(
      ...args,
      'SEDIMENT',
      'pretreat',
      'Manual sediment inspection',
      'Sediment depth',
      'mm',
      f.id === 'S1' ? 42 : 8,
      'reference',
      'Human reference measurement for sediment buildup',
      [-2.6, 0.3, 0.6],
      ['inlet_debris', 'surface_condition'],
    );
    if (f.kind === 'inlet') continue;
    for (const depth of [10, 30]) {
      const suspect = f.id === 'S3' && depth === 30;
      add(
        ...args,
        `MOIST-${depth}`,
        'media',
        `Soil moisture at ${depth} cm`,
        `Soil volumetric moisture, ${depth} cm`,
        '% vol',
        suspect ? 79 : 28 + depth / 5,
        'proxy',
        'Indirect proxy for infiltration; manual infiltration is the trial outcome',
        [-0.7 + depth / 50, -0.1 - depth / 100, 0.65],
        ['infiltration_protocol', 'sensor_trust'],
        { status: suspect ? 'suspect' : 'ok', drift: suspect ? 'possible' : 'none' },
      );
      add(
        ...args,
        `TEMP-${depth}`,
        'media',
        `Soil temperature at ${depth} cm`,
        `Soil temperature, ${depth} cm`,
        '°C',
        29 - depth / 100,
        'proxy',
        'Environmental context for the infiltration proxy',
        [-0.7 + depth / 50, -0.1 - depth / 100, 0.85],
        ['infiltration_protocol'],
      );
    }
    add(
      ...args,
      'POND',
      'ponding',
      'Ultrasonic ponding depth',
      'Ponding depth',
      'cm',
      f.id === 'S3' ? 12 : 3,
      'reference',
      'Reference for ponding; compare duration after rain',
      [0, 0.9, 0],
      ['persistent_ponding'],
      { linkedPartIds: ['ponding', ...(f.id === 'S1' ? ['checkdam' as const] : [])] },
    );
    add(
      ...args,
      'RISER',
      'overflow',
      'Ultrasonic overflow-riser level',
      'Riser water level',
      'cm',
      4,
      'reference',
      'Reference for overflow-riser water level',
      [1.65, 1.05, -0.7],
      ['persistent_ponding', 'outlet_condition'],
    );
    add(
      ...args,
      'WELL',
      'cleanout',
      'Observation-well level',
      'Observation-well water level',
      'cm',
      6,
      'reference',
      'Reference for underdrain state',
      [1.3, 0.8, 0.9],
      ['outlet_condition', 'cleanout_condition'],
      { linkedPartIds: ['cleanout', 'drainage', 'underdrain'] },
    );
    for (let i = 1; i <= 3; i++) {
      const trial = db.trials.find((t) => t.featureId === f.id);
      const test = trial?.tests.filter((t) => t.pointId === `${f.id}-P${i}`).at(-1);
      add(
        ...args,
        `INF-P${i}`,
        'media',
        'Manual fixed-point ring infiltration test',
        `Infiltration at ${f.id}-P${i}`,
        'mm/h',
        test?.value ?? null,
        'reference',
        'Trial outcome; one fixed-point ring method, two repeats at each point',
        [-1.2 + i * 0.7, 0.35, -0.8],
        ['infiltration_protocol'],
        { lastAt: test?.t ?? now, lastText: test ? undefined : 'Not measured; baseline pending' },
      );
    }
    add(
      ...args,
      'POND-DURATION',
      'ponding',
      'Manual post-rain elapsed-time log',
      'Standing-water duration after rain',
      'h',
      f.id === 'S3' ? 51 : 2.5,
      'reference',
      'Human elapsed-time reference; level sensors establish presence of water',
      [0.5, 0.65, 0.3],
      ['persistent_ponding'],
    );
    for (const [i, part] of drainParts.entries()) {
      if (
        part.optional &&
        !(f.id === 'S1' && part.partId !== 'liner') &&
        !(f.id === 'S2' && part.partId === 'energy')
      )
        continue;
      add(
        ...args,
        `VIS-${part.partId}`,
        part.partId,
        'Manual visual inspection',
        `${part.name} inspection`,
        'human log',
        null,
        'reference',
        'Human visual reference; no physical sensor on this part',
        [-1.8 + (i % 5) * 0.7, 0.5, 1.1],
        part.partId === 'mulch'
          ? ['mulch_condition']
          : part.partId === 'cleanout'
            ? ['cleanout_condition']
            : part.partId === 'inlet' || part.partId === 'pretreat' || part.partId === 'sock'
              ? ['inlet_debris']
              : ['surface_condition'],
        {
          lastText:
            f.id === 'S2' && part.partId === 'planting'
              ? 'bare patches'
              : f.id === 'S2' && part.partId === 'mulch'
                ? 'thinned mulch'
                : f.id === 'T2' && part.partId === 'cleanout'
                  ? 'missing cap'
                  : f.id === 'S1' && part.partId === 'sock'
                    ? 'Sediment buildup observed'
                    : 'No issue recorded',
        },
      );
    }
  }
  for (const h of db.houses) {
    add(
      h.drainId,
      'drainage',
      h.zone,
      [h.x, h.y],
      'OUTLET',
      'outfall',
      'House-drain outlet level',
      'Outlet water level',
      'cm',
      h.holdsWater6h ? 16 : 2,
      'proxy',
      'Indirect proxy for drain-down, from the level history',
      [3.9, -0.55, 0],
      ['outlet_condition', 'persistent_ponding'],
    );
  }
  add(
    'SITE',
    'site',
    'A',
    [-0.6, -6.8],
    'RAIN',
    'weather',
    'Site rain gauge',
    'Rain in ten minutes',
    'mm / 10 min',
    63 / 6,
    'reference',
    'Reference rain input',
    [0, 1.2, 0],
    ['persistent_ponding', 'leachate_after_rain'],
  );
  for (const [i, batch] of db.batches.entries()) {
    const args = [batch.id, 'compost', 'D', [-7 + i * 1.1, 7.5]] as const;
    const latest = batch.readings.at(-1);
    add(
      ...args,
      'TEMP-10',
      'bay',
      'Pile temperature probe, shallow',
      'Pile temperature, 10 cm',
      '°C',
      latest?.tempC ?? null,
      'reference',
      'Reference for pile heating',
      [-0.8, 0.65, -0.25],
      ['not_heating'],
    );
    add(
      ...args,
      'TEMP-50',
      'bay',
      'Pile temperature probe, deep',
      'Pile temperature, 50 cm',
      '°C',
      latest ? latest.tempC + 1 : null,
      'reference',
      'Reference for pile heating at depth',
      [-0.4, 0.8, 0.2],
      ['not_heating'],
    );
    add(
      ...args,
      'AIR',
      'weather',
      'Air temperature probe',
      'Ambient temperature',
      '°C',
      batch.checks.ambientTempC,
      'reference',
      'Reference for ambient and maturity comparisons',
      [3.2, 1.1, -0.9],
      ['not_heating', 'maturity'],
    );
    add(
      ...args,
      'MOIST',
      'bay',
      'Capacitive pile moisture sensor',
      'Relative pile moisture',
      'relative %',
      latest?.moisturePct ?? null,
      'proxy',
      'Relative moisture only; needs calibration against the squeeze test',
      [-1, 0.55, 0.25],
      ['too_wet', 'sensor_trust'],
    );
    add(
      ...args,
      'MANUAL',
      'bay',
      'Manual squeeze and smell log',
      'Squeeze / smell',
      'human log',
      null,
      'reference',
      'Human reference for wet / ok / dry and smell',
      [-0.3, 1.1, 0.45],
      ['too_wet', 'putrid_smell', 'ammonia_smell'],
      { lastText: `${batch.checks.squeeze} / ${batch.checks.smell}` },
    );
    add(
      ...args,
      'SCALE',
      'intake',
      'Intake scale',
      'Intake mass',
      'kg',
      batch.inputs.reduce((n, input) => n + input.kg, 0),
      'reference',
      'Scale reference for intake mass',
      [-3.4, 0.55, -0.8],
      ['intake_check'],
    );
    add(
      ...args,
      'PHOTO',
      'intake',
      'Intake photo and human checklist',
      'Photo / checklist result',
      'checklist',
      null,
      'reference',
      'Human checklist; photo is not an automated model',
      [-3.4, 1, -0.5],
      ['intake_check'],
      { lastText: batch.checks.intakeChecked ? 'Human checklist recorded' : 'Checklist pending' },
    );
    add(
      ...args,
      'SUMP',
      'sump',
      'Leachate sump level',
      'Sump level',
      'cm',
      batch.checks.sumpLevelCm,
      'reference',
      'Reference for leachate containment level',
      [1.6, -0.15, 1.5],
      ['leachate_after_rain'],
    );
    add(
      ...args,
      'CURING',
      'curing',
      'Curing temperature probe',
      'Curing temperature',
      '°C',
      batch.status === 'active' ? null : (latest?.tempC ?? null),
      'reference',
      'Reference for return to ambient; no-reheat check is human',
      [2.4, 0.45, 0.1],
      ['maturity'],
      { lastText: batch.status === 'active' ? 'Curing area not in use' : undefined },
    );
    add(
      ...args,
      'RAIN',
      'weather',
      'Rain gauge reference feed',
      'Rain in ten minutes',
      'mm / 10 min',
      63 / 6,
      'reference',
      'Reference rain input for cover and leachate checks',
      [3.2, 1.2, -0.55],
      ['leachate_after_rain'],
      { linkedPartIds: ['weather', 'cover'] },
    );
    for (const [j, part] of bayParts.entries())
      add(
        ...args,
        `VIS-${part.partId}`,
        part.partId,
        'Manual visual / stock check',
        `${part.name} inspection`,
        'human log',
        null,
        'reference',
        'Human visual reference; no physical sensor',
        [-3.4 + j * 0.85, 0.5, 1.05],
        part.partId === 'cover' || part.partId === 'base'
          ? ['leachate_after_rain']
          : part.partId === 'intake'
            ? ['intake_check']
            : part.partId === 'bay'
              ? ['pests']
              : ['maturity'],
        {
          lastText:
            part.partId === 'cover'
              ? batch.checks.bayCovered
                ? 'Covered'
                : 'Cover not confirmed'
              : part.partId === 'base'
                ? batch.checks.puddles
                  ? 'Puddles observed'
                  : 'No puddles observed'
                : part.partId === 'bay'
                  ? batch.checks.pests
                    ? 'Pests observed'
                    : 'No pests observed'
                  : 'Stock / visual check recorded',
        },
      );
  }
  return rows;
}

export function sensorSnapshot(rows: Sensor[], ids: string[]): Record<string, SensorStatus> {
  return Object.fromEntries(
    ids.map((id) => [id, rows.find((s) => s.sensorId === id)?.status ?? 'offline']),
  );
}
