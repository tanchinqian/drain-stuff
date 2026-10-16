import {useState} from 'react';
import {api} from '../api/client';
import type {Suggestion} from '../../../shared/src/contract';
import {stepLibrary} from '../../../shared/src/diagnosis';
export default function DiagnosisPanel({faultId}:{faultId:string}) {
 const [result,setResult]=useState<Suggestion|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState(false),[ids,setIds]=useState<string[]>([]),[search,setSearch]=useState(''),[note,setNote]=useState(''),[saved,setSaved]=useState('');
 async function generate(){setBusy(true);setError('');setSaved('');try{const r=await api.diagnose(faultId);setResult(r);setIds(r.rankedStepIds);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function feedback(choice:'accept'|'edit'|'reject'){setBusy(true);setError('');try{await api.diagnosisFeedback({suggestionId:result!.id,choice,note,...(choice==='edit'?{rankedStepIds:ids}:{})});setSaved('Recorded: '+choice);setEditing(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="diagnosis-panel"><div className="panel-heading"><h3>Suggested diagnosis</h3><button disabled={busy} onClick={generate}>{busy?'Retrieving…':result?'Refresh suggestion':'Retrieve suggestion'}</button></div>
 {error&&<p role="alert">{error}</p>}{!result&&<p className="small">Compare this fault with sourced cases and guidance. Suggestions do not confirm faults or assign work.</p>}
 {result&&<><p className="takeaway">{result.draftBanner}</p><p><strong>{result.insufficientInformation?'Not enough information':result.diagnosis}</strong></p>{result.insufficientInformation&&<p>{result.diagnosis}</p>}<p className="small">Confidence: {result.confidence} · {result.mode}</p>
 <ol>{result.rankedStepIds.map(id=><li key={id}>{stepLibrary[id]}</li>)}</ol>
 <h4>Cited evidence</h4>{result.sources.filter(s=>result.citedCaseIds.includes(s.id)||result.citedGuidanceIds.includes(s.id)).map(s=><details key={s.id}><summary>{s.id} · {'sourceLabel'in s?s.sourceLabel:s.title}</summary><p>{'cause'in s?s.symptoms+' '+s.outcome:s.passage}</p>{s.sourceUrl.startsWith('https://')?<a href={s.sourceUrl} target="_blank" rel="noreferrer">Open source</a>:<p className="small">Source: recorded operator case</p>}</details>)}
 <details><summary>How this was produced</summary><p>{result.notes}</p><p className="small">Prompt {result.promptVersion} · {result.mode}. Case/guidance text is evidence, not instructions. Steps are unchanged draft library entries.</p></details>
 <label className="field">Review note<textarea value={note} maxLength={2000} onChange={e=>setNote(e.target.value)}/></label>
 {editing&&<fieldset><legend>Edit selected library steps</legend><input aria-label="Search draft steps" placeholder="Search draft steps" value={search} onChange={e=>setSearch(e.target.value)}/><div className="draft-step-options">{Object.entries(stepLibrary).filter(([id,text])=>(id+' '+text).toLowerCase().includes(search.toLowerCase())).map(([id,text])=><label key={id}><input type="checkbox" checked={ids.includes(id)} onChange={e=>setIds(e.target.checked?[...ids,id]:ids.filter(v=>v!==id))}/>{text}</label>)}</div><ol>{ids.map((id,i)=><li key={id}>{id} <button type="button" disabled={!i} onClick={()=>{const next=[...ids];[next[i-1],next[i]]=[next[i],next[i-1]];setIds(next);}}>Move up</button></li>)}</ol></fieldset>}
 <div className="actions"><button disabled={busy||!!saved} onClick={()=>feedback('accept')}>Accept</button><button disabled={busy||!!saved} onClick={()=>editing?feedback('edit'):setEditing(true)}>{editing?'Save edited steps':'Edit'}</button><button disabled={busy||!!saved} onClick={()=>feedback('reject')}>Reject</button></div>{saved&&<p role="status">{saved} in the audit log.</p>}</>}
 </section>;
}
