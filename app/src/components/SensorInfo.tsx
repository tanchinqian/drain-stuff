import { Link } from 'react-router-dom';
import type { Sensor } from '../api/types';
import { dateTime } from '../utils';
export function SensorTrust({ sensor }: { sensor: Sensor }) {
  return (
    <span className="status">
      <span
        aria-hidden="true"
        className={`status-mark ${sensor.status === 'suspect' ? 'fault' : sensor.status === 'offline' ? 'offline' : 'ok'}`}
      />
      {sensor.status === 'suspect' ? 'Suspect' : sensor.status === 'offline' ? 'Offline' : 'OK'} Â·{' '}
      {sensor.drift === 'none' ? 'No drift flag' : `${sensor.drift} drift`}
    </span>
  );
}
export function SensorValue({ sensor }: { sensor: Sensor }) {
  return (
    <>
      {sensor.status === 'offline'
        ? 'Unavailable â€” offline'
        : (sensor.lastText ??
          (sensor.lastValue === null
            ? 'Not measured'
            : `${Math.round(sensor.lastValue * 100) / 100} ${sensor.unit}`))}
    </>
  );
}
export default function SensorInfo({ sensor }: { sensor: Sensor }) {
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
        {dateTime(sensor.lastAt)} Â· Synthetic Â· {sensor.unit}
      </p>
      <p>
        <strong>{sensor.role === 'proxy' ? 'Proxy' : 'Reference'}</strong> Â· {sensor.proxyFor}
      </p>
      <p className="small">Calibration / method check: {dateTime(sensor.calibratedAt)}</p>
      <p className="small">
        Local position: {Number(sensor.location.x.toFixed(2))},{' '}
        {Number(sensor.location.y.toFixed(2))}, {Number(sensor.location.z.toFixed(2))} schematic m
      </p>
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
