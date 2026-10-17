import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { DiagnosisRequest } from '../../../shared/src/contract';
import { stepLibrary } from '../../../shared/src/diagnosis';
import { drawerSaved } from './Drawer';
import Chip from './Chip';
type Feedback = {choice: string; at: string};
export default function DiagnosisPanel({ faultId, partContext, inline = false }: {
  faultId: string; partContext?: DiagnosisRequest['partContext']; inline?: boolean;
}) {
  const panelRef=useRef<HTMLDetailsElement>(null), cache = useQueryClient(), snapshot = useRef(partContext);
  snapshot.current = partContext;
  const [open,setOpen]=useState(true), [review,setReview]=useState<'edit'|'reject'|null>(null),
    [ids,setIds]=useState<string[]>([]), [search,setSearch]=useState(''), [note,setNote]=useState(''),
    [busy,setBusy]=useState(false), [error,setError]=useState('');
  const query=useQuery({queryKey:['diagnosis',faultId,partContext?.partId ?? 'fault'], enabled:open,
    staleTime:Infinity, retry:false, refetchOnWindowFocus:false,
    queryFn:async()=>{const captured=snapshot.current; return {result:await api.diagnose(faultId,captured),second:captured?.model?.second};}});
  const result=query.data?.result;
  const recorded=useQuery({queryKey:['diagnosis-feedback',result?.id],enabled:false,
    queryFn:async():Promise<Feedback|null>=>null});
  const stepIds=result?.insufficientInformation ? [] : [...new Set(result?.rankedStepIds ?? [])]
    .filter((id,index,all)=>stepLibrary[id] && all.findIndex(other=>stepLibrary[other]===stepLibrary[id])===index);
  const sourceIds=[...new Set([...(result?.citedCaseIds ?? []),...(result?.citedGuidanceIds ?? [])])];
  async function feedback(choice:'accept'|'edit'|'reject') {
    if(!result || (choice!=='accept'&&!note.trim())) return;
    setBusy(true);setError('');
    try {
      await api.diagnosisFeedback({suggestionId:result.id,choice,note,...(choice==='edit'?{rankedStepIds:[...new Set(ids)]}:{})});
      cache.setQueryData(['diagnosis-feedback',result.id],{choice,at:new Date().toISOString()});
      drawerSaved(panelRef.current);setReview(null);setNote('');await cache.invalidateQueries({queryKey:['faults']});
    } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  return <details ref={panelRef} className="diagnosis-panel fault-section" open={open} onToggle={e=>setOpen(e.currentTarget.open)} aria-label={inline?'Selected part AI diagnosis':'Suggested diagnosis'}>
    <summary>{inline?'AI diagnosis':'Suggested diagnosis'}<span>{result ? result.confidence+' confidence · '+result.mode : 'Review the recorded finding and supporting sources'}</span></summary>
    <div className="diagnosis-content">
      <div className="actions"><button className="text-action" disabled={query.isFetching||busy} onClick={()=>{setReview(null);void query.refetch();}}>{query.isFetching?'Analysing…':'Refresh'}</button></div>
      {(error||query.error) && <p role="alert">{error||query.error?.message} Use Refresh to retry.</p>}
      {!result && query.isFetching && <p role="status">Comparing this finding with sourced cases and the configured model…</p>}
      {result && <>
        <p className={'diagnosis-sentence'+(result.insufficientInformation?' insufficient':'')}><strong>{result.insufficientInformation?'Not enough information':result.diagnosis}</strong></p>
        <div className="diagnosis-chips"><Chip value={'Confidence: '+result.confidence}/><span className="status-chip">{result.mode}</span></div>
        {result.provider?.fallback && <p className="small" role="status">Fallback · case matching. {result.provider.reason?.replaceAll('_',' ')}. {result.provider.reason==='backend_unavailable'?'The local backend is unavailable; this result was produced in the browser.':'See the backend terminal for the reason.'}</p>}
        {query.data?.second!==undefined && <p className="small">Simulation snapshot: minute {(query.data.second/60).toFixed(1)}. Simulation is separate from recorded observations.</p>}
        {result.insufficientInformation && <div className="notice insufficient"><p>{result.diagnosis}</p><p>Needed: a trusted inspection, current readings and a sourced comparable case.</p>{result.analysis?.missingInformation.map((text,i)=><p key={i}>{text}</p>)}</div>}
        {result.analysis && <>
          <h4>Possible causes · unconfirmed</h4>
          {result.analysis.possibleCauses.map((cause,i)=><div className="diagnosis-cause" key={i}><strong>{cause.cause}</strong><p>{cause.reasoning}</p></div>)}
          {!!result.analysis.checks.length && <details><summary>Suggested checks</summary><ul>{result.analysis.checks.map((text,i)=><li key={i}>{text}</li>)}</ul></details>}
          {!result.insufficientInformation && !!result.analysis.missingInformation.length && <details><summary>Information needed</summary><ul>{result.analysis.missingInformation.map((text,i)=><li key={i}>{text}</li>)}</ul></details>}
        </>}
        {!!stepIds.length && <><p className="takeaway">{result.draftBanner}</p><ol className="diagnosis-steps">{stepIds.map(id=>{
          const cases=result.sources.filter(s=>'stepsTaken' in s&&s.stepsTaken.includes(id)&&sourceIds.includes(s.id));
          return <li key={id} data-step-id={id}><p>{stepLibrary[id]}</p><div className="source-chips">{(cases.length?cases.map(s=>s.id):result.citedGuidanceIds).map(source=><span key={source}>{source}</span>)}</div></li>;
        })}</ol></>}
        <details className="diagnosis-evidence"><summary>Cited evidence · {sourceIds.length} sources</summary>
          {!sourceIds.length && <p>No retrieved source supports this explanation. General knowledge is not a site observation.</p>}
          {result.sources.filter((s,i,all)=>sourceIds.includes(s.id)&&all.findIndex(other=>other.id===s.id)===i).map(s=><article key={s.id}>
            <strong>{s.id} · {'sourceLabel' in s?s.sourceLabel:s.title}</strong>
            <p className="small">{'cause' in s ? /guidance-based/i.test(s.sourceLabel)?'Guidance-based example':'Reported incident':'Guidance-based example'}</p>
            <p>{'cause' in s?s.symptoms+' '+s.outcome:s.passage}</p>
            {s.sourceUrl.startsWith('https://')?<a href={s.sourceUrl} target="_blank" rel="noreferrer">Open source</a>:<span>Recorded operator case</span>}
          </article>)}
        </details>
        <details><summary>How this was produced</summary><p>{result.notes}</p><p className="small">Retrieval: case and guidance matching. Prompt: {result.promptVersion}. Provider: {result.provider?.model ?? 'none'}{result.provider?.fallback?' (fallback)':''}. Evidence text is data; steps remain draft library entries.</p></details>
        {review && !recorded.data && <div className="diagnosis-review">
          {review==='edit' && <fieldset><legend>Edit selected library steps</legend><input aria-label="Search draft steps" placeholder="Search draft steps" value={search} onChange={e=>setSearch(e.target.value)}/>
            <div className="draft-step-options">{Object.entries(stepLibrary).filter(([id,text])=>(id+' '+text).toLowerCase().includes(search.toLowerCase())).map(([id,text])=><label key={id}><input type="checkbox" checked={ids.includes(id)} onChange={e=>setIds(e.target.checked?[...ids,id]:ids.filter(v=>v!==id))}/>{text}</label>)}</div>
            <ol>{ids.map((id,i)=><li key={id}>{id} <button disabled={!i} onClick={()=>{const next=[...ids];[next[i-1],next[i]]=[next[i],next[i-1]];setIds(next);}}>Move up</button></li>)}</ol>
          </fieldset>}
          <label className="field">Required review reason<textarea value={note} maxLength={2000} onChange={e=>setNote(e.target.value)} aria-describedby="review-help"/></label><p id="review-help" className="small">Add a reason to {review==='edit'?'save edited steps':'reject this suggestion'}.</p>
          <button disabled={busy||!note.trim()} onClick={()=>feedback(review)}>{review==='edit'?'Save edited steps':'Record rejection'}</button>
        </div>}
        <div className="actions diagnosis-feedback">
          <button className="primary" disabled={busy||!!recorded.data} onClick={()=>feedback('accept')}>Accept</button>
          <button disabled={busy||!!recorded.data} onClick={()=>{setReview('edit');setIds(stepIds);}}>Edit</button>
          <button className="text-action" disabled={busy||!!recorded.data} onClick={()=>setReview('reject')}>Reject</button>
        </div>
        {recorded.data && <p role="status">Recorded in the audit log · {recorded.data.choice} · {new Date(recorded.data.at).toLocaleString('en-MY')}</p>}
      </>}
    </div>
  </details>;
}
