import {test,expect} from 'vitest';
import {wetFinish,mulchLift,damDischarge,sockDarkening} from './materialInteractions';
import {wetAlbedo} from './soilMaterial';
import {featureConfig} from '../simulation/physics/config';
import {buildSurfaceGrid} from './surfaceScene';
import {advanceSurface} from './surfaceWater';
test('paving and asphalt get darker and smoother when wet',()=>{
  expect(wetFinish(1).roughness).toBeLessThan(wetFinish(0).roughness);
  expect(wetFinish(1).albedo).toBeLessThan(wetFinish(0).albedo);
  expect(wetFinish(3)).toEqual(wetFinish(1));
});
test('retained mulch wetness produces a film finish; only selected chips float at high depth',()=>{
  expect(wetFinish(.7).roughness).toBeLessThan(wetFinish(0).roughness);
  expect(mulchLift(.04,.99)).toBe(0);expect(mulchLift(.2,.5)).toBe(0);expect(mulchLift(.2,.99)).toBeCloseTo(.209);
});
test('media, sand, gravel and geotextile darken with their sampled saturation',()=>{
  for(const dry of [.4,.6,.8])expect(wetAlbedo(dry,.9)).toBeLessThan(wetAlbedo(dry,.2));
});
test('sock shading follows clog and wetness; dam spill needs positive head above crest and tailwater',()=>{
  expect(sockDarkening(.8,.8)).toBeLessThan(sockDarkening(0,.1));
  expect(damDischarge(.1,0,.12,3)).toBe(0);expect(damDischarge(.2,.25,.12,3)).toBe(0);
  expect(damDischarge(.2,.08,.12,3)).toBeGreaterThan(0);
});
test('only installed obstacles enter the terrain; a restricted sock raises upstream storage',()=>{
  const c=featureConfig('S1');c.values.sockOpen.value=.1;
  const g=buildSurfaceGrid(c,64,32);let state=new Float32Array(g.nx*g.nz*4),source=new Float32Array(state.length);
  const pick=(x:number)=>((Math.floor((0-g.z0)/g.dz)*g.nx)+Math.floor((x-g.x0)/g.dx))*4;
  const sock=-c.values.length.value/2+.8;
  for(let i=0;i<state.length;i+=4){if(g.terrain[i+2]===1)state[i]=Math.max(0,.05-g.terrain[i]);if(g.terrain[i+3]===1)source[i]=.003;}
  for(let i=0;i<300;i++)state=advanceSurface(g,state,.02,source).state;
  const up=pick(sock-.3),down=pick(sock+.3);
  expect(state[up]+g.terrain[up]).toBeGreaterThan(state[down]+g.terrain[down]);
  const s2=buildSurfaceGrid(featureConfig('S2'),64,32);
  expect(Array.from(s2.terrain).filter((_,i)=>i%4===1).some(n=>n>.14)).toBe(false);
});
