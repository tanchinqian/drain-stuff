import { Link } from 'react-router-dom';
import type { Sensor } from '../api/types';
import { displayName, formatValue } from '../utils';
import Chip from './Chip';
export default function PartSensors({ sensors }: { sensors: Sensor[] }) {
  return (
    <div className="sensor-readings">
      <table aria-label="Selected part sensors">
        <thead>
          <tr>
            <th>Input</th>
            <th>Value</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sensors.map((s) => (
            <tr key={s.sensorId}>
              <td title={s.metric}>
                <Link
                  to={'/sensors?sensor=' + encodeURIComponent(s.sensorId)}
                  aria-label={s.sensorId}
                >
                  {s.sensorId.replace(s.ownerId + '-', '')}
                </Link>
              </td>
              <td
                title={s.lastText ?? formatValue(s.lastValue, s.unit.replace('relative', 'rel.'))}
              >
                {s.status === 'offline'
                  ? 'Unavailable'
                  : (s.lastText?.split(' / ').map(displayName).join(' / ') ??
                    formatValue(s.lastValue, s.unit.replace('relative', 'rel.')))}
              </td>
              <td>
                <Chip value={s.role} />
              </td>
              <td>
                <Chip value={s.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
