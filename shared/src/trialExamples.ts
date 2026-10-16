import type {Database} from './api/mock/seed';
// Retain old illustrative values in an archive, without presenting them as measured trial outcomes.
export function archiveTrialExamples(db:Database) {
 for(const trial of db.trials) {
  const entered=(point:string,value:number,at:string)=>trial.history?.some(h=>h.action==='Test saved'&&h.note===point+' / '+value&&Math.abs(Date.parse(h.t)-Date.parse(at))<60000);
  const examples=trial.tests.filter(t=>t.origin==='seed'||(t.origin===undefined&&t.synthetic&&!entered(t.pointId,t.value,t.t)));
  if(examples.length){(db.exampleTrialArchive??={})[trial.featureId]=[...(db.exampleTrialArchive?.[trial.featureId]??[]),...examples];trial.tests=trial.tests.filter(t=>!examples.includes(t));}
  trial.baselineDone=Array.from({length:trial.markedPoints},(_,i)=>trial.tests.some(t=>t.phase==='baseline'&&t.metric==='infiltration_mm_hr'&&t.pointId===trial.featureId+'-P'+(i+1))).every(Boolean);
  trial.n=trial.tests.filter(t=>t.phase==='baseline').reduce((s,t)=>s+t.n,0);
  db.readings[trial.featureId]=(db.readings[trial.featureId]??[]).filter(r=>r.metric!=='infiltration_mm_hr'||!r.synthetic||r.source||trial.history?.some(h=>h.action==='Test saved'&&Math.abs(Date.parse(h.t)-Date.parse(r.t))<60000));
 }
}
