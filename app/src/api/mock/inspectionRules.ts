import type { BatchDetail, Config, Fault, Sensor } from '../types';
import { faultRules } from '../modelCatalog';
import { sensorSnapshot } from './sensors';

export function inspectionFaults(
  sensors: Sensor[],
  batches: BatchDetail[],
  config: Config,
): Fault[] {
  const output: Fault[] = [];
  const emit = (
    sensor: Sensor,
    type: Fault['type'],
    ruleId: string,
    sensorIds = [sensor.sensorId],
  ) => {
    const rule = faultRules.find((r) => r.id === ruleId)!;
    output.push({
      synthetic: true,
      id: `ALERT-${sensor.ownerId}-${ruleId}-${sensor.partId}`,
      featureId: sensor.ownerId,
      partId: sensor.partId,
      zone: sensor.zone,
      type,
      severity: 2,
      openedAt: sensor.lastAt,
      status: 'open',
      ruleId,
      sensorIds,
      sensorStatusesAtAlert: sensorSnapshot(sensors, sensorIds),
      diagnosingInput: rule.diagnosingInput,
    });
  };
  for (const s of sensors) {
    if (s.status === 'suspect') emit(s, 'sensor_suspect', 'sensor_trust');
    if (s.status === 'offline') emit(s, 'sensor_offline', 'sensor_trust');
    if (
      s.sensorId.endsWith('POND-DURATION') &&
      s.lastValue !== null &&
      s.lastValue > config.inspection.standingWaterH
    )
      emit(s, 'standing_water', 'persistent_ponding');
    const visual: Record<string, [Fault['type'], string]> = {
      scour: ['scour', 'surface_condition'],
      'bare patches': ['sparse_planting', 'surface_condition'],
      'thinned mulch': ['mulch_loss', 'mulch_condition'],
      'missing cap': ['missing_cap', 'cleanout_condition'],
      'leaking joint': ['joint_leak', 'outlet_condition'],
      'surface sediment': ['sediment', 'surface_condition'],
    };
    if (s.lastText && visual[s.lastText]) emit(s, ...visual[s.lastText]);
  }
  for (const b of batches) {
    const rows = sensors.filter((s) => s.ownerId === b.id);
    const by = (suffix: string) => rows.find((s) => s.sensorId === `${b.id}-${suffix}`)!;
    if (!rows.length) continue;
    const temp = by('TEMP-10'),
      moisture = by('MOIST'),
      manual = by('MANUAL');
    if (
      b.status === 'active' &&
      temp.lastValue !== null &&
      temp.lastValue < config.inspection.compostNotHeatingC
    )
      emit(temp, 'not_heating', 'not_heating', [
        temp.sensorId,
        by('TEMP-50').sensorId,
        by('AIR').sensorId,
      ]);
    if (b.checks.smell === 'putrid') emit(manual, 'putrid_smell', 'putrid_smell');
    if (b.checks.smell === 'ammonia') emit(manual, 'ammonia_smell', 'ammonia_smell');
    if (
      b.checks.squeeze === 'wet' ||
      b.checks.puddles ||
      (moisture.lastValue !== null && moisture.lastValue > config.moisture.max)
    )
      emit(moisture, 'too_wet', 'too_wet', [
        moisture.sensorId,
        manual.sensorId,
        `${b.id}-VIS-base`,
      ]);
    if (b.checks.pests) emit(by('VIS-bay'), 'pests', 'pests');
    if (
      b.checks.rainExpected &&
      (b.checks.sumpLevelCm > config.inspection.sumpWatchCm ||
        (!b.checks.bayCovered && !b.checks.sumpChecked))
    )
      emit(by('SUMP'), 'leachate', 'leachate_after_rain', [
        by('SUMP').sensorId,
        by('RAIN').sensorId,
        by('VIS-cover').sensorId,
      ]);
  }
  return output;
}
