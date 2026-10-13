import { useMemo } from 'react';
import type { Feature, House, Sensor, Zone, ZoneRain } from '../api/types';
import { useSelection } from '../state';
import { useNavigate } from 'react-router-dom';
import { featureCallouts, pilotByBuilding, planPoint, site } from '../site/layout';
import { weatherCanvas } from '../site/weather';

export default function PlanMap({
  houses,
  zones,
  features,
  rain,
  layer,
  sensors,
  showSensors,
  cloudOpacity,
  mappedHouseId,
  onSelectMapped,
}: {
  houses: House[];
  zones: Zone[];
  features: Feature[];
  rain: ZoneRain[];
  layer: 'water' | 'rain';
  sensors: Sensor[];
  showSensors: boolean;
  cloudOpacity: number;
  mappedHouseId: string | null;
  onSelectMapped: (id: string | null) => void;
}) {
  const selectHouse = useSelection((s) => s.selectHouse),
    selectZone = useSelection((s) => s.selectZone),
    selected = useSelection((s) => s.houseId),
    positions = useSelection((s) => s.housePositions);
  const navigate = useNavigate();
  const cloud = useMemo(() => weatherCanvas(rain).toDataURL(), [rain]);
  return (
    <>
      <svg
        className="plan-svg"
        viewBox="0 0 850 480"
        role="group"
        aria-label="Mapped landed-house plan with simulated rainfall"
      >
        <rect width="850" height="480" fill="var(--well2)" />
        {site.areas.map((a) => (
          <polygon
            key={a.id}
            points={a.outline.map(([x, z]) => planPoint(x, z).join(',')).join(' ')}
            fill={a.kind === 'water' ? 'var(--well)' : 'var(--heat-0)'}
          />
        ))}
        {site.roads.map((r) => (
          <g key={r.id}>
            {r.segments.map(([a, b], i) => (
              <path
                key={i}
                d={`M${planPoint(a[0], a[1]).join(' ')}L${planPoint(b[0], b[1]).join(' ')}`}
                stroke="var(--panel)"
                strokeWidth={r.width * 12}
              />
            ))}
          </g>
        ))}
        {site.houses.map((h) => {
          const pilotId = pilotByBuilding.get(h.id),
            pilot = houses.find((p) => p.id === pilotId),
            id = pilotId || h.id;
          const p = positions[id] || (pilot ? [pilot.x, pilot.y] : [h.x, h.z]);
          const choose = () => {
            selectHouse(pilot ? id : null);
            onSelectMapped(pilot ? null : id);
          };
          return (
            <g
              key={id}
              role="button"
              tabIndex={pilot ? 0 : -1}
              aria-label={pilot ? 'House ' + id : 'Mapped house ' + id}
              data-house-id={id}
              onClick={choose}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  choose();
                }
              }}
            >
              <polygon
                points={h.outline
                  .map(([x, z]) => planPoint(x - h.x + p[0], z - h.z + p[1]).join(','))
                  .join(' ')}
                fill={
                  id === selected || id === mappedHouseId
                    ? 'var(--heat-2)'
                    : layer === 'water' && pilot?.holdsWater6h
                      ? 'var(--heat-1)'
                      : pilot
                        ? 'var(--panel)'
                        : 'var(--border)'
                }
                stroke="var(--ink2)"
                strokeWidth=".7"
              />
              <title>
                {pilot ? id + ' · Synthetic pilot household' : id + ' · Map footprint only'}
              </title>
            </g>
          );
        })}
        {layer === 'rain' && (
          <image
            href={cloud}
            x="29"
            y="72"
            width="792"
            height="336"
            opacity={cloudOpacity / 100}
            pointerEvents="none"
          />
        )}
        {features.map((f) => {
          const [x1, y1] = planPoint(f.x, f.y),
            [x2, y2] = planPoint(...(featureCallouts[f.id] || [f.x, f.y]));
          return (
            <line
              key={f.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--ink2)"
              strokeWidth="1"
              pointerEvents="none"
            />
          );
        })}
        {features.map((f) => {
          const [x, y] = planPoint(...(featureCallouts[f.id] || [f.x, f.y]));
          return (
            <g
              key={f.id}
              role="button"
              tabIndex={0}
              aria-label={'Open feature ' + f.id}
              transform={`translate(${x},${y})`}
              onClick={() => navigate('/feature/' + f.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/feature/' + f.id);
                }
              }}
            >
              <rect x="-22" y="-22" width="44" height="44" rx="2" fill="var(--ink)" />
              <text textAnchor="middle" y="5" className="feature-label">
                {f.id}
              </text>
            </g>
          );
        })}
        {showSensors &&
          sensors.map((s) => {
            const house = houses.find((h) => h.drainId === s.ownerId),
              moved = house && positions[house.id];
            const [x, y] = planPoint(
              s.siteLocation.x + (house && moved ? moved[0] - house.x : 0),
              s.siteLocation.z + (house && moved ? moved[1] - house.y : 0),
            );
            return (
              <g key={s.sensorId} transform={`translate(${x},${y})`} pointerEvents="none">
                <title>
                  {s.sensorId} · {s.status} · {s.metric}
                </title>
                {s.status === 'suspect' || s.status === 'offline' ? (
                  <path d="M0 -5L5 0L0 5L-5 0Z" fill="var(--ink2)" />
                ) : (
                  <rect x="-3" y="-3" width="6" height="6" fill="var(--ink)" />
                )}
              </g>
            );
          })}
        <path d="M65 442H185M65 437V447M185 437V447" stroke="var(--ink)" />
        <text x="65" y="467">
          200 m · Map geometry
        </text>
        <text x="778" y="40">
          North ↑
        </text>
      </svg>
      <div className="plan-grid">
        {zones.map((z) => (
          <section key={z.id} className="plan-zone">
            <button onClick={() => selectZone(z.id)}>
              Zone {z.id} · {rain.find((r) => r.zone === z.id)?.peakMmPerHr ?? z.peakMmPerHr} mm/h
            </button>
            <div className="plan-houses">
              {houses
                .filter((h) => h.zone === z.id)
                .map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      onSelectMapped(null);
                      selectHouse(h.id);
                    }}
                    aria-label={
                      h.id + (h.holdsWater6h ? ' holds water after six hours' : ' no water held')
                    }
                    style={{
                      background:
                        layer === 'water' && h.holdsWater6h ? 'var(--heat-1)' : 'var(--ground)',
                    }}
                  >
                    <span className={'status-mark ' + (h.holdsWater6h ? 'watch' : 'ok')} />
                    {h.id}
                  </button>
                ))}
            </div>
          </section>
        ))}
        <div className="inline full-span">
          {features.map((f) => (
            <button key={f.id} onClick={() => navigate('/feature/' + f.id)}>
              {f.id} · {f.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
