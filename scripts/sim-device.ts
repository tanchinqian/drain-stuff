import {loadEnvFile} from 'node:process';
import {randomBytes} from 'node:crypto';
import {encodeUplink} from '../shared/src/iot';
loadEnvFile('.env.local');
const base=process.env.SIM_API_BASE??'http://127.0.0.1:8080/api/v1';
if(!process.env.LORAWAN_SIM_SECRET)throw new Error('Start npm run dev:all first to create the simulator integration secret');
const id=randomBytes(8).toString('hex'),headers={Authorization:'Bearer '+process.env.OPERATOR_TOKEN,'X-Operator-Name':'Device simulator','Content-Type':'application/json'};
async function post(path:string,body:unknown,custom=headers){const r=await fetch(base+path,{method:'POST',headers:custom,body:JSON.stringify(body)});const data=await r.json() as any;if(!r.ok)throw new Error(data.error?.message??String(r.status));return data;}
await post('/devices',{id,assetId:'R1',part:'inlet',mountingHeightM:1,overflowLevelM:.45});
// Backdated event times model normal/event intervals; wall-clock delivery is accelerated.
const samples=[{d:900,f:0,b:3300},{d:850,f:0,b:3290},{d:790,f:0,b:3280},{d:700,f:0,b:3270},{d:550,f:1,b:3260},{d:550,f:1,b:3250},{d:550,f:1,b:3240},{d:550,f:3,b:3230},{d:100,f:4,b:3220},{d:600,f:8,b:2900}];
const start=Date.now()-samples.length*120000;
for(let i=0;i<samples.length;i++){
 const s=samples[i],bytes=encodeUplink({flags:s.f,offsetMinutes:i*2,distanceMm:s.d,temperatureC:29,batteryMv:s.b,counter:i+1});
 const r=await post('/ingest/lorawan',{end_device_ids:{dev_eui:id},received_at:new Date(start+i*120000).toISOString(),uplink_message:{frm_payload:Buffer.from(bytes).toString('base64'),f_cnt:i+1}}, {'Content-Type':'application/json','X-Ingest-Key':process.env.LORAWAN_SIM_SECRET});
 console.log(`Reading ${i+1}: depth ${r.depthM.toFixed(3)} m, ${r.status}${r.reasons.length?' ('+r.reasons.join(', ')+')':''}`);
}
console.log('Device '+id+' registered on R1. Database source: simulated. No fault was confirmed.');
