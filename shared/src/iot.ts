import { z } from 'zod';
import { assetId } from './contract';
export const deviceInput=z.object({id:z.string().regex(/^[a-fA-F0-9]{16}$/).transform(s=>s.toLowerCase()),assetId,
  part:z.enum(['inlet','drainage','underdrain','outfall']),type:z.literal('ultrasonic').default('ultrasonic'),
  mountingHeightM:z.number().min(0.3).max(6),calibrationOffsetM:z.number().min(-0.2).max(0.2).default(0),
  overflowLevelM:z.number().min(0).max(5),minDistanceM:z.number().min(.25).max(1).default(.3),maxDistanceM:z.number().min(1).max(10).default(5),
  intervalSeconds:z.number().int().min(60).max(3600).default(900),stuckReports:z.number().int().min(3).max(30).default(4),
  maxRiseMPerMin:z.number().positive().max(2).default(.15),lowBatteryMv:z.number().int().min(2000).max(5000).default(3000),
}).strict().refine(v=>v.mountingHeightM-v.overflowLevelM>=.3-1e-9,'Mount at least 0.3 m above the highest measured level').refine(v=>v.maxDistanceM>v.minDistanceM,'Maximum distance must exceed the blind zone');
export type Device= z.infer<typeof deviceInput>&{commissionedBy:string;commissionedAt:string;status:'active'|'offline';lastAt?:string;trustReasons?:string[]};
export function sensorMountPosition(c:import('./physics/config').PhysicsConfig,part:string,height:number) {
 const l=c.values.length.value,base=-c.values.mediaDepth.value-c.values.transitionDepth.value-c.values.gravelDepth.value-.05;
 return {x:part==='inlet'?-l/2-.4:part==='outfall'?l/2+.8:0,y:(part==='drainage'||part==='underdrain'||part==='outfall'?base:0)+height,z:0};
}
export interface Uplink {version:number;flags:number;offsetMinutes:number;distanceMm:number;temperatureC:number;batteryMv:number;counter:number}
export function encodeUplink(v:Omit<Uplink,'version'>):Uint8Array {
  if(!Number.isInteger(v.counter)||v.counter<0||v.counter>0xffffff||!Number.isInteger(v.distanceMm)||v.distanceMm<0||v.distanceMm>65535||!Number.isInteger(v.flags)||v.flags<0||v.flags>15||!Number.isInteger(v.offsetMinutes)||v.offsetMinutes<0||v.offsetMinutes>65535||!Number.isInteger(v.batteryMv)||v.batteryMv<0||v.batteryMv>65535||!Number.isFinite(v.temperatureC)||v.temperatureC< -40||v.temperatureC>85) throw new Error('Uplink values outside protocol range');
  const b=new Uint8Array(12),d=new DataView(b.buffer);b[0]=1;b[1]=v.flags;d.setUint16(2,v.offsetMinutes);d.setUint16(4,v.distanceMm);d.setInt8(6,Math.round(v.temperatureC));d.setUint16(7,v.batteryMv);b[9]=v.counter>>>16;b[10]=(v.counter>>>8)&255;b[11]=v.counter&255;return b;
}
export function decodeUplink(b:Uint8Array):Uplink {
  if(b.length!==12||b[0]!==1||b[1]>15) throw new Error('Unsupported payload version, size or flags');
  const d=new DataView(b.buffer,b.byteOffset,b.byteLength),v={version:b[0],flags:b[1],offsetMinutes:d.getUint16(2),distanceMm:d.getUint16(4),temperatureC:d.getInt8(6),batteryMv:d.getUint16(7),counter:b[9]*65536+b[10]*256+b[11]};
  if(v.temperatureC< -40||v.temperatureC>85) throw new Error('Temperature outside payload range');return v;
}
export function readingTrust(device:Device,u:Uplink,previous:{distanceMm:number;at:string}[],at:string) {
  const distance=u.distanceMm/1000,depth=device.mountingHeightM-distance+device.calibrationOffsetM,reasons:string[]=[];
  if(distance<device.minDistanceM||distance>device.maxDistanceM||depth<-.05||depth>device.mountingHeightM||u.flags&4) reasons.push('out_of_range');
  if(u.flags&2 || (previous.length>=device.stuckReports-1&&previous.slice(0,device.stuckReports-1).every(r=>r.distanceMm===u.distanceMm))) reasons.push('stuck');
  const last=previous[0],elapsed=last?(Date.parse(at)-Date.parse(last.at))/60000:0;
  if(last&&elapsed>0&&Math.abs(u.distanceMm-last.distanceMm)/1000/elapsed>device.maxRiseMPerMin) reasons.push('rate_of_change');
  if(u.batteryMv<device.lowBatteryMv||u.flags&8) reasons.push('low_battery');
  if(last&&Date.parse(at)-Date.parse(last.at)>device.intervalSeconds*3000) reasons.push('missed_uplinks');
  if((u.flags&1) ? depth<device.overflowLevelM-.001 : depth>device.overflowLevelM+.001) reasons.push('float_disagreement');
  return {depthM:Math.max(0,depth),reasons,status:reasons.length?'suspect' as const:'ok' as const};
}
