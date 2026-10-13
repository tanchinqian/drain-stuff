import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Fault, House } from '../api/types';
import { useSelection } from '../state';
import { dateTime } from '../utils';
import Status from './Status';
import HousePosition from './HousePosition';
export default function HouseRecord({
  house,
  faults,
  inline,
}: {
  house: House;
  faults: Fault[];
  inline: boolean;
}) {
  const close = useSelection((s) => s.selectHouse);
  const dialog = useRef<HTMLDialogElement>(null);
  const readings = useQuery({
    queryKey: ['readings', house.drainId],
    queryFn: () => api.readings(house.drainId),
  });
  useEffect(() => {
    if (!inline) {
      if (!dialog.current?.open) dialog.current?.showModal();
    }
  }, [inline, house.id]);
  const content = (
    <>
      <div className="panel-heading">
        <h2>
          {house.id} · Drain {house.drainId}
        </h2>
        <button onClick={() => close(null)} aria-label="Close house record">
          Close
        </button>
      </div>
      <Status status={house.holdsWater6h ? 'watch' : 'ok'} />
      <p className="sub">Synthetic · {dateTime(house.lastReadingAt)}</p>
      <hr className="divider" />
      <p>Owner of record: {house.ownerOfRecord}</p>
      <p>
        Nearest feature:{' '}
        <Link to={'/feature/' + house.nearestFeature} onClick={() => close(null)}>
          {house.nearestFeature}
        </Link>
      </p>
      <h3 style={{ marginTop: 20 }}>Last five readings</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Drain-down</th>
            </tr>
          </thead>
          <tbody>
            {readings.data?.slice(-5).map((r) => (
              <tr key={r.t}>
                <td>{dateTime(r.t)}</td>
                <td>
                  {r.value} {r.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 style={{ marginTop: 20 }}>Fault history</h3>
      {faults
        .filter((f) => f.featureId === house.drainId)
        .map((f) => (
          <p key={f.id}>
            {f.id} · {f.type.replaceAll('_', ' ')} · {f.status}
          </p>
        ))}
      {!faults.some((f) => f.featureId === house.drainId) && (
        <p className="small">No faults recorded.</p>
      )}
      <HousePosition id={house.id} x={house.x} z={house.y} />
      <p className="small" style={{ marginTop: 12 }}>
        Position edits affect this schematic only.
      </p>
    </>
  );
  return inline ? (
    <section className="panel" style={{ marginTop: 16 }} aria-label="Selected house">
      {content}
    </section>
  ) : (
    <dialog ref={dialog} className="drawer" aria-label="House record" onClose={() => close(null)}>
      {content}
    </dialog>
  );
}
