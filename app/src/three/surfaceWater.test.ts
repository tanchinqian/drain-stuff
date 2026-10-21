import {test,expect} from 'vitest';
import {flatGrid,advanceSurface,waterVolumes,reconcileSurface,rainImpulse,stableStep} from './surfaceWater';
test('closed domain conserves volume to 0.1% with wet/dry fronts',()=>{
  const g=flatGrid(),s=new Float32Array(g.nx*g.nz*4);for(let i=0;i<s.length;i+=4)s[i]=i%(g.nx*4)<g.nx*2?.1:0;
  const initial=waterVolumes(g,s)[1];let state=s;
  for(let i=0;i<150;i++)state=advanceSurface(g,state,.02).state;
  expect(Math.abs(waterVolumes(g,state)[1]-initial)/initial).toBeLessThan(.001);
  expect(Array.from(state).every(Number.isFinite)).toBe(true);for(let i=0;i<state.length;i+=4)expect(state[i]).toBeGreaterThanOrEqual(0);
});
test('hydrostatic reconstruction preserves a lake at rest over uneven terrain',()=>{
  const g=flatGrid(),s=new Float32Array(g.nx*g.nz*4);
  for(let i=0;i<s.length;i+=4){g.terrain[i]=.03*Math.sin(i*.12);s[i]=.1-g.terrain[i];}
  let state=s;for(let i=0;i<60;i++)state=advanceSurface(g,state,.02).state;
  for(let i=0;i<state.length;i+=4){expect(state[i]).toBeCloseTo(s[i],6);expect(Math.abs(state[i+1])+Math.abs(state[i+2])).toBeLessThan(1e-6);}
});
test('a raised dam stays dry below its crest and is overtopped above it',()=>{
  const g=flatGrid(32,4),crest=.12;
  for(let z=0;z<g.nz;z++)g.terrain[(z*g.nx+16)*4]=crest;
  for(const level of [.1,.2]){
    let state=new Float32Array(g.nx*g.nz*4);for(let z=0;z<g.nz;z++)for(let x=0;x<16;x++)state[(z*g.nx+x)*4]=level;
    for(let i=0;i<120;i++)state=advanceSurface(g,state,.02).state;
    const downstream=state[(g.nx+18)*4];if(level<crest)expect(downstream).toBeLessThan(1e-8);else expect(downstream).toBeGreaterThan(.001);
  }
});
test('reconciliation anchors storage and depth at every playback scale, including dry seeks',()=>{
  const g=flatGrid(),state=new Float32Array(g.nx*g.nz*4);
  for(let i=0;i<state.length;i+=4)if(i/4%g.nx<5)g.terrain[i+2]=2;
  for(const scale of [1,30,60,300,600,0]){
    const depth=scale*.0002,volume=depth*4;
    const r=reconcileSurface(g,state,volume,volume*.25,depth);
    expect(r.bedError).toBeLessThan(.03);expect(r.gutterError).toBeLessThan(.03);expect(r.referenceError).toBeLessThan(.001);
    const dt=stableStep(g,state,.02);expect(dt).toBeGreaterThan(0);expect(Array.from(advanceSurface(g,state,dt).state).every(Number.isFinite)).toBe(true);
  }
  expect(state.every(v=>v===0)).toBe(true);
});
test('rain impulses preserve volume and bounded sinks never create negative depth',()=>{
  const g=flatGrid(),state=new Float32Array(g.nx*g.nz*4);for(let i=0;i<state.length;i+=4)state[i]=.01;
  const before=waterVolumes(g,state)[1];rainImpulse(g,state,1,1,.0001);expect(waterVolumes(g,state)[1]).toBeCloseTo(before,7);
  const source=new Float32Array(state.length);for(let i=0;i<source.length;i+=4)source[i]=-100;
  const next=advanceSurface(g,state,.01,source).state;for(let i=0;i<next.length;i+=4)expect(next[i]).toBe(0);
});

test('leaf motion follows local velocity and jams at a restricted inlet',async()=>{
  const {moveLeaf}=await import('./FloatingLeaves');
  const p={x:-3.1,z:0},v={depth:.1,vx:.2,vz:.1};
  expect(moveLeaf(p,v,.1,-3,.2,-2.2,1).trapped).toBe(true);
  expect(moveLeaf(p,v,.1,-3,1,-2.2,1).x).toBeCloseTo(-3.08);
  expect(moveLeaf(p,{...v,depth:0},.1,-3,1,-2.2,1).x).toBe(-3.1);
});
