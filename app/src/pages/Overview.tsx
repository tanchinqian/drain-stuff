import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useSelection } from '../state';
import { useSimulation } from '../simulation/physics/store';
import NeighbourhoodScene from '../three/NeighbourhoodScene';
import PlanMap from '../components/PlanMap';
import HouseRecord from '../components/HouseRecord';
import { QueryState } from '../components/QueryState';
import OverviewCharts from '../components/OverviewCharts';
import Chip from '../components/Chip';
import PhysicsControls from '../components/PhysicsControls';
import { radarStops } from '../site/weather';
import { site } from '../site/layout';
import { partName } from '../api/modelCatalog';
import { dateTime, dateOnly, displayName, timeLabel, faultOrder } from '../utils';
export default function Overview() {
  const [now] = useState(() => new Date().toISOString());
  const [view, setView] = useState<'3d' | 'plan'>('3d'),
    [range, setRange] = useState('Last storm'),
    [layer, setLayer] = useState<'rain' | 'water'>('rain'),
    [cloudOpacity, setCloudOpacity] = useState(55),
    [reset, setReset] = useState(0),
    [showSensors, setShowSensors] = useState(false);
  const houseId = useSelection((s) => s.houseId),
    selectHouse = useSelection((s) => s.selectHouse),
    zoneId = useSelection((s) => s.zoneId),
    selectZone = useSelection((s) => s.selectZone),
    second = useSimulation((s) => s.second);
  useEffect(()=>{selectZone(null);selectHouse(null);},[selectZone,selectHouse]);
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  const to = config.data?.dataThrough ?? now,
    from = new Date(
      Date.parse(to) -
        (range === 'Last storm' ? 2 * 3600000 : range === '7 days' ? 7 : 56) *
          (range === 'Last storm' ? 1 : 86400000),
    ).toISOString();
  const query = useQuery({
    queryKey: ['overview', from, to],
    enabled: !!config.data,
    queryFn: async () => {
      const [zones, houses, features, faults, rain, rainfall, sensors] = await Promise.all([
        api.zones(),
        api.houses(),
        api.features(),
        api.faults(from, to),
        api.zoneRain(from, to),
        api.rainfall(from, to),
        api.sensors(),
      ]);
      return { zones, houses, features, faults, rain, rainfall, sensors };
    },
  });
  const available = useQuery({
    queryKey: ['rainfall-availability', to],
    enabled: !!config.data,
    queryFn: () =>
      Promise.all(
        [2 * 3600000, 7 * 86400000, 56 * 86400000].map(
          async (span) =>
            (await api.rainfall(new Date(Date.parse(to) - span).toISOString(), to)).length > 0,
        ),
      ),
  });
  const data = query.data,
    house = data?.houses.find((h) => h.id === houseId),
    features = data?.features.filter((f) => !zoneId || f.zone === zoneId) ?? [],
    faults = data?.faults.filter((f) => !zoneId || f.zone === zoneId) ?? [];
  const start = data?.rainfall[0]?.t ?? from,
    end = data?.rainfall.at(-1)?.t ?? to;
  const duration = useSimulation(
    (s) => s.configs.S1.values.duration.value + s.configs.S1.values.recovery.value,
  );
  const clock = Date.parse(start) + ((Date.parse(end) - Date.parse(start)) * second) / duration;
  const samples = (data?.zones ?? []).map((z) => {
    const series = (data?.rain ?? []).filter((r) => r.zone === z.id);
    const point = series.filter((r) => !r.t || Date.parse(r.t) <= clock).at(-1);
    return {
      synthetic: true as const,
      zone: z.id,
      t: point?.t ?? start,
      peakMmPerHr: point?.mmPerHr ?? point?.peakMmPerHr ?? 0,
      totalMm: point?.totalMm ?? 0,
    };
  });
  const weatherTimes=Array.from(new Set((data?.rain??[]).filter(r=>!zoneId||r.zone===zoneId).map(r=>r.t??start))).sort();
  const chartRain=weatherTimes.map(t=>{const rows=(data?.rain??[]).filter(r=>(r.t??start)===t&&(!zoneId||r.zone===zoneId));return {t,mmPerHr:rows.reduce((n,r)=>n+(r.mmPerHr??r.peakMmPerHr),0)/Math.max(1,rows.length),cumulativeMm:rows.reduce((n,r)=>n+r.totalMm,0)/Math.max(1,rows.length)};});
  const sampleAt=samples[0]?.t??start;
  return (
    <QueryState loading={config.isPending || query.isPending} error={query.error ?? config.error}>
      <div className="page-heading">
        <h1>Overview</h1>
        <div className="segments" aria-label="Time range">
          {['Last storm', '7 days', '8 weeks'].map((r, i) => (
            <button
              disabled={available.data?.[i] === false}
              title={
                available.data?.[i] === false ? 'No rainfall records for this period' : undefined
              }
              key={r}
              aria-pressed={range === r}
              onClick={() => {
                setRange(r);
                selectHouse(null);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {data && config.data && (
        <>
          <p className="attention-summary">
            {faults.filter((f) => f.status !== 'closed').length} faults open ·{' '}
            {data.sensors.filter((s) => (!zoneId || s.zone === zoneId) && s.status !== 'ok').length}{' '}
            sensors need attention
          </p>
          <div className="zone-filter segments" aria-label="Zone filter">
            {[null, 'A', 'B', 'C', 'D'].map((z) => (
              <button
                key={z ?? 'all'}
                aria-pressed={zoneId === z}
                onClick={() => {
                  selectZone(z as 'A' | 'B' | 'C' | 'D' | null);
                  selectHouse(null);
                }}
              >
                {z ? 'Zone ' + z : 'All zones'}
              </button>
            ))}
          </div>
          <div className="overview-grid">
            <section className="panel overview-map">
              <div className="panel-heading">
                <div>
                  <h2>Homes and drainage</h2>
                  <p className="sub">Bandar Bukit Raja Phase 1 · {range}</p>
                </div>
                <div className="segments">
                  <button aria-pressed={view === '3d'} onClick={() => setView('3d')}>
                    3D
                  </button>
                  <button aria-pressed={view === 'plan'} onClick={() => setView('plan')}>
                    Plan
                  </button>
                </div>
              </div>
              <div className="scene-toolbar">
                <button aria-pressed={showSensors} onClick={() => setShowSensors(!showSensors)}>
                  Sensors
                </button>
                <button aria-pressed={layer === 'rain'} onClick={() => setLayer('rain')}>
                  Rainfall
                </button>
                <button aria-pressed={layer === 'water'} onClick={() => setLayer('water')}>
                  Water after 6 h
                </button>
                <button onClick={() => setReset(reset + 1)}>Reset view</button>
                <label className="cloud-control">
                  Rainfall layer opacity
                  <input
                    aria-label="Rainfall layer opacity"
                    type="range"
                    min="0"
                    max="75"
                    step="5"
                    value={cloudOpacity}
                    onChange={(e) => setCloudOpacity(Number(e.target.value))}
                  />
                  <output>{cloudOpacity}%</output>
                </label>

              </div>
              <p className="small rainfall-instant">Current rainfall sample · {dateTime(sampleAt)}. Chart shows the full selected period.</p>
              <div className="map-zones" aria-label="Zone rainfall" data-sample-time={sampleAt}>
                {samples
                  .filter((s) => !zoneId || s.zone === zoneId)
                  .map((s) => (
                    <span key={s.zone}>
                      Zone {s.zone} · {s.peakMmPerHr.toFixed(1)} mm/h
                    </span>
                  ))}
              </div>
              {view === '3d' ? (
                <NeighbourhoodScene
                  houses={data.houses}
                  zones={data.zones}
                  features={features}
                  rain={samples}
                  layer={layer}
                  cloudOpacity={cloudOpacity}
                  reset={reset}
                  sensors={data.sensors}
                  showSensors={showSensors}
                />
              ) : (
                <PlanMap
                  houses={data.houses}
                  zones={data.zones}
                  features={features}
                  rain={samples}
                  layer={layer}
                  sensors={data.sensors}
                  showSensors={showSensors}
                  cloudOpacity={cloudOpacity}
                />
              )}
              <p className="scene-caption">
                Click a pilot house or pin. Drag to orbit · Scroll to zoom. Use Plan for keyboard access.
              </p>
              <div className="heat-legend">
                <span>
                  <i style={{ background: 'var(--panel)', border: '1px solid var(--ink)' }} />
                  Pilot house
                </span>
                {layer === 'rain' &&
                  radarStops.map((stop) => (
                    <span key={stop.value}>
                      <i style={{ background: stop.color }} />
                      {stop.label}
                    </span>
                  ))}
              </div>
              <p className="small">
                Rainfall layer · {dateTime(new Date(clock).toISOString())} · {range}
              </p>
              <details>
                <summary>Storm playback</summary>
                <PhysicsControls ownerId="S1" />
              </details>
              {!data.rainfall.length && (
                <p role="status">No rainfall records in this range. Select another period.</p>
              )}
              <p className="small map-evidence">
                <a href={site.googleMapsUrl} target="_blank" rel="noreferrer">
                  Compare on Google Maps
                </a>{' '}
                ·{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                  © OpenStreetMap contributors · ODbL
                </a>
              </p>
              {house && <HouseRecord house={house} faults={data.faults} />}
            </section>
            <section className="panel attention-faults" aria-label="Open faults">
              <h2>Open faults</h2>
              <p className="small" title="Sorted by severity, then impact, then age">
                Priority order
              </p>
              {faults
                .filter((f) => f.status !== 'closed')
                .sort(faultOrder)
                .slice(0, 5)
                .map((f) => (
                  <article key={f.id} className="fault-card">
                    <Chip value={f.severity === 3 ? 'High' : f.severity === 2 ? 'Medium' : 'Low'} />
                    <h3>{displayName(f.type)}</h3>
                    <p>
                      {f.featureId} · {partName(f.partId)} · Zone {f.zone}
                    </p>
                    <p className="small">{timeLabel(f.openedAt)}</p>
                    <Link className="button" to={'/faults?asset=' + f.featureId}>
                      Open
                    </Link>
                  </article>
                ))}
              {!faults.some((f) => f.status !== 'closed') && (
                <p>No open faults for this period and zone.</p>
              )}
              <Link className="button" to="/faults">
                View all faults
              </Link>
            </section>
          </div>
          <OverviewCharts
            rainfall={chartRain}
            features={features}
            faults={faults}
            config={config.data}
            from={from}
            to={to}
            range={range}
            observationDate={dateOnly(to)}
            sampleAt={sampleAt}
          />
        </>
      )}
    </QueryState>
  );
}
