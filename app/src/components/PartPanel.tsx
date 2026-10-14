import type { Config, Fault, Part, Sensor } from '../api/types';
import { api, isMock } from '../api/client';
import { useWrite } from '../hooks';
import type { FaultAction } from '../api/types';
import type { ViewMode } from '../three/DrainScene';
import Status from './Status';
import SensorInfo from './SensorInfo';
import { dateTime } from '../utils';
import { faultRules } from '../api/modelCatalog';
import { DEMO_NOW } from '../api/mock/seed';
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
  const action = useWrite((value: FaultAction) => {
    if (!fault) throw new Error('No open fault is attached to this part.');
    return api.faultAction(fault.id, value);
  }, 'Fault record updated.');
  return (
    <section className="panel detail-readings" aria-label="Selected part readings">
      <div className="panel-heading">
        <h2>{part.name}</h2>
        {part.installed ? <Status status={part.status} /> : <span>Not installed</span>}
      </div>
      <p>{part.purpose}</p>
      <p className="small">Typical failure: {part.typicalFailure}</p>
      <h3 style={{ marginTop: 20 }}>Sensors on this part</h3>
      {sensors.map((s) => (
        <SensorInfo key={s.sensorId} sensor={s} compact showPosition={mode === 'Debug'} />
      ))}
      {!sensors.length && (
        <p className="small">
          {part.installed
            ? 'Visual inspection or inferred condition; no physical sensor.'
            : 'Not installed; no sensor required.'}
        </p>
      )}
      {fault && (
        <div className="notice">
          <h3>Why is this highlighted?</h3>
          <p>Input: {fault.sensorIds.join(', ') || 'Human inspection'}</p>
          <p>Rule: {faultRules.find((r) => r.id === fault.ruleId)?.label ?? fault.ruleId}</p>
          <p>
            {fault.id.startsWith('SIM-')
              ? 'Trigger: current model state and placeholder capacity rule; see diagnosing input below.'
              : fault.type === 'standing_water'
                ? `Threshold: more than ${config.inspection.standingWaterH} h standing water (placeholder, to confirm)`
                : fault.type === 'not_heating'
                  ? `Threshold: below ${config.inspection.compostNotHeatingC} degrees C (placeholder, to confirm)`
                  : fault.type === 'too_wet'
                    ? `Threshold: moisture above ${config.moisture.max}% or a wet squeeze check / puddles (placeholder, to confirm)`
                    : fault.type === 'leachate'
                      ? `Threshold: sump above ${config.inspection.sumpWatchCm} cm, or unchecked cover and sump with rain expected (placeholder, to confirm)`
                      : fault.type.startsWith('sensor_')
                        ? 'Trigger: suspect, offline or drifting input; no numeric threshold.'
                        : 'Trigger: recorded visual or human finding; no numeric threshold configured.'}
          </p>
          <p>Recorded {dateTime(fault.openedAt)} / synthetic</p>
          <strong>Diagnosing input</strong>
          <p>{fault.diagnosingInput}</p>
          {Object.values(fault.sensorStatusesAtAlert).includes('suspect') && (
            <p>
              This alert may be a sensor fault. At least one diagnosing sensor was suspect at the
              time.
            </p>
          )}
        </div>
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
              {dateTime(r.t)} · {r.n ? 'n = ' + r.n + ' · ' : ''}synthetic
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
      <p style={{ marginTop: 8 }}>{part.issue?.split('Diagnosing input:')[0]}</p>
      {part.steps?.length && (
        <>
          <div className="notice">
            Draft. Check against the local authority's procedure before use.
          </div>
          <ol>
            {part.steps.map((step) => (
              <li key={step} style={{ marginTop: 10 }}>
                {step}
              </li>
            ))}
          </ol>
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
            <dt>Age at demo clock</dt>
            <dd>
              {part.readings.length
                ? Math.round((Date.parse(DEMO_NOW) - Date.parse(part.readings.at(-1)!.t)) / 60000) +
                  ' min'
                : 'Offline / unavailable'}
            </dd>
            <dt>readings[].synthetic</dt>
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
      <p className="small" style={{ marginTop: 12 }}>
        {isMock
          ? 'Actions write to the browser-local mock only.'
          : 'Actions write to the configured operator API.'}
      </p>
      {action.error && (
        <p className="error" role="alert">
          {action.error.message}
        </p>
      )}
    </section>
  );
}
