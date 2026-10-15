import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Fault, House } from '../api/types';
import { useSelection } from '../state';
import { timeLabel, formatValue, displayName } from '../utils';
import Drawer from './Drawer';
import Term from './Term';
export default function HouseRecord({ house, faults }: { house: House; faults: Fault[] }) {
  const close = useSelection((s) => s.selectHouse),
    readings = useQuery({
      queryKey: ['readings', house.drainId],
      queryFn: () => api.readings(house.drainId),
    });
  return (
    <Drawer title={house.id + ' · Drain ' + house.drainId} onClose={() => close(null)}>
      <p>{timeLabel(house.lastReadingAt)}</p>
      <p>
        <Term text="Owner of record" />: {house.ownerOfRecord}
      </p>
      <p>
        Nearest feature:{' '}
        <Link to={'/feature/' + house.nearestFeature} onClick={() => close(null)}>
          {house.nearestFeature}
        </Link>
      </p>
      <h3>Latest readings</h3>
      <ul className="compact-readings">
        {readings.data
          ?.slice(-5)
          .reverse()
          .map((r, i) => (
            <li key={i}>
              <strong>{displayName(r.metric)}</strong>
              <span>{formatValue(r.value, r.unit)}</span>
              <small>{timeLabel(r.t)}</small>
            </li>
          ))}
      </ul>
      <Link to={'/sensors?asset=' + house.drainId}>More readings</Link>
      <h3>Faults</h3>
      {faults
        .filter((f) => f.featureId === house.drainId)
        .map((f) => (
          <p key={f.id}>
            <Link to={'/faults?asset=' + f.featureId}>
              {f.id} · {displayName(f.type)}
            </Link>{' '}
            · {displayName(f.status)}
          </p>
        ))}
      {!faults.some((f) => f.featureId === house.drainId) && <p>No faults recorded.</p>}
    </Drawer>
  );
}
