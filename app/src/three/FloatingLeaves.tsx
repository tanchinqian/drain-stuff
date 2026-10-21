import {useMemo,useRef,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,InstancedMesh,Object3D,DoubleSide,type Plane} from 'three';
import {drainDesign} from '../simulation/physics/design';
import type {ModelPhysics} from './PhysicsOverlay';
import {variation} from './sceneMaterials';
import {useReducedMotion} from './WaterEffects';
export function leafGeometry(){
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-.5,0,0,0,.12,-.3,.5,0,0,0,0,.3,0,.12,0],3));g.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);g.computeVertexNormals();return g;
}
export function moveLeaf(p:{x:number;z:number},v:{depth:number;vx:number;vz:number},dt:number,inletX:number,inletOpen:number,sockX:number,sockOpen:number){
  const inletTrap=inletOpen<.5&&p.x<inletX&&p.x>inletX-.35&&Math.abs(p.z)<.4;
  const sockTrap=sockOpen<.5&&Math.abs(p.x-sockX)<.12;
  if(v.depth<=.003||inletTrap||sockTrap)return {...p,trapped:inletTrap||sockTrap};
  return {x:p.x+v.vx*dt,z:p.z+v.vz*dt,trapped:false};
}
export default function FloatingLeaves({physics,plane,low}:{physics:ModelPhysics;plane?:Plane;low:boolean}){
  const d=drainDesign(physics.config),count=low?12:32,mesh=useRef<InstancedMesh>(null),{scene,invalidate}=useThree(),reduced=useReducedMotion();
  const geometry=useMemo(leafGeometry,[]),object=useMemo(()=>new Object3D(),[]);
  const leaves=useMemo(()=>Array.from({length:count},(_,i)=>({x:(variation(i+300)-.5)*d.length*.9,z:(variation(i+500)-.5)*d.bedWidth*.9})),[count,d.length,d.bedWidth]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame((_,delta)=>{
    if(!mesh.current||document.hidden)return;
    const sample=scene.userData.surfaceSample as ((x:number,z:number)=>{depth:number;height:number;vx:number;vz:number})|undefined;if(!sample)return;
    let moving=false;
    for(let i=0;i<count;i++){
      const p=leaves[i],s=sample(p.x,p.z),next=moveLeaf(p,s,reduced?0:Math.min(.05,delta),-d.length/2,physics.config.values.inletOpen.value,-d.length/2+.8,physics.config.values.sockOpen.value);
      p.x=Math.max(-d.length/2+.02,Math.min(d.length/2-.02,next.x));p.z=Math.max(-d.bedWidth/2+.02,Math.min(d.bedWidth/2-.02,next.z));
      object.position.set(p.x,s.height+.004,p.z);object.rotation.set(0,Math.atan2(s.vz,s.vx)+variation(i)*2,0);
      const size=.06+variation(i+20)*.05;object.scale.set(size,.08,size);object.updateMatrix();mesh.current.setMatrixAt(i,object.matrix);
      moving ||= s.depth>.003&&Math.hypot(s.vx,s.vz)>.001&&!next.trapped;
    }
    mesh.current.instanceMatrix.needsUpdate=true;if(moving&&!reduced)invalidate();
  });
  return <instancedMesh name="advected-leaves" ref={mesh} args={[geometry,undefined,count]} frustumCulled={false}>
    <meshStandardMaterial color="#706040" roughness={.7} side={DoubleSide} clippingPlanes={plane?[plane]:[]}/>
  </instancedMesh>;
}
