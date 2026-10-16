import { today } from './clock';
import type { Arm } from './api/types';
export const armName: Record<Arm, string> = {
  control: 'Untreated (control)',
  decompaction: 'Soil loosened only',
  compost: 'Soil loosened + compost',
};
export const dateTime = (t: string) =>
  new Intl.DateTimeFormat('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore',
  }).format(new Date(t));
export const dateOnly = (t: string) =>
  new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeZone: 'Asia/Singapore' }).format(
    new Date(t),
  );
export const overdue = (t: string) => t.slice(0, 10) < today();
export function trialDue(t: import('./api/types').TrialDetail): string {
  const latest = t.tests.at(-1)?.t;
  const recorded = Date.parse(t.nextRetestDue + 'T23:59:59+08:00');
  const latestDueDay = latest
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(
        new Date(Date.parse(latest) + 7 * 86400000),
      )
    : null;
  return new Date(
    Math.min(recorded, latestDueDay ? Date.parse(latestDueDay + 'T23:59:59+08:00') : recorded),
  ).toISOString();
}
export function trialStatus(
  t: import('./api/types').TrialDetail,
  at = new Date(),
): 'Needs baseline' | 'Overdue' | 'On track' {
  return !t.baselineDone
    ? 'Needs baseline'
    : Date.parse(trialDue(t)) < at.getTime()
      ? 'Overdue'
      : 'On track';
}
export { testMean } from '../../shared/src/trialMetrics';
export function exportCsv(name: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => '"' + String(v).replaceAll('"', '""') + '"';
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name + '.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export const displayName = (value: string) =>
  ({
    blockage: 'Inlet blocked',
    sensor_offline: 'Sensor not reporting',
    sensor_suspect: 'Sensor needs checking',
    standing_water: 'Water standing after rain',
    mulch_loss: 'Mulch lost',
    tree_pit: 'Tree pit',
    not_heating: 'Compost not heating',
    putrid_smell: 'Putrid smell',
    ammonia_smell: 'Ammonia smell',
    too_wet: 'Too wet',
    ok: 'OK',
    offline: 'Not reporting',
    suspect: 'Needs checking',
    not_tested: 'Not tested',
    food_bokashi: 'Food and bokashi',
    no_drift: 'No drift',
  })[value] ?? value.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
export function formatValue(value: number | null | undefined, unit = '', digits?: number) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'No reading';
  return (
    new Intl.NumberFormat('en-MY', {
      maximumFractionDigits:
        digits ?? (unit === 'm' ? 2 : unit === 'L/min' ? 1 : unit === 'mm/h' ? 1 : 2),
    }).format(value) + (unit ? ' ' + unit : '')
  );
}
export function timeLabel(t: string) {
  const hours = Math.max(0, (Date.now() - Date.parse(t)) / 3600000);
  return (
    (hours < 1
      ? 'Just now'
      : hours < 24
        ? Math.floor(hours) + ' h ago'
        : Math.floor(hours / 24) + ' d ago') +
    ' · ' +
    dateTime(t)
  );
}
const faultImpact = (type: string) =>
  type.startsWith('sensor_')
    ? 2
    : ['standing_water', 'mulch_loss', 'sparse_planting'].includes(type)
      ? 1
      : 0;
export const faultOrder = (a: import('./api/types').Fault, b: import('./api/types').Fault) =>
  b.severity - a.severity ||
  faultImpact(a.type) - faultImpact(b.type) ||
  Date.parse(a.openedAt) - Date.parse(b.openedAt);
