import { Link } from 'react-router-dom';
import type { Sensor } from '../api/types';
import { dateTime } from '../utils';
export function SensorTrust({ sensor }: { sensor: Sensor }) {
  return (
    <span className="status">
      <span
        aria-hidden="true"
        className={`status-mark ${sensor.status === 'suspect' || sensor.status === 'offline' ? 'offline' : 'ok'}`}
      />
      {sensor.status === 'suspect' ? 'Suspect' : sensor.status === 'offline' ? 'Offline' : 'OK'} ·{' '}
      {sensor.drift === 'none' ? 'No drift flag' : `${sensor.drift} drift`}
    </span>
  );
}
export function SensorValue({ sensor }: { sensor: Sensor }) {
  return (
    <>
      {sensor.status === 'offline'
        ? 'Unavailable — offline'
        : (sensor.lastText ??
          (sensor.lastValue === null
            ? 'Not measured'
            : `${Math.round(sensor.lastValue * 100) / 100} ${sensor.unit}`))}
      {sensor.role === 'proxy' && (
        <span className="proxy-note"> What is this? {sensor.proxyFor}.</span>
      )}
    </>
  );
}
export default function SensorInfo({
  sensor,
  compact = false,
  showPosition = true,
}: {
  sensor: Sensor;
  compact?: boolean;
  showPosition?: boolean;
}) {
  if (compact)
    return (
      <div className="sensor-info compact-sensor" data-sensor-row={sensor.sensorId}>
        <p>
          <Link to={`/sensors?sensor=${encodeURIComponent(sensor.sensorId)}`}>
            {sensor.sensorId}
          </Link>{' '}
          / {sensor.metric} /{' '}
          <strong>
            <SensorValue sensor={sensor} />
          </strong>{' '}
          / {sensor.role} / {sensor.status}
        </p>
        <details>
          <summary>Details</summary>
          <SensorInfo sensor={sensor} showPosition={showPosition} />
        </details>
      </div>
    );
  return (
    <div className="sensor-info" data-sensor-row={sensor.sensorId}>
      <h3>
        <Link to={`/sensors?sensor=${encodeURIComponent(sensor.sensorId)}`}>{sensor.sensorId}</Link>
      </h3>
      <p>
        {sensor.metric}:{' '}
        <strong>
          <SensorValue sensor={sensor} />
        </strong>
      </p>
      <SensorTrust sensor={sensor} />
      <p className="small">
        {dateTime(sensor.lastAt)} · Synthetic · {sensor.unit}
      </p>
      <p>
        <strong>{sensor.role === 'proxy' ? 'Proxy' : 'Reference'}</strong> · {sensor.proxyFor}
      </p>
      <p className="small">Calibration / method check: {dateTime(sensor.calibratedAt)}</p>
      {showPosition && (
        <p className="small">
          Local position: {Number(sensor.location.x.toFixed(2))},{' '}
          {Number(sensor.location.y.toFixed(2))}, {Number(sensor.location.z.toFixed(2))} schematic m
        </p>
      )}
      <div className="sensor-rule-links">
        Fault rules:{' '}
        {sensor.usedByRules.map((rule) => (
          <Link key={rule} to={`/faults?rule=${rule}#rule-${rule}`}>
            {rule.replaceAll('_', ' ')}
          </Link>
        ))}
      </div>
    </div>
  );
}
