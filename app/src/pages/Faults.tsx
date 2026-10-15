import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { type Fault, type FaultRule } from '../api/types';
import { displayName, timeLabel, faultOrder } from '../utils';
import { useWrite } from '../hooks';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import Chip from '../components/Chip';
import { QueryState } from '../components/QueryState';
import { drainParts, partName, partLink } from '../api/modelCatalog';
export default function Faults() {
  const [params, setParams] = useSearchParams();
  const [asset, setAsset] = useState(''),
    [selected, setSelected] = useState<Fault | null>(null),
    [rule, setRule] = useState<FaultRule | null>(null),
    [report, setReport] = useState(false),
    [note, setNote] = useState(''),
    [user, setUser] = useState('Local operator');
  const [entry, setEntry] = useState({
    featureId: 'S1',
    partId: 'inlet',
    type: 'blockage' as Fault['type'],
    severity: 2 as 1 | 2 | 3,
  });
  const faults = useQuery({ queryKey: ['faults'], queryFn: () => api.faults() }),
    rules = useQuery({ queryKey: ['fault-rules'], queryFn: api.faultRules }),
    features = useQuery({ queryKey: ['features'], queryFn: api.features });
  const save = useWrite(
    (input: { id: string; status: Fault['status'] }) =>
      api.faultStatus(input.id, { status: input.status, note, user }),
    'Saved fault status to the fault register',
  );
  const create = useWrite(
    () => api.reportFault({ ...entry, note, user }),
    'Saved report to the fault register',
  );
  const active = selected ? (faults.data?.find((f) => f.id === selected.id) ?? selected) : null;
  const rows = (faults.data ?? [])
    .filter(
      (f) =>
        (!asset || f.featureId === asset) &&
        (!params.get('rule') || f.ruleId === params.get('rule')),
    )
    .sort(faultOrder);
  const selectRule = (id: string) => {
    const r = rules.data?.find((r) => r.id === id);
    if (r) setRule(r);
  };
  return (
    <QueryState loading={faults.isPending} error={faults.error}>
      <div className="page-heading">
        <h1>Faults</h1>
        <button
          onClick={() => {
            setReport(true);
            setNote('');
          }}
        >
          Report a fault
        </button>
      </div>
      <p>Faults appear when a rule fires on a reading or an operator reports a problem.</p>
      <div className="master-detail">
        <aside className="master-list" aria-label="Fault assets">
          <button aria-pressed={!asset} onClick={() => setAsset('')}>
            All assets
          </button>
          {Array.from(new Set(faults.data?.map((f) => f.featureId) ?? [])).map((id) => (
            <button key={id} aria-pressed={asset === id} onClick={() => setAsset(id)}>
              {id}
              <small>
                {faults.data?.filter((f) => f.featureId === id && f.status !== 'closed').length}{' '}
                open
              </small>
            </button>
          ))}
        </aside>
        <div className="master-content stack">
          <section className="panel">
            <DataTable
              id="faults"
              rows={rows}
              rowId={(f) => f.id}
              onSelect={setSelected}
              filters={[
                { key: 'zone', label: 'Zone', value: (f) => f.zone },
                { key: 'type', label: 'Fault class', value: (f) => displayName(f.type) },
                { key: 'status', label: 'Status', value: (f) => f.status },
              ]}
              columns={[
                { key: 'id', label: 'ID', value: (f) => f.id },
                { key: 'title', label: 'Title', value: (f) => displayName(f.type) },
                { key: 'asset', label: 'Asset', value: (f) => f.featureId },
                { key: 'part', label: 'Part', value: (f) => partName(f.partId) },
                {
                  key: 'severity',
                  label: 'Severity',
                  value: (f) => f.severity,
                  render: (f) => (
                    <Chip value={f.severity === 3 ? 'High' : f.severity === 2 ? 'Medium' : 'Low'} />
                  ),
                },
                {
                  key: 'opened',
                  label: 'Opened',
                  value: (f) => f.openedAt,
                  render: (f) => timeLabel(f.openedAt),
                },
                {
                  key: 'status',
                  label: 'Status',
                  value: (f) => f.status,
                  render: (f) => <Chip value={f.status} />,
                },
                {
                  key: 'rule',
                  label: 'Rule',
                  value: (f) =>
                    rules.data?.find((r) => r.id === f.ruleId)?.label ?? 'Manual report',
                  render: (f) => (
                    <button
                      title={f.ruleId}
                      disabled={f.ruleId === 'MANUAL'}
                      onClick={() => selectRule(f.ruleId)}
                    >
                      {rules.data?.find((r) => r.id === f.ruleId)?.label ?? 'Manual report'}
                    </button>
                  ),
                },
              ]}
              actions={(f) => (
                <label className="field">
                  Update status
                  <select
                    aria-label={'Status for ' + f.id}
                    value={f.status}
                    disabled={save.isPending}
                    onChange={(e) =>
                      save.mutate({ id: f.id, status: e.target.value as Fault['status'] })
                    }
                  >
                    {['open', 'inspected', 'closed'].map((v) => (
                      <option key={v} value={v}>
                        {displayName(v)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            />
          </section>
          <section className="panel">
            <h2>Fault rules and diagnosing inputs</h2>
            {params.get('rule') && <button onClick={() => setParams({})}>Show all faults</button>}
            <DataTable
              id="fault-rules"
              rows={rules.data ?? []}
              rowId={(r) => r.id}
              onSelect={setRule}
              filters={[{ key: 'scope', label: 'Applies to', value: (r) => r.scope }]}
              columns={[
                {
                  key: 'title',
                  label: 'Rule',
                  value: (r) => r.label,
                  render: (r) => <span title={r.id}>{r.label}</span>,
                },
                { key: 'trigger', label: 'Trigger', value: (r) => r.check },
                { key: 'input', label: 'Diagnosing inputs', value: (r) => r.diagnosingInput },
                { key: 'version', label: 'Version', value: (r) => r.version ?? '1.0.0' },
              ]}
            />
          </section>
        </div>
      </div>
      {active && (
        <Drawer
          title={active.id + ' · ' + displayName(active.type)}
          onClose={() => setSelected(null)}
        >
          <Chip value={active.status} />
          <p>
            {active.featureId} · {partName(active.partId)} · Zone {active.zone}
          </p>
          <p>{active.diagnosingInput}</p>
          <p>{timeLabel(active.openedAt)}</p>
          <Link
            className="button"
            to={partLink(
              active.featureId,
              active.partId,
              active.featureId.startsWith('B-') ? 'compost' : 'drainage',
            )}
          >
            Inspect this part
          </Link>
          <h3>Update status</h3>
          <label className="field">
            Who
            <input value={user} onChange={(e) => setUser(e.target.value)} />
          </label>
          <label className="field">
            Optional note
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="actions">
            {(['open', 'inspected', 'closed'] as const).map((status) => (
              <button
                disabled={active.status === status || save.isPending || !user.trim()}
                key={status}
                onClick={() => save.mutate({ id: active.id, status })}
              >
                {status === 'open'
                  ? 'Reopen'
                  : status === 'closed'
                    ? 'Close fault'
                    : 'Mark inspected'}
              </button>
            ))}
          </div>
          <h3>Audit trail</h3>
          <DataTable
            id="fault-history"
            rows={active.history ?? []}
            rowId={(r) => r.id}
            columns={[
              { key: 'action', label: 'Change', value: (r) => r.action },
              { key: 'user', label: 'Who', value: (r) => r.user },
              { key: 'time', label: 'When', value: (r) => timeLabel(r.t) },
              { key: 'note', label: 'Note', value: (r) => r.note ?? '' },
            ]}
          />
          <h3>Diagnosing inputs</h3>
          {active.sensorIds.map((id) => (
            <p key={id}>
              <Link to={'/sensors?sensor=' + encodeURIComponent(id)}>{id}</Link> ·{' '}
              {displayName(active.sensorStatusesAtAlert[id] ?? 'Not recorded')}
            </p>
          ))}
        </Drawer>
      )}
      {rule && (
        <Drawer title={rule.label} onClose={() => setRule(null)}>
          <p title={rule.id}>Rule version {rule.version}</p>
          <p>{rule.check}</p>
          <p>
            <strong>Inputs:</strong> {rule.diagnosingInput}
          </p>
          <p>Threshold settings: {rule.thresholdKeys?.join(', ')}</p>
          <ol>
            {(rule.steps ?? [rule.check]).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <h3>Faults raised by this rule</h3>
          <DataTable
            id="rule-faults"
            rows={(faults.data ?? []).filter((f) => f.ruleId === rule.id)}
            rowId={(f) => f.id}
            onSelect={(f) => {
              setRule(null);
              setSelected(f);
            }}
            columns={[
              { key: 'id', label: 'ID', value: (f) => f.id },
              { key: 'title', label: 'Title', value: (f) => displayName(f.type) },
              { key: 'asset', label: 'Asset', value: (f) => f.featureId },
              { key: 'status', label: 'Status', value: (f) => displayName(f.status) },
            ]}
          />
        </Drawer>
      )}
      {report && (
        <Drawer title="Report a fault" onClose={() => setReport(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(undefined, {
                onSuccess: () => {
                  setReport(false);
                  setNote('');
                },
              });
            }}
          >
            <label className="field">
              Asset
              <select
                value={entry.featureId}
                onChange={(e) => setEntry({ ...entry, featureId: e.target.value })}
              >
                {features.data?.map((f) => (
                  <option key={f.id}>{f.id}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Part
              <select
                value={entry.partId}
                onChange={(e) => setEntry({ ...entry, partId: e.target.value })}
              >
                {drainParts.map((p) => (
                  <option key={p.partId} value={p.partId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Problem
              <select
                value={entry.type}
                onChange={(e) => setEntry({ ...entry, type: e.target.value as Fault['type'] })}
              >
                {[
                  'blockage',
                  'sediment',
                  'standing_water',
                  'mulch_loss',
                  'scour',
                  'joint_leak',
                  'missing_cap',
                  'sparse_planting',
                ].map((v) => (
                  <option key={v} value={v}>
                    {displayName(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Severity
              <select
                value={entry.severity}
                onChange={(e) =>
                  setEntry({ ...entry, severity: Number(e.target.value) as 1 | 2 | 3 })
                }
              >
                <option value="1">Low</option>
                <option value="2">Medium</option>
                <option value="3">High</option>
              </select>
            </label>
            <label className="field">
              Description
              <textarea required value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="field">
              Reported by
              <input required value={user} onChange={(e) => setUser(e.target.value)} />
            </label>
            <p className="small">Saves to the fault register.</p>
            <button disabled={create.isPending}>Save fault report</button>
            {create.error && <p role="alert">{create.error.message}</p>}
          </form>
        </Drawer>
      )}
    </QueryState>
  );
}
