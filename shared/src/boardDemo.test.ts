import {expect,test} from 'vitest';
import {createDataStore} from './api/store';
import {generateMock} from './api/mock/seed';
import {runStorm} from './physics/triage';
import {stormInput} from './contract';
test('Heavy demo derives a fixable S1, capacity-limited S2 and clear S3',()=>{
  const data=createDataStore().snapshot();
  const result=runStorm(stormInput.parse({preset:'heavy',assets:['S1','S2','S3'],options:{robustness:false,recoveryMinutes:360}}),data.faults,data.trials);
  const s1=result.rows.find(r=>r.asset==='S1')!,s2=result.rows.find(r=>r.asset==='S2')!,s3=result.rows.find(r=>r.asset==='S3')!;
  expect(s1.faultIds).toContain('F-001');expect(s1.asInstalled.summary.overflowM3).toBeGreaterThan(s1.ifCleared.summary.overflowM3);
  expect(s2.capacityLimited).toBe(true);expect(s2.asInstalled.summary.overflowM3).toBe(s2.ifCleared.summary.overflowM3);
  expect(s3.asInstalled.summary.overflowM3).toBe(0);
});
test('only the untouched older demo fault is upgraded',()=>{
  const initial=generateMock();const fault=initial.faults.find(f=>f.id==='F-001')!;
  fault.raisedBy='rule';fault.ruleId='RULE-INLET-DEBRIS-001';
  fault.workOrder={state:'detected'};expect(createDataStore(initial).snapshot().faults.find(f=>f.id==='F-001')!.workOrder?.state).toBe('confirmed');
  fault.history=[{id:'user-reopen',t:new Date().toISOString(),user:'Operator',action:'reopen',note:'New observation'}];
  expect(createDataStore(initial).snapshot().faults.find(f=>f.id==='F-001')!.workOrder?.state).toBe('detected');
  fault.history=[];fault.raisedBy='manual';
  expect(createDataStore(initial).snapshot().faults.find(f=>f.id==='F-001')!.workOrder?.state).toBe('detected');
});
