import { describe, expect, it } from 'vitest';
import { generateMock, config } from './seed';
import { sensorMarkers, sensorRows } from '../sensorViews';
import { buildParts } from '../parts';
import { faultRules } from '../modelCatalog';
import { inspectionFaults } from './inspectionRules';
import { mockRequest, resetMock } from './index';
import type { Sensor } from '../types';
describe('sensor coverage', () => {
  it('gives every sensor a marker, register row, installed part and valid rule links', () => {
    const db = generateMock();
    const markers = new Set(sensorMarkers(db.sensors).map((s) => s.sensorId));
    const rows = new Set(sensorRows(db.sensors).map((s) => s.sensorId));
    expect(markers.size).toBe(db.sensors.length);
    for (const s of db.sensors) {
      expect(markers.has(s.sensorId), s.sensorId + ' has no marker').toBe(true);
      expect(rows.has(s.sensorId), s.sensorId + ' has no register row').toBe(true);
      if (s.scope !== 'site')
        expect(
          buildParts(s.ownerId, db.sensors, db.faults, s.scope === 'compost').find(
            (p) => p.partId === s.partId,
          )?.installed,
        ).toBe(true);
      expect(Number.isFinite(s.location.x + s.location.y + s.location.z)).toBe(true);
      expect(s.usedByRules.every((rule) => faultRules.some((r) => r.id === rule))).toBe(true);
    }
    for (const reading of Object.values(db.readings).flat())
      expect(rows.has(reading.sensorId), reading.sensorId).toBe(true);
  });
  it('filters by linked part, status and zone without hiding offline values as zero', async () => {
    resetMock();
    const offline = (await mockRequest('/sensors?status=offline')) as Sensor[];
    expect(offline.some((s) => s.sensorId === 'I1-OUTLET' && s.lastValue === null)).toBe(true);
    const rows = (await mockRequest('/sensors?partId=media&status=suspect&zone=C')) as Sensor[];
    expect(rows.map((s) => s.sensorId)).toEqual(['S3-MOIST-30']);
  });
  it('uses configured inspection thresholds and the sensor snapshot', () => {
    const db = generateMock();
    const faults = inspectionFaults(db.sensors, db.batches, config);
    expect(
      faults.some((f) => f.type === 'standing_water' && f.sensorIds.includes('S3-POND-DURATION')),
    ).toBe(true);
    expect(faults.some((f) => f.type === 'too_wet' && f.sensorIds.includes('B-01-MANUAL'))).toBe(
      true,
    );
    expect(
      faults.find((f) => f.type === 'sensor_suspect')?.sensorStatusesAtAlert['S3-MOIST-30'],
    ).toBe('suspect');
    expect(
      inspectionFaults(db.sensors, db.batches, {
        ...config,
        inspection: { ...config.inspection, standingWaterH: 60 },
      }).some((f) => f.ruleId === 'persistent_ponding'),
    ).toBe(false);
  });
});
