import type { Fault } from '../api/types';
export function activeSceneFaults(faults: Fault[], asset: string) {
  return faults.filter(
    (f) =>
      f.featureId === asset &&
      !f.id.startsWith('SIM-') &&
      f.status !== 'closed' &&
      ['detected', 'confirmed', 'assigned', 'cleared'].includes(f.workOrder?.state ?? 'detected'),
  );
}
export const faultConfirmed = (f: Fault) =>
  ['confirmed', 'assigned'].includes(f.workOrder?.state ?? 'detected');
export function faultTitle(f: Fault) {
  const titles: Partial<Record<Fault['type'], string>> = {
    blockage: f.partId === 'sock' ? 'Sock clogged' : 'Inlet blocked',
    sediment: 'Sediment build-up',
    standing_water: 'Standing water',
    mulch_loss: 'Mulch displaced',
    sparse_planting: 'Sparse planting',
    sensor_offline: 'Sensor offline',
    sensor_suspect: 'Check sensor',
    joint_leak: 'Leaking joint',
    scour: 'Scoured surface',
  };
  return titles[f.type] ?? f.type.replaceAll('_', ' ');
}
export function faultWaterEffect(f: Fault) {
  if (f.type.startsWith('sensor_'))
    return 'The input is unreliable; this finding does not establish a water restriction.';
  if (f.type === 'blockage')
    return f.partId === 'sock'
      ? 'Water can bank up before the sock and pass through more slowly.'
      : 'A restricted inlet can bank water up on the road side.';
  if (f.type === 'sediment') return 'Deposits reduce available storage or the clear flow opening.';
  if (f.type === 'standing_water')
    return 'Water is taking longer to clear; inspect the outlet and soil before choosing a cause.';
  return 'The recorded surface condition may affect drainage; confirm its effect by inspection.';
}
