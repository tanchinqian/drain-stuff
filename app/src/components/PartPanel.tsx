import type { Config, Fault, Part, Sensor } from '../api/types';
import { api } from '../api/client';
import { useQuery } from '@tanstack/react-query';
import { useWrite } from '../hooks';
import type { FaultAction } from '../api/types';
import type { ViewMode } from '../three/DrainScene';
import Status from './Status';
import PartSensors from './PartSensors';
import { dateTime, displayName } from '../utils';
export default function PartPanel({
  part,
  config,
  fault,
  mode,
  sensors = [],
}: {
  part: Part;
  config: Config;
  fault?: Fault;
  mode: ViewMode;
  sensors?: Sensor[];
}) {
  const rules = useQuery({ queryKey: ['fault-rules'], queryFn: api.faultRules });
  const action = useWrite(
    (value: FaultAction) => {
      if (!fault) throw new Error('No open fault is attached to this part.');
      return api.faultAction(fault.id, value);
    },
    (value) =>
      `${fault?.id ?? 'Fault'} · ${value === 'cleaned' ? 'Clean logged' : value === 'inspected' ? 'Marked inspected' : 'Work order recorded'}`,
  );
  return (
    <section className="panel detail-readings" aria-label="Selected part readings">
      <div className="panel-heading">
        <h2>{part.name}</h2>
        {part.installed ? <Status status={part.status} /> : <span>Not installed</span>}
      </div>
      <p>{part.purpose}</p>
      <p className="small">Typical failure: {part.typicalFailure}</p>
      <h3 style={{ marginTop: 20 }}>Sensors on this part</h3>
      {!!sensors.length && <PartSensors sensors={sensors} />}
      {!sensors.length && (
        <p className="small">
          {part.installed
            ? 'Visual inspection or inferred condition; no physical sensor.'
            : 'Not installed; no sensor required.'}
        </p>
      )}
      {fault && (
        <details
          className="notice fault-explanation"
          open={sensors.some((s) => s.scope === 'compost') ? undefined : true}
        >
          <summary>
            <h3>Why is this highlighted?</h3>
          </summary>
          <p>Input: {fault.sensorIds.join(', ') || 'Human inspection'}</p>
          <p title={fault.ruleId}>
            Rule:{' '}
            {rules.data?.find((r) => r.id === fault.ruleId)?.title ??
              (fault.id.startsWith('SIM-')
                ? 'Current model capacity check'
                : 'Recorded condition check')}
          </p>
          <p>
            {fault.id.startsWith('SIM-')
              ? 'Trigger: current model state and capacity rule; see diagnosing input below.'
              : fault.type === 'standing_water'
                ? `Threshold: more than ${config.inspection.standingWaterH} h standing water`
                : fault.type === 'not_heating'
                  ? `Threshold: below ${config.inspection.compostNotHeatingC} degrees C`
                  : fault.type === 'too_wet'
                    ? `Threshold: moisture above ${config.moisture.max}% or a wet squeeze check / puddles`
                    : fault.type === 'leachate'
                      ? `Threshold: sump above ${config.inspection.sumpWatchCm} cm, or unchecked cover and sump with rain expected`
                      : fault.type.startsWith('sensor_')
                        ? 'Trigger: suspect, offline or drifting input; no numeric threshold.'
                        : 'Trigger: recorded visual or human finding; no numeric threshold configured.'}
          </p>
          <p>Recorded {dateTime(fault.openedAt)}</p>
          <strong>Diagnosing input</strong>
          <p>{fault.diagnosingInput}</p>
          {Object.values(fault.sensorStatusesAtAlert).includes('suspect') && (
            <p>
              This alert may be a sensor fault. At least one diagnosing sensor was suspect at the
              time.
            </p>
          )}
        </details>
      )}
      {part.readings.length ? (
        part.readings.map((r) => (
          <div key={r.metric}>
            <div className="metric-line">
              <span>{r.metric.replaceAll('_', ' ')}</span>
              <strong>
                {r.value} {r.unit}
              </strong>
            </div>
            <p className="small">
              {dateTime(r.t)} · {r.n ? 'n = ' + r.n + ' · ' : ''}
            </p>
          </div>
        ))
      ) : sensors.length ? null : (
        <p className="empty">
          {part.status === 'offline'
            ? 'No current reading — sensor offline.'
            : 'No sensor reading for this part.'}
        </p>
      )}
      <h3 style={{ marginTop: 20 }}>What looks wrong</h3>
      {!sensors.some((s) => s.scope === 'compost') && (
        <p className="small">Drain-down: hours for water to clear after rain.</p>
      )}
      <p style={{ marginTop: 8 }}>
        {displayName(part.issue?.split('Diagnosing input:')[0] ?? 'No issue recorded')}
      </p>
      {part.steps?.length && (
        <>
          <div className="notice">
            Draft. Check against the local authority's procedure before use.
          </div>
          <details>
            <summary>Inspection steps</summary>
            <ol>
              {part.steps.map((step) => (
                <li key={step} style={{ marginTop: 10 }}>
                  {step}
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
      {mode === 'Debug' && (
        <>
          <hr className="divider" />
          <h3>Contract and freshness</h3>
          <dl className="technical">
            <dt>partId</dt>
            <dd>{part.partId}</dd>
            <dt>readings[].sensorId</dt>
            <dd>{part.readings.at(-1)?.sensorId || 'No sensor reporting'}</dd>
            <dt>readings[].t</dt>
            <dd>{part.readings.at(-1)?.t || 'No timestamp'}</dd>
            <dt>Reading age</dt>
            <dd>
              {part.readings.length
                ? Math.round((Date.now() - Date.parse(part.readings.at(-1)!.t)) / 60000) + ' min'
                : 'Offline / unavailable'}
            </dd>
            <dt>Record flag</dt>
            <dd>true</dd>
          </dl>
        </>
      )}
      <div className="actions">
        {(
          [
            ['Mark inspected', 'inspected'],
            ['Log a clean', 'cleaned'],
            ['Raise a work order', 'work_order'],
          ] as const
        ).map(([label, value]) => (
          <button
            key={value}
            disabled={!fault || fault.id.startsWith('SIM-') || action.isPending}
            onClick={() => action.mutate(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {!fault && (
        <p className="small">No open fault for an action. Use the fault log for recorded checks.</p>
      )}
      {action.error && (
        <p className="error" role="alert">
          {action.error.message}
        </p>
      )}
    </section>
  );
}
