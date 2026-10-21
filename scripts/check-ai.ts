import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import assert from 'node:assert/strict';
import {createDiagnosisService,outputSchema} from '../server/src/diagnosis';
import {serverEnv} from '../server/src/env';
import {createDataStore} from '../shared/src/api/store';
import {buildParts} from '../shared/src/api/parts';
import {referenceCases,referenceGuidance} from '../shared/src/caseLibrary';
import {stepLibrary} from '../shared/src/diagnosis';
import type {Suggestion} from '../shared/src/contract';
if(existsSync('server/.env')) loadEnvFile('server/.env');
if(existsSync('.env.local')) loadEnvFile('.env.local');
const selfTest=process.argv.includes('--self-test'), env=serverEnv.parse(process.env);
const config=selfTest ? {provider:'openai-compatible' as const,key:'self-test-only',model:'mock-provider'} : {provider:env.LLM_PROVIDER,key:env.LLM_API_KEY,model:env.LLM_MODEL,baseUrl:env.LLM_BASE_URL};
const mock:typeof fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({diagnosis:'Record an independent inspection before deciding the cause.',confidence:'low',rankedStepIds:[],citedCaseIds:[],citedGuidanceIds:[],insufficientInformation:true,notes:'Self-test fixture only.',analysis:{possibleCauses:[],checks:[],missingInformation:['Independent inspection']}})}}]}));
const service=createDiagnosisService(config,selfTest?mock:fetch),data=createDataStore().snapshot();
function report(result:Suggestion,latencyMs:number) {
  const picked=Object.fromEntries(Object.keys(outputSchema.shape).filter(k=>k in result).map(k=>[k,result[k as keyof Suggestion]]));
  const knownSources=new Set([...referenceCases,...referenceGuidance].map(s=>s.id));
  const validated=!result.provider?.fallback&&outputSchema.safeParse(picked).success&&result.rankedStepIds.every(id=>!!stepLibrary[id])&&[...result.citedCaseIds,...result.citedGuidanceIds].every(id=>knownSources.has(id));
  return {faultId:result.faultId,mode:result.mode,confidence:result.confidence,validated:validated?'yes':'no',stepIds:result.rankedStepIds,citationIds:[...result.citedCaseIds,...result.citedGuidanceIds],latencyMs:Math.round(latencyMs),fallbackReason:result.provider?.reason??null};
}
if(selfTest) console.log('SELF TEST: mocked provider only; no live verification.');
let failed=false;
for(const id of ['F-001','F-002','F-003']) {
  const fault=data.faults.find(f=>f.id===id)!,part=buildParts(fault.featureId,data.sensors,data.faults).find(p=>p.partId===fault.partId)!;
  const start=performance.now();
  try {
    const result=await service.diagnose(fault,data.features.find(f=>f.id===fault.featureId)?.kind??'inlet',referenceCases,referenceGuidance,data.sensors,{ownerId:fault.featureId,part:{name:part.name,purpose:part.purpose,typicalFailure:part.typicalFailure,installed:part.installed}});
    const row=report(result,performance.now()-start);console.log(JSON.stringify(row));
    if(selfTest) {assert.equal(row.validated,'yes');assert.equal(report({...result,provider:{model:null,fallback:true,reason:'fixture'}},0).validated,'no');}
    if(row.validated!=='yes'||row.fallbackReason) failed=true;
  } catch {
    console.error(JSON.stringify({faultId:id,mode:'unavailable',confidence:'unavailable',validated:'no',stepIds:[],citationIds:[],latencyMs:Math.round(performance.now()-start),fallbackReason:'check_failed'}));failed=true;
  }
}
if(failed) console.error('AI check failed: inspect fallbackReason and any validationDetails above. invalid_provider_output means the response was rejected, not that the API key is missing. No credential is printed.');
process.exitCode=failed?1:0;
