import { bayParts, drainParts } from './modelCatalog';
import type { Fault, Part, Sensor, Status } from './types';

export function installedPart(ownerId: string, partId: string) {
  if (partId === 'liner') return false;
  if (partId === 'sock' || partId === 'checkdam') return ownerId === 'S1';
  if (partId === 'energy') return ownerId === 'S1' || ownerId === 'S2';
  return true;
}
export function buildParts(
  ownerId: string,
  sensors: Sensor[],
  faults: Fault[],
  compost = false,
): Part[] {
  return (compost ? bayParts : drainParts).map((definition) => {
    const installed = compost || installedPart(ownerId, definition.partId);
    const linked = sensors.filter(
      (s) => s.ownerId === ownerId && s.linkedPartIds.includes(definition.partId),
    );
    const fault = faults.find(
      (f) => f.featureId === ownerId && f.partId === definition.partId && f.status !== 'closed',
    );
    const status: Status = !installed
      ? 'ok'
      : fault?.type === 'sensor_offline'
        ? 'offline'
        : fault?.type === 'sensor_suspect' || fault?.type === 'standing_water'
          ? 'watch'
          : fault
            ? 'fault'
            : 'ok';
    return {
      synthetic: true,
      ...definition,
      installed,
      status,
      sensorIds: linked.map((s) => s.sensorId),
      readings: [],
      issue: !installed
        ? 'Not installed in this pilot configuration.'
        : fault
          ? `${fault.type.replaceAll('_', ' ')}. Diagnosing input: ${fault.diagnosingInput}.`
          : 'No open fault recorded for this part.',
      steps: fault
        ? [
            'Inspect the diagnosing input and its trust state before relying on the alert.',
            definition.typicalFailure + ': confirm by a trained visual inspection.',
            'Record the inspection and arrange a post-rain re-test.',
          ]
        : undefined,
    };
  });
}
