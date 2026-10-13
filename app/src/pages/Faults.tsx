import SearchableSelect from '../components/SearchableSelect';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { dateTime, exportCsv } from '../utils';
import { QueryState } from '../components/QueryState';
import Status from '../components/Status';
import { partLink } from '../api/modelCatalog';
export default function Faults() {
  const [params] = useSearchParams();
  const rules = useQuery({ queryKey: ['fault-rules'], queryFn: api.faultRules });
  const sensors = useQuery({ queryKey: ['sensors'], queryFn: () => api.sensors() });
  const [zone, setZone] = useState('all'),
    [type, setType] = useState('all'),
    [status, setStatus] = useState('all');
  const query = useQuery({ queryKey: ['faults'], queryFn: api.faults });
  const rows =
    query.data?.filter(
      (f) =>
        (!params.get('rule') || f.ruleId === params.get('rule')) &&
        (zone === 'all' || f.zone === zone) &&
        (type === 'all' || f.type === type) &&
        (status === 'all' || f.status === status),
    ) || [];
  return (
    <QueryState loading={query.isPending} error={query.error}>
      <div className="page-heading">
        <div>
          <h1>Faults and recorded checks</h1>
          <p className="sub">Synthetic fault log · Open a row to inspect its part</p>
        </div>
        <button
          onClick={() =>
            exportCsv(
              'faults',
              ['ID', 'Feature', 'Part', 'Type', 'Severity', 'Opened', 'Status'],
              rows.map((f) => [
                f.id,
                f.featureId,
                f.partId,
                f.type,
                f.severity,
                f.openedAt,
                f.status,
              ]),
            )
          }
        >
          Export log
        </button>
      </div>
      <section className="panel">
        <div className="form-grid" style={{ marginBottom: 18 }}>
          <div className="field">
            <span>Zone</span>
            <SearchableSelect label="Zone" value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="all">All zones</option>
              {['A', 'B', 'C', 'D'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </SearchableSelect>
          </div>
          <div className="field">
            <span>Fault type</span>
            <SearchableSelect
              label="Fault type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All types</option>
              {[...new Set(query.data?.map((f) => f.type) ?? [])].map((v) => (
                <option key={v} value={v}>
                  {v.replaceAll('_', ' ')}
                </option>
              ))}
            </SearchableSelect>
          </div>
          <div className="field">
            <span>Recorded status</span>
            <SearchableSelect
              label="Recorded status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              {['open', 'inspected', 'closed'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </SearchableSelect>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  'ID',
                  'Feature / house',
                  'Part',
                  'Type / diagnosing inputs',
                  'Severity',
                  'Opened',
                  'Status',
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link
                      to={partLink(
                        f.featureId,
                        f.partId,
                        sensors.data?.find((s) => s.ownerId === f.featureId)?.scope ?? 'drainage',
                      )}
                    >
                      {f.id}
                    </Link>
                  </td>
                  <td>{f.featureId}</td>
                  <td>{f.partId}</td>
                  <td>
                    <Status
                      status={
                        f.type === 'sensor_offline' || f.type === 'sensor_suspect'
                          ? 'offline'
                          : f.type === 'standing_water'
                            ? 'watch'
                            : 'fault'
                      }
                    />{' '}
                    {f.type.replaceAll('_', ' ')}
                    <p className="small">{f.diagnosingInput}</p>
                    <div className="sensor-rule-links">
                      {f.sensorIds.map((id) => (
                        <Link key={id} to={'/sensors?sensor=' + encodeURIComponent(id)}>
                          {id} - {f.sensorStatusesAtAlert[id] ?? 'unrecorded'} at alert
                        </Link>
                      ))}
                    </div>
                    {Object.values(f.sensorStatusesAtAlert).includes('suspect') && (
                      <p className="error">This alert may be a sensor fault.</p>
                    )}
                  </td>
                  <td>{f.severity} / 3</td>
                  <td>{dateTime(f.openedAt)}</td>
                  <td>{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="empty">No records match these filters.</p>}
      </section>
      <section className="panel fault-rules">
        <h2>Fault rules and diagnosing inputs</h2>
        <p className="sub">
          Inspection prompts from reference guidance; confirm the local procedure.{' '}
          <Link to="/faults">Show all fault records</Link>
        </p>
        {rules.data?.map((r) => (
          <article key={r.id} id={'rule-' + r.id}>
            <h3>{r.label}</h3>
            <p>{r.check}</p>
            <p className="small">
              <strong>Diagnosing input:</strong> {r.diagnosingInput}
            </p>
          </article>
        ))}
      </section>
    </QueryState>
  );
}
