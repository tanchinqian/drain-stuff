import type { Feature, House, Sensor, Zone, ZoneRain } from '../api/types';
import { useSelection } from '../state';
import { useNavigate } from 'react-router-dom';
export default function PlanMap({
  houses,
  zones,
  features,
  rain,
  layer,
  sensors,
  showSensors,
}: {
  houses: House[];
  zones: Zone[];
  features: Feature[];
  rain: ZoneRain[];
  layer: 'water' | 'rain';
  sensors: Sensor[];
  showSensors: boolean;
}) {
  const selectHouse = useSelection((s) => s.selectHouse),
    selectZone = useSelection((s) => s.selectZone);
  const navigate = useNavigate();
  return (
    <>
      <svg
        className="plan-svg"
        viewBox="0 0 850 650"
        role="group"
        aria-label="Flat site plan with sensor positions"
      >
        <rect width="850" height="650" fill="var(--well)" />
        <path d="M40 44H810 M425 75V590 M40 325H810" stroke="var(--panel)" strokeWidth="42" />
        <text x="55" y="40">
          River edge · schematic
        </text>
        {houses.map((h) => (
          <g
            key={h.id}
            role="button"
            tabIndex={0}
            aria-label={'House ' + h.id}
            onClick={() => selectHouse(h.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectHouse(h.id);
              }
            }}
            transform={`translate(${425 + h.x * 35},${325 + h.y * 31})`}
          >
            <rect
              x="-32"
              y="-26"
              width="64"
              height="52"
              fill={layer === 'water' && h.holdsWater6h ? 'var(--heat-1)' : 'var(--panel)'}
              stroke="var(--ink2)"
            />
            <text textAnchor="middle" y="5">
              {h.id}
            </text>
          </g>
        ))}
        {features.map((f) => (
          <g
            key={f.id}
            role="button"
            tabIndex={0}
            aria-label={'Open feature ' + f.id}
            onClick={() => navigate('/feature/' + f.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate('/feature/' + f.id);
            }}
            transform={`translate(${425 + f.x * 35},${325 + f.y * 31})`}
          >
            <rect x="-45" y="-12" width="90" height="24" fill="var(--ink)" />
            <text textAnchor="middle" y="5" className="feature-label">
              {f.id}
            </text>
          </g>
        ))}
        {showSensors &&
          sensors.map((s) => (
            <g
              key={s.sensorId}
              transform={`translate(${425 + s.siteLocation.x * 35},${325 + s.siteLocation.z * 31})`}
            >
              <title>
                {s.sensorId} · {s.status} · {s.metric}
              </title>
              {s.status === 'suspect' ? (
                <path d="M0 -5L5 4H-5Z" fill="var(--heat-3)" />
              ) : s.status === 'offline' ? (
                <path d="M0 -5L5 0L0 5L-5 0Z" fill="var(--ink2)" />
              ) : (
                <rect x="-3" y="-3" width="6" height="6" fill="var(--ink)" />
              )}
            </g>
          ))}
      </svg>
      <div className="plan-grid">
        {zones.map((z) => (
          <section key={z.id} className="plan-zone">
            <button onClick={() => selectZone(z.id)}>
              Zone {z.id} · {rain.find((r) => r.zone === z.id)?.peakMmPerHr || z.peakMmPerHr} mm/h
            </button>
            <div className="plan-houses">
              {houses
                .filter((h) => h.zone === z.id)
                .map((h) => (
                  <button
                    key={h.id}
                    onClick={() => selectHouse(h.id)}
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
        <p className="small full-span">Road and river are schematic. Not a survey.</p>
      </div>
    </>
  );
}
