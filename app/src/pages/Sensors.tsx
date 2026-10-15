import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Sensor } from '../api/types';
import { useLiveSensors } from '../simulation/physics/view';
import { usePhysics } from '../simulation/physics/view';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import Chip from '../components/Chip';
import Term from '../components/Term';
import ChartFrame from '../components/ChartFrame';
import { QueryState } from '../components/QueryState';
import { formatValue, displayName, timeLabel, dateTime } from '../utils';
import { partName, partLink } from '../api/modelCatalog';
const empty: Sensor[] = [];
function SensorDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const result = useQuery({ queryKey: ['sensor', id], queryFn: () => api.sensor(id) }),
    history = useQuery({ queryKey: ['sensor-history', id], queryFn: () => api.sensorReadings(id) }),
    rules = useQuery({ queryKey: ['fault-rules'], queryFn: api.faultRules });
  const live = useLiveSensors(result.data ? [result.data] : empty),
    s = live[0],
    physics = usePhysics(s?.ownerId ?? '');
  return (
    <Drawer title={id} onClose={onClose}>
      <QueryState loading={result.isPending} error={result.error}>
        {s && (
          <>
            <h3>{s.type}</h3>
            <p>
              {s.ownerId} · {partName(s.partId)}
            </p>
            <p>
              <strong>{s.lastText ?? formatValue(s.lastValue, s.unit)}</strong>
            </p>
            <Chip value={s.status} />
            <p>
              <Term text="Trust state" />:{' '}
              {displayName(s.drift === 'none' ? 'no_drift' : s.drift + ' drift')}
            </p>
            <p>
              <Term text={s.role} />: {s.proxyFor}
            </p>
            <p>Updated {timeLabel(s.lastAt)}</p>
            <p>Calibration / method check: {dateTime(s.calibratedAt)}</p>
            <p>
              Installed position: {formatValue(s.location.x, 'm', 2)},{' '}
              {formatValue(s.location.y, 'm', 2)}, {formatValue(s.location.z, 'm', 2)}
            </p>
            <p>
              Mount height:{' '}
              {formatValue(physics.config?.values.mountHeight.value ?? s.location.y, 'm', 2)}
            </p>
            <Link className="button" to={partLink(s.ownerId, s.partId, s.scope)}>
              Show installed part
            </Link>
            <h3>Rules this input feeds</h3>
            {rules.data
              ?.filter((r) =>
                s.usedByRules.some((k) => r.id.includes(k.replaceAll('_', '-').toUpperCase())),
              )
              .map((r) => (
                <p key={r.id}>
                  <Link to={'/faults?rule=' + r.id}>{r.label}</Link>
                </p>
              ))}
            <ChartFrame
              title="Reading history"
              subtitle={s.metric}
              headers={['Time', 'Value', 'Unit']}
              rows={(history.data ?? []).map((r) => [dateTime(r.t), r.value, r.unit])}
              takeaway="Readings remain unavailable while the input is not reporting."
            >
              <div className="sensor-history-bars">
                {history.data?.slice(-30).map((r, i) => (
                  <div key={i} title={dateTime(r.t) + ' · ' + formatValue(r.value, r.unit)}>
                    <span style={{ height: Math.max(3, Math.min(140, r.value * 2)) }} />
                    <small>{formatValue(r.value)}</small>
                  </div>
                ))}
              </div>
            </ChartFrame>
            <h3>Notes</h3>
            <p>{s.proxyFor}. Check an indirect measurement against its reference before acting.</p>
          </>
        )}
      </QueryState>
    </Drawer>
  );
}
export default function Sensors() {
  const [params, setParams] = useSearchParams(),
    [asset, setAsset] = useState('');
  const result = useQuery({ queryKey: ['sensors'], queryFn: () => api.sensors() }),
    live = useLiveSensors(result.data ?? empty);
  const selected = params.get('sensor');
  return (
    <QueryState loading={result.isPending} error={result.error}>
      <div className="page-heading">
        <h1>Sensors</h1>
      </div>
      <p>
        Where each sensor and manual input is installed, its latest reading, and whether it can be
        trusted.
      </p>
      <div className="master-detail">
        <aside className="master-list" aria-label="Sensor assets">
          <button aria-pressed={!asset} onClick={() => setAsset('')}>
            All assets
          </button>
          {Array.from(new Set(live.map((s) => s.ownerId))).map((id) => (
            <button key={id} aria-pressed={asset === id} onClick={() => setAsset(id)}>
              {id}
              <small>{live.filter((s) => s.ownerId === id).length} inputs</small>
            </button>
          ))}
        </aside>
        <section className="panel master-content">
          <DataTable
            id="sensors"
            rows={live.filter((s) => !asset || s.ownerId === asset)}
            rowId={(s) => s.sensorId}
            onSelect={(s) => setParams({ sensor: s.sensorId })}
            filters={[
              { key: 'zone', label: 'Zone', value: (s) => s.zone },
              { key: 'asset', label: 'Asset', value: (s) => s.ownerId },
              { key: 'part', label: 'Part', value: (s) => partName(s.partId) },
              { key: 'type', label: 'Type', value: (s) => s.type },
              { key: 'status', label: 'Status', value: (s) => s.status },
              { key: 'trust', label: 'Trust', value: (s) => s.drift },
            ]}
            columns={[
              { key: 'id', label: 'Sensor', value: (s) => s.sensorId },
              { key: 'type', label: 'Type', value: (s) => s.type },
              {
                key: 'asset',
                label: 'Asset and part',
                value: (s) => s.ownerId + ' · ' + partName(s.partId),
              },
              {
                key: 'value',
                label: 'Latest reading',
                value: (s) =>
                  s.status === 'offline'
                    ? 'Unavailable'
                    : (s.lastText ?? formatValue(s.lastValue, s.unit)),
              },
              {
                key: 'status',
                label: 'Status',
                value: (s) => s.status,
                render: (s) => <Chip value={s.status} />,
              },
              {
                key: 'trust',
                label: 'Trust state',
                value: (s) =>
                  s.drift === 'none' ? 'No drift flag' : displayName(s.drift) + ' drift',
              },
              {
                key: 'time',
                label: 'Updated',
                value: (s) => s.lastAt,
                render: (s) => timeLabel(s.lastAt),
              },
            ]}
          />
        </section>
      </div>
      {selected && <SensorDetail id={selected} onClose={() => setParams({})} />}
    </QueryState>
  );
}
