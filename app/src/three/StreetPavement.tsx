import {useMemo,useEffect} from 'react';
import {BufferGeometry,Float32BufferAttribute,Color} from 'three';
import type {DrainDesign} from '../simulation/physics/design';
import {roadElevation} from './surfaceScene';
import {surfaceMaps} from './sceneMaterials';
export default function StreetPavement({design:d,wet}:{design:DrainDesign;wet:number}){
  const geometry=useMemo(()=>{
    const p:number[]=[],uv:number[]=[],indices:number[]=[],x0=-d.length/2-d.catchment.roadWidth-.7,x1=-d.length/2-.9;
    for(let z=0;z<=64;z++)for(let x=0;x<=4;x++){
      const X=x0+(x1-x0)*x/4,Z=-20+40*z/64;p.push(X,roadElevation(d,X,Z),Z);uv.push(X,Z);
      if(x<4&&z<64){const a=z*5+x;indices.push(a,a+5,a+1,a+1,a+5,a+6);}
    }
    // Closed skirts meet the base course; no exposed gap under the sloping wearing surface.
    const edge=[...Array.from({length:65},(_,z)=>z*5),...Array.from({length:4},(_,x)=>320+x+1),...Array.from({length:64},(_,z)=>(63-z)*5+4),3,2,1];
    for(let i=0;i<edge.length;i++){
      const a=edge[i],b=edge[(i+1)%edge.length],base=p.length/3;
      p.push(p[a*3],0,p[a*3+2],p[b*3],0,p[b*3+2]);uv.push(0,0,1,0);indices.push(a,base,b,b,base,base+1);
    }
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  },[d.length,d.catchment.roadWidth,d.catchment.gutterSlope,d.catchment.kerbHeight]);
  const maps=useMemo(()=>surfaceMaps('asphalt'),[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);useEffect(()=>()=>{maps.map.dispose();maps.normalMap.dispose();},[maps]);
  return <mesh name="road" geometry={geometry} receiveShadow><meshStandardMaterial {...maps} color={new Color('white').multiplyScalar(1-wet*.38)} roughness={.95-wet*.55}/></mesh>;
}
