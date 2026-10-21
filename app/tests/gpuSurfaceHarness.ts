import {WebGLRenderer} from 'three';
import {GpuSurfaceWater} from '../src/three/GpuSurfaceWater';
import {flatGrid,waterVolumes} from '../src/three/surfaceWater';
export function verifyGpuSurface(){
  const renderer=new WebGLRenderer({canvas:document.createElement('canvas')});
  const g=flatGrid(64,32),s=new Float32Array(g.nx*g.nz*4);
  for(let i=0;i<s.length;i+=4){g.terrain[i]=.03*Math.sin(i*.12);s[i]=.1-g.terrain[i];}
  const gpu=new GpuSurfaceWater(renderer,g);gpu.upload(s);gpu.read();
  for(let i=0;i<30;i++){gpu.step(.016);gpu.read();}
  const lake=gpu.read().slice();let drift=0,motion=0;
  for(let i=0;i<s.length;i+=4){drift=Math.max(drift,Math.abs(lake[i]-s[i]));motion=Math.max(motion,Math.abs(lake[i+1])+Math.abs(lake[i+2]));}
  const volumeError=Math.abs(waterVolumes(g,lake)[1]-waterVolumes(g,s)[1])/waterVolumes(g,s)[1];
  gpu.dispose();
  const flat=flatGrid(64,16),wet=new Float32Array(flat.nx*flat.nz*4);
  for(let i=0;i<wet.length;i+=4)wet[i]=(i/4)%flat.nx<32?.1:0;
  const front=new GpuSurfaceWater(renderer,flat);front.upload(wet);front.read();const initial=waterVolumes(flat,wet)[1];
  for(let i=0;i<80;i++){front.step(.016);front.read();}
  const final=front.read(),frontError=Math.abs(waterVolumes(flat,final)[1]-initial)/initial,frontPositive=Array.from(final).filter((_,i)=>i%4===0).every(v=>v>=0);
  front.dispose();renderer.dispose();return {drift,motion,volumeError,frontError,frontPositive,finite:lake.every(Number.isFinite),nonnegative:Array.from(lake).filter((_,i)=>i%4===0).every(v=>v>=0)};
}
