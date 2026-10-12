import type { Fault, Part, Sensor } from '../api/types';
import { api, isMock } from '../api/client';
import { useWrite } from '../hooks';
import type { FaultAction } from '../api/types';
import type { ViewMode } from '../three/DrainScene';
import Status from './Status';
import SensorInfo from './SensorInfo';
import { dateTime } from '../utils';
import { DEMO_NOW } from '../api/mock/seed';
export default function PartPanel({
  part,
  fault,
  mode,
  sensors = [],
}: {
  part: Part;
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
        <SensorInfo key={s.sensorId} sensor={s} />
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
      <p style={{ marginTop: 8 }}>{part.issue}</p>
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
            disabled={!fault || action.isPending}
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
