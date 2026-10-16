import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useBoard } from '../triage';
export default function EscalationPanel({asset}:{asset:string}) {
  const jobId=useBoard(s=>s.jobId), cache=useQueryClient();
  const [recipient,setRecipient]=useState(''),[note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const saved=useQuery({queryKey:['escalations'],queryFn:api.escalations});
  const job=useQuery({queryKey:['storm-job',jobId],enabled:!!jobId,queryFn:()=>api.stormResult(jobId!)});
  const row=job.data?.result?.rows.find(r=>r.asset===asset);
  if(!row?.capacityLimited && !saved.data?.some(e=>e.asset===asset)) return null;
  async function perform(fn:()=>Promise<unknown>){setBusy(true);setError('');try{await fn();setNote('');await cache.invalidateQueries();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="panel"><h2>Escalate {asset} to owner</h2><p>Clearance does not remove overflow in the saved scenario. Record owner review with the three results attached.</p><p className="small">This records the hand-off; contact the recipient through your normal channel.</p>
    <label className="field">Owner / recipient<input value={recipient} maxLength={80} onChange={e=>setRecipient(e.target.value)}/></label><label className="field">Evidence and required note<textarea maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label>
    <button disabled={busy||!row?.capacityLimited||!recipient.trim()||!note.trim()} onClick={()=>perform(()=>api.escalate({stormRunId:jobId!,asset,recipient,note}))}>Record escalation</button>
    {error&&<p role="alert">{error}</p>}
    {saved.data?.filter(e=>e.asset===asset).map(e=><article className="triage-row" key={e.id}><h3>{e.recipient} · {e.status}</h3><p>{e.note}</p><p className="small">{e.actor} · {new Date(e.at).toLocaleString('en-MY')} · As installed {e.evidence.asInstalled.summary.overflowM3.toFixed(3)}, If cleared {e.evidence.ifCleared.summary.overflowM3.toFixed(3)}, Capacity limit {e.evidence.capacityLimit.summary.overflowM3.toFixed(3)} m³. Relative ranking, not a prediction.</p><div className="actions">{e.status!=='resolved'&&<>{e.status!=='acknowledged'&&<button disabled={busy||!note.trim()} onClick={()=>perform(()=>api.escalationStatus(e.id,'acknowledged',note))}>Record acknowledgement</button>}<button disabled={busy||!note.trim()} onClick={()=>perform(()=>api.escalationStatus(e.id,'resolved',note))}>Record resolution</button></>}</div><ul>{e.history.map((h,i)=><li key={i}>{h.status} · {h.actor} · {h.note}</li>)}</ul></article>)}
  </section>;
}
