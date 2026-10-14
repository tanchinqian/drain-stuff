import { useLiveSensors } from '../simulation/physics/view';
import type { Sensor } from '../api/types';
const emptySensors: Sensor[] = [];
import SearchableSelect from '../components/SearchableSelect';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { bayParts, drainParts, partLink, partName } from '../api/modelCatalog';
import { sensorRows } from '../api/sensorViews';
import { QueryState } from '../components/QueryState';
import SensorInfo, { SensorTrust, SensorValue } from '../components/SensorInfo';
import { dateTime, exportCsv } from '../utils';
export default function Sensors() {
  const [params] = useSearchParams();
  const [zone, setZone] = useState(''),
    [partId, setPartId] = useState(''),
    [status, setStatus] = useState('');
  const result = useQuery({ queryKey: ['sensors'], queryFn: () => api.sensors() });
  const liveSensors = useLiveSensors(result.data ?? emptySensors);
  const rows = sensorRows(liveSensors, { zone, partId, status });
  const selected = liveSensors.find((s) => s.sensorId === params.get('sensor'));
  return (
    <QueryState loading={result.isPending} error={result.error}>
      <div className="page-heading">
        <div>
          <h1>Every sensor and human input</h1>
          <p className="sub">
            Stable positions, readings and trust states · Synthetic sensor register
          </p>
        </div>
        <button
          onClick={() =>
            exportCsv(
              'sensors',
              [
                'Sensor ID',
                'Owner',
                'Zone',
                'Part',
                'Metric',
                'Unit',
                'Value',
                'Human result',
                'Timestamp',
                'Calibration',
                'Drift',
                'Status',
                'Role',
                'Proxy / reference',
                'Local X',
                'Local Y',
                'Local Z',
                'Rules',
                'Reading source',
              ],
              rows.map((s) => [
                s.sensorId,
                s.ownerId,
                s.zone,
                s.partId,
                s.metric,
                s.unit,
                s.lastValue ?? '',
                s.lastText ?? '',
                s.lastAt,
                s.calibratedAt,
                s.drift,
                s.status,
                s.role,
                s.proxyFor,
                s.location.x,
                s.location.y,
                s.location.z,
                s.usedByRules.join(';'),
                liveSensors.find((input) => input.sensorId === s.sensorId)?.modelSource ??
                  'Seeded record',
              ]),
            )
          }
        >
          Export register
        </button>
      </div>
      <div className="summary-strip">
        <div>
          <small>Registered inputs</small>
          {result.data?.length ?? 0}
        </div>
        <div>
          <small>Suspect</small>
          {result.data?.filter((s) => s.status === 'suspect').length ?? 0}
        </div>
        <div>
          <small>Offline</small>
          {result.data?.filter((s) => s.status === 'offline').length ?? 0}
        </div>
      </div>
      {selected && (
        <section className="panel sensor-selected">
          <SensorInfo sensor={selected} />
          <Link className="button" to={partLink(selected.ownerId, selected.partId, selected.scope)}>
            Show position on{' '}
            {selected.scope === 'compost'
              ? 'compost bay'
              : selected.scope === 'site'
                ? 'Overview'
                : selected.ownerId}
          </Link>
        </section>
      )}
      <section className="panel">
        <div className="form-grid">
          <div className="field">
            <span>Zone</span>
            <SearchableSelect label="Zone" value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">All zones</option>
              {['A', 'B', 'C', 'D'].map((z) => (
                <option key={z}>{z}</option>
              ))}
            </SearchableSelect>
          </div>
          <div className="field">
            <span>Part</span>
            <SearchableSelect
              label="Part"
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
            >
              <option value="">All parts</option>
              {[...drainParts, ...bayParts].map((p) => (
                <option key={p.partId} value={p.partId}>
                  {p.name}
                </option>
              ))}
            </SearchableSelect>
          </div>
          <div className="field">
            <span>Trust status</span>
            <SearchableSelect
              label="Trust status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {['ok', 'suspect', 'offline'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SearchableSelect>
          </div>
        </div>
        <p className="small">
          {rows.length} inputs shown. Manual logs use a method-check date; photo inputs are human
          checklists.
        </p>
        <div className="table-wrap">
          <table className="sensor-table">
            <thead>
              <tr>
                {[
                  'Sensor / position',
                  'Reading / timestamp',
                  'Trust / calibration',
                  'Proxy or reference',
                  'Fault rules',
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.sensorId} data-sensor-row={s.sensorId}>
                  <td>
                    <Link to={partLink(s.ownerId, s.partId, s.scope)}>{s.sensorId}</Link>
                    <p className="small">{s.type}</p>
                    <p className="small">
                      Zone {s.zone} · {s.ownerId} · {partName(s.partId)}
                    </p>
                    <p className="small">
                      Position {s.location.x}, {s.location.y}, {s.location.z} m
                    </p>
                  </td>
                  <td>
                    {s.metric}
                    <p>
                      <strong>
                        <SensorValue sensor={s} />
                      </strong>
                    </p>
                    <p className="small">
                      {s.unit} · {dateTime(s.lastAt)}
                    </p>
                  </td>
                  <td>
                    <SensorTrust sensor={s} />
                    <p className="small">
                      Calibration / method check
                      <br />
                      {dateTime(s.calibratedAt)}
                    </p>
                  </td>
                  <td>
                    <strong>{s.role === 'proxy' ? 'Proxy' : 'Reference'}</strong>
                    <p className="small">{s.proxyFor}</p>
                  </td>
                  <td>
                    <div className="sensor-rule-links">
                      {s.usedByRules.map((rule) => (
                        <Link key={rule} to={`/faults?rule=${rule}#rule-${rule}`}>
                          {rule.replaceAll('_', ' ')}
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="empty">
            No inputs match these filters. Select All to restore the register.
          </p>
        )}
      </section>
    </QueryState>
  );
}
