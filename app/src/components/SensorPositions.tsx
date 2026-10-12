import { Link } from 'react-router-dom';
import type { Sensor } from '../api/types';
import { SensorTrust } from './SensorInfo';
export default function SensorPositions({ sensors }: { sensors: Sensor[] }) {
  return (
    <details className="sensor-positions">
      <summary>Sensor markers · {sensors.length} inputs · Keyboard list</summary>
      <p className="small">
        Square: OK · Triangle: suspect · Diamond: offline. Manual inputs mark where a human check is
        made.
      </p>
      <ul>
        {sensors.map((s) => (
          <li key={s.sensorId} data-sensor-marker={s.sensorId}>
            <Link to={`/sensors?sensor=${encodeURIComponent(s.sensorId)}`}>{s.sensorId}</Link>{' '}
            <SensorTrust sensor={s} />
            <span className="small">
              {' '}
              · {s.metric} · position {s.location.x}, {s.location.y}, {s.location.z} m
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
