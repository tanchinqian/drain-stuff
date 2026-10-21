import SearchableSelect from '../components/SearchableSelect';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { type Fault, type FaultRule } from '../api/types';
import { displayName, timeLabel, faultOrder } from '../utils';
import { useWrite } from '../hooks';
import DataTable from '../components/DataTable';
import Drawer, { DrawerFooter } from '../components/Drawer';
import AssetList from '../components/AssetList';
import WorkOrderPanel from '../components/WorkOrderPanel';
import EscalationPanel from '../components/EscalationPanel';
import DiagnosisPanel from '../components/DiagnosisPanel';
import RecordHistory from '../components/RecordHistory';
import Timestamp from '../components/Timestamp';
import Chip from '../components/Chip';
import { QueryState } from '../components/QueryState';
import { drainParts, partName, partLink } from '../api/modelCatalog';
export default function Faults() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'faults' | 'rules'>('faults');
  const [asset, setAsset] = useState(params.get('asset') ?? ''),
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
  const create = useWrite(
    () => api.reportFault({ ...entry, note, user }),
    'Saved report to the fault register',
  );
  const inputs = useQuery({queryKey:['fault-evidence-inputs'],queryFn:()=>api.sensors()});
  const active = selected
    ? (faults.data?.find((f) => f.id === selected.id) ?? selected)
    : (faults.data?.find((f) => f.id === params.get('fault')) ?? null);
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
      {asset && <EscalationPanel asset={asset} />}
      <div className="segments register-tabs" role="tablist" aria-label="Fault registers">
        {(['faults', 'rules'] as const).map((t) => (
          <button
            role="tab"
            id={'tab-' + t}
            aria-controls={'register-' + t}
            aria-selected={tab === t}
            key={t}
            onClick={() => setTab(t)}
          >
            {displayName(t)}
          </button>
        ))}
      </div>
      {params.get('rule') && <button onClick={() => setParams({})}>Show all faults</button>}
      <div className={'master-detail fault-workspace ' + (tab === 'rules' ? 'rules-only' : '')}>
        {tab === 'faults' && (
          <AssetList
            label="Fault assets"
            value={asset}
            onChange={setAsset}
            items={Array.from(new Set(faults.data?.map((f) => f.featureId) ?? [])).map((id) => ({
              id,
              detail:
                (faults.data?.filter((f) => f.featureId === id && f.status !== 'closed').length ??
                  0) + ' open',
            }))}
          />
        )}
        <div className="master-content stack">
          <section
            className="panel"
            id="register-faults"
            role="tabpanel"
            aria-labelledby="tab-faults"
            hidden={tab !== 'faults'}
          >
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
                { key: 'id', label: 'ID', width: '7%', value: (f) => f.id },
                { key: 'title', label: 'Title', width: '18%', value: (f) => displayName(f.type) },
                { key: 'asset', label: 'Asset', width: '6%', value: (f) => f.featureId },
                { key: 'part', label: 'Part', width: '16%', value: (f) => partName(f.partId) },
                {
                  key: 'severity',
                  width: '9%',
                  label: 'Severity',
                  value: (f) => f.severity,
                  render: (f) => (
                    <Chip value={f.severity === 3 ? 'High' : f.severity === 2 ? 'Medium' : 'Low'} />
                  ),
                },
                {
                  key: 'opened',
                  width: '16%',
                  label: 'Opened',
                  value: (f) => f.openedAt,
                  render: (f) => <Timestamp value={f.openedAt} />,
                },
                {
                  key: 'status',
                  width: '11%',
                  label: 'Status',
                  value: (f) => f.status,
                  render: (f) => (
                    <button onClick={() => setSelected(f)}>
                      {displayName(f.workOrder?.state ?? 'detected')}
                    </button>
                  ),
                },
                {
                  key: 'rule',
                  width: '17%',
                  label: 'Rule',
                  value: (f) =>
                    rules.data?.find((r) => r.id === f.ruleId)?.label ?? 'Manual report',
                  render: (f) => (
                    <button
                      className="text-link"
                      title={
                        (rules.data?.find((r) => r.id === f.ruleId)?.label ?? 'Manual report') +
                        ' · ' +
                        f.ruleId
                      }
                      disabled={f.ruleId === 'MANUAL'}
                      onClick={() => selectRule(f.ruleId)}
                    >
                      {rules.data?.find((r) => r.id === f.ruleId)?.label ?? 'Manual report'}
                    </button>
                  ),
                },
              ]}
            />
          </section>
          <section
            className="panel"
            id="register-rules"
            role="tabpanel"
            aria-labelledby="tab-rules"
            hidden={tab !== 'rules'}
          >
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
          key={active.id}
          status={<Chip value={active.workOrder?.state ?? 'detected'} tone={active.workOrder?.state==='closed'?'ok':'watch'}/>}
          subtitle={<><p className="small">{active.featureId} · {partName(active.partId)} · Zone {active.zone}</p><p className="small">{active.raisedBy==='manual'?'Operator inspection':'Recorded rule finding'} · {timeLabel(active.openedAt)}</p></>}
          onClose={() => {
            setSelected(null);
            const next = new URLSearchParams(params);
            next.delete('fault');
            setParams(next, {replace:true});
          }}
        >
          <section className="fault-summary"><h3>Summary</h3><p>{active.diagnosingInput}</p></section>
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
          <WorkOrderPanel key={active.id} fault={active} />
          <DiagnosisPanel key={'diagnosis-' + active.id} faultId={active.id} />
          <details className="fault-section"><summary>Evidence and inputs <span>{active.sensorIds.length} recorded inputs</span></summary>
            {!active.sensorIds.length ? <p>No linked input recorded; add an independent inspection note.</p> :
            <div className="table-scroll"><table className="evidence-table"><thead><tr><th>Input</th><th>Value</th><th>Trust</th><th>Time</th></tr></thead><tbody>
            {active.sensorIds.map(id => {const sensor=inputs.data?.find(s=>s.sensorId===id); return <tr key={id}>
              <td><Link to={'/sensors?sensor='+encodeURIComponent(id)}>{id}</Link></td><td>{sensor?.lastText ?? sensor?.lastValue ?? 'Not recorded'} {sensor?.unit}</td>
              <td>{displayName(active.sensorStatusesAtAlert[id] ?? 'Not recorded')}</td><td>{sensor?.lastAt ? timeLabel(sensor.lastAt) : 'Not recorded'}</td>
            </tr>;})}</tbody></table></div>}
            <p className="small">Trust is captured when the fault was raised. Values and time are the latest stored readings.</p>
          </details>
          <RecordHistory entries={active.history ?? []} title="Audit trail" />
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
          <form id="fault-report"
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
              <SearchableSelect
                label="Fault asset"
                value={entry.featureId}
                onChange={(e) => setEntry({ ...entry, featureId: e.target.value })}
              >
                {features.data?.map((f) => (
                  <option key={f.id}>{f.id}</option>
                ))}
              </SearchableSelect>
            </label>
            <label className="field">
              Part
              <SearchableSelect
                label="Fault part"
                value={entry.partId}
                onChange={(e) => setEntry({ ...entry, partId: e.target.value })}
              >
                {drainParts.map((p) => (
                  <option key={p.partId} value={p.partId}>
                    {p.name}
                  </option>
                ))}
              </SearchableSelect>
            </label>
            <label className="field">
              Problem
              <SearchableSelect
                label="Fault problem"
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
              </SearchableSelect>
            </label>
            <label className="field">
              Severity
              <SearchableSelect
                label="Fault severity"
                value={entry.severity}
                onChange={(e) =>
                  setEntry({ ...entry, severity: Number(e.target.value) as 1 | 2 | 3 })
                }
              >
                <option value="1">Low</option>
                <option value="2">Medium</option>
                <option value="3">High</option>
              </SearchableSelect>
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
            <DrawerFooter><button className="primary" form="fault-report" disabled={create.isPending}>Save fault report</button></DrawerFooter>
            {create.error && <p role="alert">{create.error.message}</p>}
          </form>
        </Drawer>
      )}
    </QueryState>
  );
}
