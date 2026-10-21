import {installedPart} from '../api/parts';
import type {PhysicsConfig} from '../simulation/physics/config';
import type {PhysicsFrame} from '../simulation/physics/engine';
import {drainDesign,terrainHeight,type DrainDesign} from '../simulation/physics/design';
import {roofDischarge} from './flowPhysics';
import type {SurfaceGrid} from './surfaceWater';
export function roadElevation(d:DrainDesign,x:number,z:number){
  const gutter=-d.length/2-.78;
  return d.catchment.kerbHeight+.02*Math.max(0,gutter-x)+Math.min(.02,d.catchment.gutterSlope)*Math.abs(z);
}
export function buildSurfaceGrid(config:PhysicsConfig,nx=256,nz=128):SurfaceGrid {
  const d=drainDesign(config),l=d.length/2,w=d.topWidth/2;
  const x0=-l-d.catchment.roadWidth-.85,z0=-w-.35,dx=(l+.15-x0)/nx,dz=(2*w+.7)/nz;
  const terrain=new Float32Array(nx*nz*4),inletWidth=Math.max(dz*2,.5*config.values.inletOpen.value);
  const installed=(id:string)=>installedPart(config.id,id);
  let reference=0,best=Infinity;
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
    const X=x0+(x+.5)*dx,Z=z0+(z+.5)*dz,i=(z*nx+x)*4;
    let bed=roadElevation(d,X,Z),region=0,n=.025,source=0;
    if(X>=-l&&X<=l&&Math.abs(Z)<=w){
      region=1;n=config.kind==='inlet'?.02:.06;bed=config.kind==='inlet'?0:terrainHeight(d,Z);
      if(config.kind!=='inlet'){
        if(installed('checkdam')&&Math.abs(Z)<d.bedWidth/2&&Math.min(Math.abs(X-l/3),Math.abs(X+l/3))<Math.max(.04,dx*.6))bed=Math.max(bed,.12);
        if(installed('sock')&&Math.abs(X-(-l+.8))<Math.max(.08,dx*.6)&&Math.abs(Z)<d.bedWidth*.4){bed=Math.max(bed,.07+(1-config.values.sockOpen.value)*.08);n=.15;}
        if(installed('energy')&&X<-l+.65&&Math.abs(Z)<d.bedWidth*.4){bed=Math.max(bed,.02+.025*(.5+.5*Math.sin(X*37+Z*51)));n=.1;}
      }
      if(X<-l+Math.max(.2,dx*2)&&Math.abs(Z)<inletWidth/2)source=1;
      if(X>l-Math.max(.2,dx*2))source=4;
      const distance=X*X+Z*Z;if(distance<best){best=distance;reference=z*nx+x;}
    }else if(X<-l-.25){
      region=2;
      if(Math.abs(X-(-l-.78))<.21&&d.catchment.roofArea>0)bed=.02+Math.min(.02,d.catchment.gutterSlope)*Math.abs(Z);
      if(z===nz-2)source=2;
      if(x===1)source=3;
      if(X>-l-.6&&Math.abs(Z)<inletWidth/2)source=5;
    }
    terrain.set([bed,n,region,source],i);
  }
  return {nx,nz,dx,dz,x0,z0,terrain,reference};
}
export function surfaceSources(grid:SurfaceGrid,state:Float32Array,config:PhysicsConfig,f:PhysicsFrame){
  const source=new Float32Array(state.length),area=grid.dx*grid.dz,counts=[0,0,0,0,0,0];let wetBed=0,roadArea=0;
  for(let i=0;i<state.length;i+=4){const region=grid.terrain[i+2],code=grid.terrain[i+3];counts[code]++;if(region===1&&state[i]>1e-7)wetBed+=area;if(region===2)roadArea+=area;}
  const roof=roofDischarge(drainDesign(config),f),upstream=Math.max(0,(f.links.find(l=>l.id==='property drain to kerb flow')?.discharge??0)-roof-f.rain*roadArea);
  for(let i=0;i<source.length;i+=4){const region=grid.terrain[i+2],code=grid.terrain[i+3];if(!region)continue;
    let rate=f.rain;
    if(region===1&&state[i]>1e-7)rate-=f.flux.infiltration/Math.max(area,wetBed);
    if(code===1)rate+=f.flux.inlet/(counts[1]*area);
    if(code===2)rate+=roof/(counts[2]*area);
    if(code===3)rate+=upstream/(counts[3]*area);
    if(code===4)rate-=(f.flux.overflow+(config.kind==='inlet'?f.flux.outfall:0))/(counts[4]*area);
    if(code===5)rate-=f.flux.inlet/(counts[5]*area);
    source[i]=rate;
  }
  return source;
}
export const surfaceTargets=(f:PhysicsFrame)=>({bedVolume:Math.max(0,f.cell.surface),gutterVolume:Math.max(0,f.network.find(n=>n.id==='kerb flow')?.volume??0),depth:f.ponding});
