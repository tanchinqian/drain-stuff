import {beforeEach,afterEach,test,expect} from 'vitest';
import {Repository} from './db';
import {createApi} from './api';
import {encodeUplink} from '../../shared/src/iot';
const token='test-operator-token-for-iot-32-chars',secret='test-simulator-integration-secret-32';
let repo:Repository,api:ReturnType<typeof createApi>;
beforeEach(()=>{repo=new Repository(':memory:');api=createApi(repo,{token,simSecret:secret,deviceSecret:'physical-network-secret-at-least-32',seed:true});});
afterEach(()=>api.close());
async function post(path:string,body:unknown,headers:Record<string,string>={Authorization:'Bearer '+token,'X-Operator-Name':'Test'}) {const r=await api.app.request('/api/v1'+path,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};}
const input={id:'0102030405060708',assetId:'R1',part:'inlet',mountingHeightM:1,overflowLevelM:.45};
test('non-object uplinks are rejected without a server error',async()=>{
 for(const body of [null,[],42,'uplink']) expect((await post('/ingest/lorawan',body,{'X-Ingest-Key':secret})).status).toBe(422);
});
function wire(counter=1,distanceMm=800,at=new Date(Date.now()-300000).toISOString()) {return {deviceInfo:{devEui:input.id},time:at,data:Buffer.from(encodeUplink({flags:0,counter,distanceMm,offsetMinutes:counter*2,temperatureC:29,batteryMv:3300})).toString('base64')};}
test('integration auth, commissioning, source, duplicate and old-counter handling',async()=>{
 expect((await post('/devices',input)).status).toBe(201);
 expect((await post('/ingest/lorawan',wire())).status).toBe(401);
 const r=await post('/ingest/lorawan',{...wire(),source:'device'},{'X-Ingest-Key':secret});expect(r.status).toBe(200);expect(r.data.source).toBe('simulated');expect(r.data.depthM).toBeCloseTo(.2);
 expect((await post('/ingest/lorawan',wire(),{'X-Ingest-Key':secret})).data.duplicate).toBe(true);
 expect(repo.sql.prepare('SELECT COUNT(*) n FROM device_readings').get()).toMatchObject({n:1});
 expect(repo.load().sensors.find(s=>s.deviceId===input.id)?.lastValue).toBeCloseTo(20);
 expect((await post('/ingest/lorawan',wire(0),{'X-Ingest-Key':secret})).status).toBe(409);
 expect((await post('/devices',input)).status).toBe(409);
});
test('TTN ramp raises Detected only; sensor markers reference commissioned devices',async()=>{
 await post('/devices',input);const before=repo.load().faults.map(f=>f.workOrder?.state);
 const time=new Date(Date.now()-1000).toISOString(),bytes=Buffer.from(encodeUplink({flags:1,counter:1,distanceMm:500,offsetMinutes:0,temperatureC:29,batteryMv:3300})).toString('base64');
 const r=await post('/ingest/lorawan',{end_device_ids:{dev_eui:input.id},received_at:time,uplink_message:{frm_payload:bytes}},{'X-Ingest-Key':secret});expect(r.status).toBe(200);
 const after=repo.load();expect(after.faults.slice(0,before.length).map(f=>f.workOrder?.state)).toEqual(before);expect(after.faults.slice(before.length).some(f=>f.type==='standing_water'&&f.workOrder?.state==='detected')).toBe(true);
 const registered=repo.sql.prepare('SELECT id FROM devices').all() as {id:string}[];
 expect(after.sensors.filter(s=>s.deviceId).every(s=>registered.some(d=>d.id===s.deviceId))).toBe(true);
});
test('missing uplinks become offline and invalid payloads are rejected',async()=>{
 await post('/devices',input);await post('/ingest/lorawan',wire(1,800,new Date(Date.now()-3600000).toISOString()),{'X-Ingest-Key':secret});
 const r=await api.app.request('/api/v1/devices',{headers:{Authorization:'Bearer '+token}});expect((await r.json() as any)[0].status).toBe('offline');
 expect(repo.load().sensors.find(s=>s.deviceId===input.id)?.status).toBe('offline');
 const bad=wire(2);bad.data=Buffer.alloc(12).toString('base64');expect((await post('/ingest/lorawan',bad,{'X-Ingest-Key':secret})).status).toBe(422);
});
