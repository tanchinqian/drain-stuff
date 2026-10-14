import type { PhysicsRun } from './engine';
const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
export function runCsv(run: PhysicsRun) {
  const rows: (string | number)[][] = [
    ['Reduced-order model; synthetic; not calibrated; not a forecast'],
    ['feature', run.config.id],
    ['parameter', 'value', 'unit', 'source', 'equation'],
  ];
  for (const [key, p] of Object.entries(run.config.values))
    rows.push([key, p.value, p.unit, p.source, p.equation]);
  rows.push([], ['rain second', 'intensity m/s']);
  for (const p of run.rain) rows.push([p.second, p.intensity]);
  rows.push(
    [],
    [
      'second',
      'dt s',
      'rain m/s',
      'ponding m',
      'theta m3/m3',
      'surface m3',
      'media m3',
      'transition m3',
      'gravel m3',
      'clog',
      'rain tips',
      'input m3',
      'outlet m3',
      'overflow m3',
      'seepage m3',
      'ET m3',
      'storage m3',
      'residual m3',
      'relative residual',
      'runoff m3/s',
      'inlet m3/s',
      'infiltration m3/s',
      'percolation m3/s',
      'transition m3/s',
      'drain m3/s',
      'overflow m3/s',
      'seepage m3/s',
      'ET m3/s',
    ],
  );
  for (const f of run.frames)
    rows.push([
      f.second,
      f.dt,
      f.rain,
      f.ponding,
      f.moisture,
      f.cell.surface,
      f.cell.media,
      f.cell.transition,
      f.cell.gravel,
      f.cell.clog,
      f.rainTips,
      f.cumulative.input,
      f.cumulative.outlet,
      f.cumulative.overflow,
      f.cumulative.seepage,
      f.cumulative.et,
      f.storage,
      f.balanceResidual,
      f.relativeError,
      ...Object.values(f.flux),
    ]);
  rows.push([], ['second', 'node', 'volume m3', 'depth m']);
  for (const f of run.frames)
    for (const n of f.network) rows.push([f.second, n.id, n.volume, n.depth]);
  rows.push(
    [],
    ['second', 'link', 'discharge m3/s', 'capacity m3/s', 'filling fraction', 'surcharged'],
  );
  for (const f of run.frames)
    for (const l of f.links)
      rows.push([f.second, l.id, l.discharge, l.capacity, l.filling, String(l.surcharge)]);
  return rows.map((r) => r.map(quote).join(',')).join('\r\n');
}
