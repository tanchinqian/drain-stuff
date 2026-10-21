import {test,expect} from 'vitest';
import {deviceInput,encodeUplink,decodeUplink,readingTrust,type Device} from './iot';
import {decodeUplink as formatter} from '../../docs/iot/decoder.js';
const d:Device={...deviceInput.parse({id:'0102030405060708',assetId:'S1',part:'inlet',mountingHeightM:1,overflowLevelM:.45}),commissionedBy:'Test',commissionedAt:new Date().toISOString(),status:'active'};
const sample={flags:0,offsetMinutes:20,distanceMm:800,temperatureC:-3,batteryMv:3300,counter:0x010203};
test('12-byte payload roundtrips and integration formatter matches canonical decoder',()=>{
 const bytes=encodeUplink(sample);expect(bytes).toHaveLength(12);expect(decodeUplink(bytes)).toEqual({version:1,...sample});expect(formatter({bytes:[...bytes]}).data).toEqual(decodeUplink(bytes));
 expect(()=>decodeUplink(new Uint8Array(11))).toThrow();expect(()=>encodeUplink({...sample,counter:0x1000000})).toThrow();
});
test('commissioning enforces blind-zone clearance',()=>expect(()=>deviceInput.parse({...d,commissionedBy:undefined,commissionedAt:undefined,status:undefined,mountingHeightM:.6,overflowLevelM:.45})).toThrow());
test('range, stuck, battery, rate, missed uplinks and float trust checks remain conservative',()=>{
 const at='2026-10-16T12:00:00.000Z',u={version:1,...sample};
 expect(readingTrust(d,u,[],at).status).toBe('ok');
 expect(readingTrust(d,{...u,distanceMm:100},[],at).reasons).toContain('out_of_range');
 expect(readingTrust(d,u,[1,2,3].map(()=>({distanceMm:800,at:'2026-10-16T11:59:00.000Z'})),at).reasons).toContain('stuck');
 expect(readingTrust(d,{...u,batteryMv:2800},[],at).reasons).toContain('low_battery');
 expect(readingTrust(d,u,[{distanceMm:300,at:'2026-10-16T11:59:00.000Z'}],at).reasons).toContain('rate_of_change');
 expect(readingTrust(d,u,[{distanceMm:810,at:'2026-10-16T10:00:00.000Z'}],at).reasons).toContain('missed_uplinks');
 expect(readingTrust(d,{...u,flags:1},[],at).reasons).toContain('float_disagreement');
});
