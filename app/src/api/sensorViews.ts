import type { Sensor } from './types';
export interface SensorFilters {
  ownerId?: string;
  zone?: string;
  partId?: string;
  status?: string;
}
export function sensorRows(sensors: Sensor[], filters: SensorFilters = {}) {
  return sensors.filter(
    (s) =>
      (!filters.ownerId || s.ownerId === filters.ownerId) &&
      (!filters.zone || s.zone === filters.zone) &&
      (!filters.partId || s.linkedPartIds.includes(filters.partId as Sensor['partId'])) &&
      (!filters.status || s.status === filters.status),
  );
}
export function sensorMarkers(sensors: Sensor[], ownerId?: string) {
  return sensorRows(sensors, { ownerId });
}
