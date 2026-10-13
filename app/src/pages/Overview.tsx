import SearchableSelect from '../components/SearchableSelect';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { DEMO_NOW } from '../api/mock/seed';
import { useSelection } from '../state';
import NeighbourhoodScene from '../three/NeighbourhoodScene';
import PlanMap from '../components/PlanMap';
import HouseRecord from '../components/HouseRecord';
import Status from '../components/Status';
import { QueryState } from '../components/QueryState';
import { dateTime } from '../utils';
import OverviewCharts from '../components/OverviewCharts';
import SensorPositions from '../components/SensorPositions';
import { sensorMarkers } from '../api/sensorViews';
import { partLink } from '../api/modelCatalog';
import { mappedHouses, pilotByBuilding, site } from '../site/layout';
import { radarStops } from '../site/weather';
import MappedHouseRecord from '../components/MappedHouseRecord';
export default function Overview() {
  const [view, setView] = useState<'3d' | 'plan'>('3d'),
    [layer, setLayer] = useState<'rain' | 'water'>('rain'),
    [range, setRange] = useState('Last storm'),
    [move, setMove] = useState(false),
    [reset, setReset] = useState(0),
    [cloudOpacity, setCloudOpacity] = useState(55),
    [mappedHouseId, setMappedHouseId] = useState<string | null>(null),
    [showSensors, setShowSensors] = useState(
      new URLSearchParams(location.search).get('sensors') === '1',
    );
  const houseId = useSelection((s) => s.houseId),
    zoneId = useSelection((s) => s.zoneId),
    selectHouse = useSelection((s) => s.selectHouse),
    selectZone = useSelection((s) => s.selectZone),
    resetHouses = useSelection((s) => s.resetHouses);
  const from = new Date(
    Date.parse(DEMO_NOW) -
      (range === 'Last storm' ? 2 * 3600000 : range === '7 days' ? 7 * 86400000 : 56 * 86400000),
  ).toISOString();
  const result = useQuery({
    queryKey: ['overview', range],
    queryFn: async () => {
      const [zones, houses, features, faults, rain, rainfall, config, sensors] = await Promise.all([
        api.zones(),
        api.houses(),
        api.features(),
        api.faults(),
        api.zoneRain(from, DEMO_NOW),
        api.rainfall(from, DEMO_NOW),
        api.config(),
        api.sensors(),
      ]);
      return { zones, houses, features, faults, rain, rainfall, config, sensors };
    },
  });
  const data = result.data;
  const house = data?.houses.find((h) => h.id === houseId);
  const mappedHouse = mappedHouseId ? mappedHouses.get(mappedHouseId) : undefined;
  return (
    <QueryState loading={result.isPending} error={result.error}>
      <div className="page-heading">
        <div>
          <h1>Follow the water. Find the fault.</h1>
          <p className="sub">Last reading: {dateTime(DEMO_NOW)} · Synthetic</p>
        </div>
        <div className="segments">
          {['Last storm', '7 days', '8 weeks'].map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
      {data && (
        <>
          <div className="summary-strip">
            <div>
              <small>Sensor / human inputs</small>
              <Link to="/sensors">{data.sensors.length} registered</Link>
            </div>
            <div>
              <small>Suspect inputs</small>
              {data.sensors.filter((s) => s.status === 'suspect').length}
            </div>
            <div>
              <small>Offline inputs</small>
              {data.sensors.filter((s) => s.status === 'offline').length}
            </div>
          </div>
          <div className="overview-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Every house, and where water remains</h2>
                  <p className="sub">Bandar Bukit Raja Phase 1 · Gamelan / Rodat housing window</p>
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
              <nav className="feature-jumps" aria-label="Open a drainage trial">
                {data.features
                  .filter((f) => f.kind === 'swale')
                  .map((f) => (
                    <Link key={f.id} className="feature-jump" to={'/feature/' + f.id}>
                      <strong>
                        <i
                          style={{
                            background: `var(--arm-${f.arm === 'decompaction' ? 'decompact' : f.arm})`,
                          }}
                        />
                        {f.id} · {f.name}
                      </strong>
                      <span>
                        Zone {f.zone} ·{' '}
                        {f.arm === 'compost'
                          ? 'Compost trial'
                          : f.arm === 'decompaction'
                            ? 'Decompaction trial'
                            : 'Control trial'}
                      </span>
                    </Link>
                  ))}
              </nav>
              <div className="scene-toolbar">
                <button aria-pressed={showSensors} onClick={() => setShowSensors(!showSensors)}>
                  Sensors
                </button>
                <button aria-pressed={layer === 'water'} onClick={() => setLayer('water')}>
                  Water after 6 h
                </button>
                <button aria-pressed={layer === 'rain'} onClick={() => setLayer('rain')}>
                  Rainfall
                </button>
                {layer === 'rain' && (
                  <label className="cloud-control">
                    Cloud opacity
                    <input
                      aria-label="Cloud opacity"
                      type="range"
                      min="0"
                      max="75"
                      step="5"
                      value={cloudOpacity}
                      onChange={(e) => setCloudOpacity(Number(e.target.value))}
                    />
                    <output>{cloudOpacity}%</output>
                  </label>
                )}
                {view === '3d' && (
                  <>
                    <button aria-pressed={!move} onClick={() => setMove(false)}>
                      Orbit
                    </button>
                    <button aria-pressed={move} onClick={() => setMove(true)}>
                      Move houses
                    </button>
                    <button
                      onClick={() => {
                        resetHouses();
                        setReset((r) => r + 1);
                      }}
                    >
                      Reset layout
                    </button>
                    <button onClick={() => setReset((r) => r + 1)}>Reset view</button>
                  </>
                )}
                <div>
                  <span>House</span>
                  <SearchableSelect
                    label="House"
                    aria-label="Select a house"
                    value={houseId || ''}
                    onChange={(e) => {
                      setMappedHouseId(null);
                      selectHouse(e.target.value || null);
                    }}
                  >
                    <option value="">Select a house</option>
                    {data.houses.map((h) => (
                      <option key={h.id}>{h.id}</option>
                    ))}
                  </SearchableSelect>
                </div>
                <div>
                  <span>Map house</span>
                  <SearchableSelect
                    label="Map house"
                    aria-label="Select a mapped house"
                    value={mappedHouseId || ''}
                    onChange={(e) => {
                      selectHouse(null);
                      setMappedHouseId(e.target.value || null);
                    }}
                  >
                    <option value="">Select a mapped house</option>
                    {site.houses
                      .filter((h) => !pilotByBuilding.has(h.id))
                      .map((h) => (
                        <option key={h.id}>{h.id}</option>
                      ))}
                  </SearchableSelect>
                </div>
              </div>
              {view === '3d' ? (
                <NeighbourhoodScene
                  houses={data.houses}
                  zones={data.zones}
                  features={data.features}
                  rain={data.rain}
                  layer={layer}
                  cloudOpacity={cloudOpacity}
                  mappedHouseId={mappedHouseId}
                  onSelectMapped={setMappedHouseId}
                  move={move}
                  reset={reset}
                  sensors={data.sensors}
                  showSensors={showSensors}
                />
              ) : (
                <PlanMap
                  {...data}
                  layer={layer}
                  showSensors={showSensors}
                  cloudOpacity={cloudOpacity}
                  mappedHouseId={mappedHouseId}
                  onSelectMapped={setMappedHouseId}
                />
              )}
              {showSensors && <SensorPositions sensors={sensorMarkers(data.sensors)} />}
              <p className="scene-caption">
                Drag to orbit · Scroll to zoom · In Move houses, select a house, then drag it.
              </p>
              {view === '3d' && (
                <div className="inline secondary-features">
                  {data.features
                    .filter((f) => f.kind !== 'swale')
                    .map((f) => (
                      <Link key={f.id} className="button" to={'/feature/' + f.id}>
                        {f.id} · {f.name}
                      </Link>
                    ))}
                </div>
              )}
              <div className="heat-legend">
                {layer === 'rain' ? (
                  radarStops.map((stop) => (
                    <span key={stop.value}>
                      <i style={{ background: stop.color }} />
                      {stop.label}
                    </span>
                  ))
                ) : (
                  <span>
                    <i style={{ background: 'var(--heat-1)' }} />
                    Pilot house holding water after 6 h
                  </span>
                )}
              </div>
              <p className="small map-evidence">
                {site.houses.length} mapped footprints · 24 synthetic pilot assignments. Heights,
                drainage locations and weather are illustrative; not a survey or live radar.
                <br />
                <a href={site.googleMapsUrl} target="_blank" rel="noreferrer">
                  Compare on Google Maps
                </a>{' '}
                ·{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                  © OpenStreetMap contributors · ODbL
                </a>{' '}
                · Map extract {site.fetchedAt}
              </p>
              {zoneId && (
                <div className="notice" role="status">
                  Zone {zoneId}: {data.zones.find((z) => z.id === zoneId)?.housesHoldingWater6h} of
                  6 houses hold water after 6 h.{' '}
                  <button onClick={() => selectZone(null)}>Clear zone</button>
                </div>
              )}
              {house && <HouseRecord house={house} faults={data.faults} inline={move} />}
              {mappedHouse && (
                <MappedHouseRecord house={mappedHouse} onClose={() => setMappedHouseId(null)} />
              )}
            </section>
            <aside className="right-rail">
              <section className="panel">
                <h2>Zones, worst first</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Zone</th>
                      <th>Peak mm/h</th>
                      <th>Held / 6</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.zones]
                      .sort((a, b) => b.housesHoldingWater6h - a.housesHoldingWater6h)
                      .map((z) => (
                        <tr key={z.id}>
                          <td>
                            <button onClick={() => selectZone(z.id)}>{z.id}</button>
                          </td>
                          <td className="numeric">{z.peakMmPerHr}</td>
                          <td className="numeric">{z.housesHoldingWater6h} / 6</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <p className="takeaway">Zone A needs the first check.</p>
              </section>
              <section className="panel">
                <h2>Open faults</h2>
                {data.faults
                  .filter((f) => f.status !== 'closed')
                  .slice(0, 5)
                  .map((f) => (
                    <Link
                      className="fault-link"
                      key={f.id}
                      to={partLink(
                        f.featureId,
                        f.partId,
                        data.sensors.find((s) => s.ownerId === f.featureId)?.scope ?? 'drainage',
                      )}
                    >
                      <Status
                        status={
                          f.type === 'sensor_offline'
                            ? 'offline'
                            : f.type === 'standing_water'
                              ? 'watch'
                              : 'fault'
                        }
                      />
                      <span>
                        {f.type.replaceAll('_', ' ')}
                        <p className="small">
                          {f.featureId} · Zone {f.zone}
                        </p>
                      </span>
                    </Link>
                  ))}
                <Link className="button" to="/faults">
                  View all {data.faults.filter((f) => f.status !== 'closed').length} open faults
                </Link>
                {data.faults.every((f) => f.status === 'closed') && (
                  <p className="empty">No open faults.</p>
                )}
              </section>
            </aside>
          </div>
          <OverviewCharts
            rainfall={data.rainfall}
            features={data.features}
            faults={data.faults}
            config={data.config}
          />
        </>
      )}
    </QueryState>
  );
}
