import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useBoard } from '../triage';
import { assets, stormPresets, type TriageRow } from '../../../shared/src/contract';
import SearchableSelect from '../components/SearchableSelect';
import PlanMap from '../components/PlanMap';
import NeighbourhoodScene from '../three/NeighbourhoodScene';
import { QueryState } from '../components/QueryState';
import { useSelection } from '../state';
const label = 'Relative ranking, not a prediction';
export default function StormBoard() {
  const { jobId, setJob, selected, select } = useBoard();
  const [preset, setPreset] = useState('heavy'), [peak, setPeak] = useState(63),
    [duration, setDuration] = useState(45), [preview, setPreview] = useState(false),
    [robustness, setRobustness] = useState(true), [view, setView] = useState('3d'),
    [pending, setPending] = useState(false), [error, setError] = useState(''),
    [override, setOverride] = useState<TriageRow | null>(null),
    [position, setPosition] = useState(1), [reason, setReason] = useState('');
  const navigate = useNavigate(), cache = useQueryClient();
  const data = useQuery({ queryKey: ['board-assets'], queryFn: async () => {
    const [features, houses, zones, sensors] = await Promise.all([api.features(), api.houses(), api.zones(), api.sensors()]);
    return { features: features.filter(f => assets.includes(f.id as typeof assets[number])), houses, zones, sensors };
  }});
  const faults = useQuery({ queryKey: ['board-faults'], queryFn: () => api.faults() });
  const job = useQuery({ queryKey: ['storm-job', jobId], enabled: !!jobId,
    queryFn: () => api.stormResult(jobId!),
    refetchInterval: q => ['queued', 'running'].includes(q.state.data?.status ?? '') ? 1000 : false,
  });
  const triage = useQuery({ queryKey: ['triage', jobId, job.data?.status],
    enabled: job.data?.status === 'completed', queryFn: () => api.triage(jobId!),
  });
  const warnings = useQuery({ queryKey: ['weather-warning'], queryFn: api.warnings, staleTime: 300000, retry: false });
  const rows = triage.data?.rows ?? [];
  const ranks = Object.fromEntries(rows.map(r => [r.asset, r.rank]));
  const choose = (id: string) => { select(id); useSelection.getState().selectHouse(null); };
  async function run() {
    setPending(true); setError('');
    try {
      const next = await api.stormRun({
        ...(preset === 'custom' ? { custom: { peakMmHr: peak, durationMinutes: duration } } : { preset: preset as keyof typeof stormPresets }),
        assets: [...assets], options: { robustness, previewUnconfirmed: preview, recoveryMinutes: 360 },
      });
      setJob(next.id); await cache.invalidateQueries({ queryKey: ['triage'] });
    } catch(e) { setError((e as Error).message); } finally { setPending(false); }
  }
  const working = pending || ['queued', 'running'].includes(job.data?.status ?? '');
  return <>
    <div className="page-heading"><div><h1>Overview</h1><p className="sub">Storm triage · Bandar Bukit Raja Phase 1</p></div><Link className="button" to="/observations">Observation history</Link></div>
    <section className="panel storm-inputs" aria-labelledby="storm-heading">
      <div><h2 id="storm-heading">Set the storm to compare</h2><p>Entered scenarios help prioritise upkeep before a storm. These rainfall values are not a forecast.</p></div>
      {warnings.data?.available && !!warnings.data.warnings?.length && <details><summary>Official weather warnings available</summary><p>Warnings can guide your scenario choice; they do not supply numeric rainfall.</p><pre className="warning-data">{JSON.stringify(warnings.data.warnings, null, 2)}</pre><button onClick={() => setPreset('heavy')}>Use Heavy scenario</button></details>}
      <div className="storm-form">
        <label className="field">Rainfall scenario<SearchableSelect label="Rainfall scenario" value={preset} onChange={e => setPreset(e.target.value)}>{Object.entries(stormPresets).map(([id, p]) => <option key={id} value={id}>{id[0].toUpperCase()+id.slice(1)} · {p.peakMmHr} mm/h × {p.durationMinutes} min</option>)}<option value="custom">Custom rainfall</option></SearchableSelect></label>
        {preset === 'custom' && <><label className="field">Peak rainfall (mm/h)<input type="number" min="0" max="300" value={peak} onChange={e => setPeak(Number(e.target.value))}/></label><label className="field">Rain duration (minutes)<input type="number" min="1" max="180" step="1" value={duration} onChange={e => setDuration(Number(e.target.value))}/></label></>}
        <button className="primary" disabled={working} onClick={run}>{working ? 'Calculating…' : 'Run storm'}</button>
      </div>
      <div className="actions"><label><input type="checkbox" checked={preview} onChange={e => setPreview(e.target.checked)}/> Preview unconfirmed faults</label><label><input type="checkbox" checked={robustness} onChange={e => setRobustness(e.target.checked)}/> Check ranking under ±25%</label></div>
      {(error || job.error || triage.error || job.data?.error) && <p role="alert">{error || job.error?.message || triage.error?.message || job.data?.error}</p>}
      <p role="status">{working ? 'Running each asset in three states. Results appear when all calculations finish.' : rows.length ? `${rows.length} assets compared. ${triage.data?.robustness.evaluated ? triage.data.robustness.stable ? 'Ranking stable under ±25%.' : 'Order changes under ±25%.' : 'Sensitivity check not run.'}` : 'Choose a scenario and run the storm to see the ranking.'}</p>
      {job.data && <p className="small">Saved run: {job.data.input.custom ? `${job.data.input.custom.peakMmHr} mm/h × ${job.data.input.custom.durationMinutes} min` : `${job.data.input.preset} preset`} · {job.data.input.options.previewUnconfirmed ? 'Unconfirmed faults included for preview' : 'Confirmed faults only'} · {label}</p>}
    </section>
    <QueryState loading={data.isPending} error={data.error}>
      <div className="triage-layout">
        <section className="panel triage-register"><h2>Upkeep priority</h2><p className="sub">{label}. Capacity-limited assets need owner review.</p>
          {!rows.length && <p className="empty-note">Results will compare As installed, If cleared and Capacity limit for S1, S2, S3, I1 and the typical roadside inlet R1.</p>}
          <div className="triage-rows">{rows.map(row => {
            const related = faults.data?.filter(f => f.featureId === row.asset && f.status !== 'closed') ?? [];
            const max = Math.max(0.001, ...[row.asInstalled, row.ifCleared, row.capacityLimit].map(m => m.summary.overflowM3));
            return <article className={'triage-row'+(selected === row.asset ? ' selected' : '')} key={row.asset}>
              <div className="panel-heading"><button className="triage-asset" aria-pressed={selected === row.asset} onClick={() => choose(row.asset)}><span className="rank-number">{row.rank}</span><strong>{row.asset}</strong> · {data.data?.features.find(f => f.id === row.asset)?.name}</button><button onClick={() => { setOverride(row); setPosition(row.rank); setReason(''); }}>Change priority</button></div>
              <p className={row.capacityLimited ? 'capacity-note' : 'small'}>{row.capacityLimited ? 'Capacity-limited: escalate to owner' : row.asInstalled.summary.overflowM3 > 1e-8 ? 'Upkeep opportunity — compare clearing' : 'No overflow in this scenario'}</p>
              <div className="mode-comparison" aria-label={row.asset+' overflow comparison'}>{[['As installed', row.asInstalled], ['If cleared', row.ifCleared], ['Capacity limit', row.capacityLimit]].map(([name, raw]) => { const m = raw as TriageRow['asInstalled']; return <div className="mode-line" key={String(name)}><span>{String(name)}</span><span className="mode-track"><span style={{ width: `${m.summary.overflowM3/max*100}%` }}/></span><strong>{m.summary.overflowM3.toFixed(3)} m³</strong></div>; })}</div>
              <p className="small">Peak ponding {(row.asInstalled.summary.peakPondingM*1000).toFixed(0)} mm · Above limit {row.asInstalled.summary.hoursAboveLimit.toFixed(2)} h · {label}</p>
              <div className="fault-chips">{related.length ? related.map(f => <Link className="button" key={f.id} to={'/faults?fault='+f.id}>{f.id} · {f.workOrder?.state ?? 'detected'}{f.workOrder?.assignee ? ' · '+f.workOrder.assignee : ''}{(f.workOrder?.state ?? 'detected') === 'detected' ? ' · Unconfirmed' : ''}</Link>) : <span>No open faults</span>}</div>
              <div className="actions"><button onClick={() => { choose(row.asset); navigate(`/feature/${row.asset}?stormRunId=${jobId}&mode=installed`); }}>Replay in 3D</button><Link className="button" to={row.capacityLimited ? '/faults?asset='+row.asset+'&escalate=1' : '/faults?asset='+row.asset}>{row.capacityLimited ? 'Escalate to owner' : 'Review work orders'}</Link></div>
            </article>;
          })}</div>
          {triage.data?.robustness.evaluated && <details><summary>Sensitivity orders</summary><p className="small">{label}</p><ul>{triage.data.robustness.orders.map(o => <li key={o.parameter+o.multiplier}>{o.parameter === 'ks' ? 'Conductivity' : o.parameter === 'peak' ? 'Rainfall peak' : 'Outlet capacity'} × {o.multiplier}: {o.assets.join(' → ')}</li>)}</ul></details>}
        </section>
        <section className="panel triage-map"><div className="panel-heading"><div><h2>Asset locations</h2><p className="small">Illustrative asset placement on mapped housing. Typical designs, not surveyed.</p></div><div className="segments">{['3d','plan'].map(v => <button aria-pressed={view===v} key={v} onClick={() => setView(v)}>{v==='3d'?'3D':'Plan'}</button>)}</div></div>
          {data.data && (view === 'plan' ? <PlanMap {...data.data} rain={[]} layer="water" showSensors={false} cloudOpacity={0} ranks={ranks} selectedAsset={selected} onSelectAsset={choose}/> : <NeighbourhoodScene {...data.data} rain={[]} layer="water" showSensors={false} cloudOpacity={0} reset={0} ranks={ranks} selectedAsset={selected} onSelectAsset={choose}/>)}
          <p className="small">Numbered outlines match the priority list · {label}</p><Link className="button" to={'/feature/'+selected+(jobId?'?stormRunId='+jobId:'')}>Inspect {selected}</Link>
        </section>
      </div>
    </QueryState>
    {override && <section className="panel" aria-labelledby="override-heading"><h2 id="override-heading">Override priority for {override.asset}</h2><label className="field">Position<SearchableSelect label="Priority position" value={position} onChange={e => setPosition(Number(e.target.value))}>{rows.map((_,i) => <option key={i} value={i+1}>{i+1}</option>)}</SearchableSelect></label><label className="field">Required reason<textarea value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)}/></label><div className="actions"><button disabled={pending || !reason.trim()} onClick={async () => { setPending(true); try { await api.triageOverride({stormRunId:jobId!,asset:override.asset,position,reason}); await cache.invalidateQueries({queryKey:['triage']}); setOverride(null); } catch(e) {setError((e as Error).message);} finally {setPending(false);} }}>Save logged override</button><button onClick={()=>setOverride(null)}>Cancel</button></div></section>}
  </>;
}
