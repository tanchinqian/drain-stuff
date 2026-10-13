import type { MapHouse } from '../site/layout';
import HousePosition from './HousePosition';

export default function MappedHouseRecord({
  house,
  onClose,
}: {
  house: MapHouse;
  onClose: () => void;
}) {
  return (
    <section className="mapped-house-record" aria-label="Selected mapped house">
      <div className="panel-heading">
        <h3>Mapped landed house</h3>
        <button onClick={onClose}>Close map house</button>
      </div>
      <p>
        {house.id} ·{' '}
        <a
          href={'https://www.openstreetmap.org/way/' + house.id.replace('OSM-', '')}
          target="_blank"
          rel="noreferrer"
        >
          View source footprint
        </a>
      </p>
      <p className="small">
        Map geometry only. This house has no pilot readings or assigned sensor records. Roof and
        height are illustrative.
      </p>
      <HousePosition id={house.id} x={house.x} z={house.z} />
      <p className="small">
        Position edits affect this local display only. Reset layout restores the mapped placement.
      </p>
    </section>
  );
}
