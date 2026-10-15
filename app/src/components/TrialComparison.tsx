import {CheckCircle2, CircleDashed} from 'lucide-react';
import Term from './Term';
import {Link} from 'react-router-dom';
import type {Config,TrialDetail} from '../api/types';
import {armName,testMean,formatValue} from '../utils';
export default function TrialComparison({trials,config}:{trials:TrialDetail[];config:Config;}) {
 const scale=Math.max(30,...trials.flatMap(t=>[testMean(t.tests,'baseline')?.value??0,testMean(t.tests,'retest')?.value??0]));
 return <section className="trial-comparison" aria-label="Three trial arms compared side by side">{(['control','decompaction','compost'] as const).map(arm=>{
 const trial=trials.find(t=>t.arm===arm),before=trial&&testMean(trial.tests,'baseline'),after=trial&&testMean(trial.tests,'retest'),count=trial?.tests.filter(t=>t.phase==='retest'&&t.metric==='infiltration_mm_hr').length??0,minimum=config.minTests??config.minimumN,met=count>=minimum;
 return <article className="trial-arm" key={arm}><h2><span className="swatch" style={{background:`var(--arm-${arm==='decompaction'?'decompact':arm})`}}/>{armName[arm]}</h2><p className="small">{trial?.featureId} · {trial?.markedPoints??0} marked points · {count} re-tests</p>
 <div className="before-after" role="img" aria-label={`${armName[arm]}: before ${before?.value??'not recorded'}, latest ${after?.value??'not recorded'} mm/h`}>
 {([['Before',before?.value],['Latest',after?.value]] as const).map(([label,value])=><div key={label}><span>{label}</span><span className="bar-track">{value!==undefined&&<i style={{width:`${value/scale*100}%`,background:`var(--arm-${arm==='decompaction'?'decompact':arm})`}}/>}</span><strong>{formatValue(value,'mm/h')}</strong></div>)}<p className="small">Scale: 0–{formatValue(scale)} <Term text="mm/h"/></p></div>
 <div className="trial-progress"><p>{met?<CheckCircle2 size={16} aria-hidden="true"/>:<CircleDashed size={16} aria-hidden="true"/>}{count} of {minimum} re-tests needed · {met?'Minimum met':'More tests needed'}</p><progress max={minimum} value={Math.min(count,minimum)} aria-label={armName[arm]+' re-test progress'}/></div>
 <p className="small">A re-test is one marked-point observation; repeats are recorded with it.</p>{trial&&<Link className="text-link" to={'/feature/'+trial.featureId}>Inspect {trial.featureId}</Link>}</article>;
 })}</section>;
}
