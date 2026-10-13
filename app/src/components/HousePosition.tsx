import { mapBounds, site } from '../site/layout';
import { useSelection } from '../state';

export default function HousePosition({ id, x, z }: { id: string; x: number; z: number }) {
  const positions = useSelection((s) => s.housePositions),
    move = useSelection((s) => s.moveHouse);
  const position = positions[id] || [x, z];
  return (
    <div className="coordinate-grid">
      {(['X', 'Z'] as const).map((axis, i) => {
        const limit = (i === 0 ? mapBounds.x : mapBounds.z) * site.metresPerUnit;
        return (
          <label className="field" key={axis}>
            {axis}, metres from map origin
            <input
              aria-label={'House ' + axis + ' position'}
              type="number"
              step="1"
              min={-limit}
              max={limit}
              value={Number((position[i] * site.metresPerUnit).toFixed(1))}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value)) {
                  const next: [number, number] = [...position];
                  next[i] = Math.max(-limit, Math.min(limit, value)) / site.metresPerUnit;
                  move(id, next);
                }
              }}
            />
          </label>
        );
      })}
    </div>
  );
}
