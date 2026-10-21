/** Display-only Saint-Venant finite volumes; SI units, h/hu/hv/foam per cell. */
export interface SurfaceGrid {nx:number;nz:number;dx:number;dz:number;x0:number;z0:number;terrain:Float32Array;reference:number}
export const GRAVITY=9.81, DRY=1e-7;
export function flatGrid(nx=32,nz=16,dx=.1,dz=.1):SurfaceGrid {
  const terrain=new Float32Array(nx*nz*4);
  for(let i=0;i<nx*nz;i++){terrain[i*4+1]=.025;terrain[i*4+2]=1;}
  return {nx,nz,dx,dz,x0:0,z0:0,terrain,reference:Math.floor(nz/2)*nx+Math.floor(nx/2)};
}
export function stableStep(grid:SurfaceGrid,state:Float32Array,max=.016) {
  let rate=0;
  for(let i=0;i<state.length;i+=4){const h=state[i];if(h<=DRY)continue;
    const c=Math.sqrt(GRAVITY*h);
    rate=Math.max(rate,(Math.abs(state[i+1]/h)+c)/grid.dx+(Math.abs(state[i+2]/h)+c)/grid.dz);
  }
  return Math.min(max,.35/Math.max(rate,1e-8));
}
function face(s:Float32Array,t:Float32Array,a:number,b:number,nx:number,nz:number) {
  const h=s[a],z=t[a],u=h>DRY?s[a+1]/h:0,v=h>DRY?s[a+2]/h:0;
  const wall=b<0||t[b+2]===0||(t[a+2]===1)!==(t[b+2]===1);
  const H=wall?h:s[b],Z=wall?z:t[b],U=wall?u-2*(u*nx+v*nz)*nx:H>DRY?s[b+1]/H:0,V=wall?v-2*(u*nx+v*nz)*nz:H>DRY?s[b+2]/H:0;
  const top=Math.max(z,Z),hl=Math.max(0,h+z-top),hr=Math.max(0,H+Z-top);
  const vn=u*nx+v*nz,Vn=U*nx+V*nz,alpha=Math.max(Math.abs(vn)+Math.sqrt(GRAVITY*hl),Math.abs(Vn)+Math.sqrt(GRAVITY*hr));
  const pressure=.5*GRAVITY*(h*h-hl*hl);
  return [
    .5*(hl*vn+hr*Vn-alpha*(hr-hl)),
    .5*(hl*u*vn+.5*GRAVITY*hl*hl*nx+hr*U*Vn+.5*GRAVITY*hr*hr*nx-alpha*(hr*U-hl*u))+pressure*nx,
    .5*(hl*v*vn+.5*GRAVITY*hl*hl*nz+hr*V*Vn+.5*GRAVITY*hr*hr*nz-alpha*(hr*V-hl*v))+pressure*nz,
  ];
}
export function advanceSurface(grid:SurfaceGrid,state:Float32Array,requested:number,source?:Float32Array) {
  const dt=stableStep(grid,state,requested),out=new Float32Array(state.length),{nx,nz,terrain:t}=grid;
  for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
    const a=(z*nx+x)*4;if(!t[a+2])continue;
    const sides=[[x+1<nx?a+4:-1,1,0,grid.dx],[x>0?a-4:-1,-1,0,grid.dx],[z+1<nz?a+nx*4:-1,0,1,grid.dz],[z>0?a-nx*4:-1,0,-1,grid.dz]];
    let h=state[a],hu=state[a+1],hv=state[a+2];
    for(const [b,fx,fz,d] of sides){const f=face(state,t,a,b,fx,fz);h-=dt*f[0]/d;hu-=dt*f[1]/d;hv-=dt*f[2]/d;}
    const before=Math.max(0,h),after=Math.max(0,before+dt*(source?.[a]??0));
    const ratio=before>DRY?Math.min(1,after/before):0;hu*=ratio;hv*=ratio;
    if(after<=DRY){out[a]=after;continue;}
    const speed=Math.hypot(hu,hv)/after;
    const friction=1+dt*GRAVITY*t[a+1]**2*speed/after**(4/3);
    out[a]=after;out[a+1]=hu/friction;out[a+2]=hv/friction;
    out[a+3]=Math.min(1,Math.max(state[a+3]*Math.exp(-dt*2),speed/Math.sqrt(GRAVITY*after)*.12));
  }
  return {state:out,dt};
}
export function waterVolumes(grid:SurfaceGrid,state:Float32Array) {
  const v=[0,0,0];for(let i=0;i<state.length;i+=4){const region=grid.terrain[i+2];if(region>0)v[region===1?1:2]+=state[i]*grid.dx*grid.dz;}return v;
}
/** Preserve local deviations while anchoring the engine reference and each region's storage. */
export function reconcileSurface(grid:SurfaceGrid,state:Float32Array,bedVolume:number,gutterVolume:number,referenceDepth:number) {
  const area=grid.dx*grid.dz,ref=grid.reference*4,before=waterVolumes(grid,state);
  const target=[0,Math.max(0,bedVolume),Math.max(0,gutterVolume)];
  for(const region of [1,2]){
    const indices:number[]=[];
    for(let i=0;i<state.length;i+=4)if((grid.terrain[i+2]===1?1:grid.terrain[i+2]>0?2:0)===region)indices.push(i);
    if(target[region]<=0){for(const i of indices)state.fill(0,i,i+4);continue;}
    const fixed=region===1?Math.max(0,referenceDepth-grid.terrain[ref]):0;
    if(region===1){const old=state[ref];state[ref]=fixed;if(old>DRY){state[ref+1]*=fixed/old;state[ref+2]*=fixed/old;}else{state[ref+1]=0;state[ref+2]=0;}}
    let available=0;
    for(const i of indices)if(i!==ref||region!==1)available+=state[i]*area;
    const remainder=Math.max(0,target[region]-fixed*area);
    if(available<=1e-12){
      // Fill using a common free surface; no synthetic gradient is introduced on a dry seek.
      let lo=-10,hi=20;
      for(let k=0;k<45;k++){const level=(lo+hi)/2;let volume=0;for(const i of indices)if(i!==ref||region!==1)volume+=Math.max(0,level-grid.terrain[i])*area;if(volume>remainder)hi=level;else lo=level;}
      for(const i of indices)if(i!==ref||region!==1){state[i]=Math.max(0,(lo+hi)/2-grid.terrain[i]);state[i+1]=state[i+2]=0;}
    }else{
      const scale=remainder/available;
      for(const i of indices)if(i!==ref||region!==1){state[i]*=scale;state[i+1]*=scale;state[i+2]*=scale;}
    }
  }
  const after=waterVolumes(grid,state);
  return {before,after,bedError:Math.abs(after[1]-target[1])/Math.max(1e-9,target[1]),gutterError:Math.abs(after[2]-target[2])/Math.max(1e-9,target[2]),referenceError:Math.abs(state[ref]+grid.terrain[ref]-(bedVolume>0?referenceDepth:grid.terrain[ref]))};
}
export function rainImpulse(grid:SurfaceGrid,state:Float32Array,x:number,z:number,strength:number) {
  const cx=Math.floor((x-grid.x0)/grid.dx),cz=Math.floor((z-grid.z0)/grid.dz);
  if(cx<1||cx>=grid.nx-1||cz<1||cz>=grid.nz-1)return;
  const a=(cz*grid.nx+cx)*4,neighbours=[a-4,a+4,a-grid.nx*4,a+grid.nx*4];
  if(state[a]<.001||neighbours.some(i=>state[i]<.001))return;
  const amount=Math.min(strength,...neighbours.map(i=>state[i]*.2));
  state[a]+=amount;for(const i of neighbours)state[i]-=amount/4;
}
