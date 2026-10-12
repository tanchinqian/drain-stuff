import { DEMO_NOW } from './api/mock/seed';
import type { Arm, TestResult } from './api/types';
export const armName: Record<Arm, string> = {
  control: 'Control',
  decompaction: 'Decompaction',
  compost: 'Decompaction + compost',
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
export const overdue = (t: string) => t.slice(0, 10) < DEMO_NOW.slice(0, 10);
export function testMean(tests: TestResult[], phase: 'baseline' | 'retest') {
  const rows = tests.filter((t) => t.phase === phase && t.metric === 'infiltration_mm_hr');
  const latest = rows.at(-1)?.t;
  const measured = phase === 'retest' ? rows.filter((t) => t.t === latest) : rows;
  if (!measured.length) return null;
  return {
    value: measured.reduce((sum, t) => sum + t.value, 0) / measured.length,
    n: measured.reduce((sum, t) => sum + t.n, 0),
  };
}
export function exportCsv(name: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => '"' + String(v).replaceAll('"', '""') + '"';
  const csv = [['Synthetic demo data', ...headers], ...rows.map((row) => ['synthetic', ...row])]
    .map((row) => row.map(escape).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name + '-synthetic.csv';
  link.click();
  URL.revokeObjectURL(url);
}
