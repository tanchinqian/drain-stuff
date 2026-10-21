import {useMemo,useEffect} from 'react';
import {Shape,ExtrudeGeometry,Vector3,Quaternion,TubeGeometry,LineCurve3} from 'three';
import {Line} from '@react-three/drei';
import type {ModelPhysics} from './PhysicsOverlay';
import {drainDesign} from '../simulation/physics/design';
import {roofRunoffPath,roofDischarge,type Point3} from './flowPhysics';
import FlowTrace from './FlowTrace';
import {flowSpeed} from './visibility';

function Channel({start,end,radius,name}:{start:Point3;end:Point3;radius:number;name:string}) {
  const geometry=useMemo(()=>{
    const a=new Vector3(...start),b=new Vector3(...end),length=a.distanceTo(b),s=new Shape();
    s.absarc(0,0,radius+.025,Math.PI,Math.PI*2,false);
    s.lineTo(radius,0);s.absarc(0,0,radius,0,-Math.PI,true);s.closePath();
    const g=new ExtrudeGeometry(s,{depth:length,bevelEnabled:false,curveSegments:16});
    g.rotateY(Math.PI/2);g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(1,0,0),b.sub(a).normalize()));
    g.translate(start[0],start[1]+radius,start[2]);return g;
  },[...start,...end,radius]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh name={name} geometry={geometry} receiveShadow><meshStandardMaterial color="#c4c0b4" roughness={.8}/></mesh>;
}
function Pipe({start,end,name,highlight}:{start:Point3;end:Point3;name:string;highlight:boolean}) {
  const geometry=useMemo(()=>new TubeGeometry(new LineCurve3(new Vector3(...start),new Vector3(...end)),1,.045,12,false),[...start,...end]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh name={name} geometry={geometry}><meshStandardMaterial color="#b9bcb3" roughness={.5} transparent opacity={highlight?.3:.88}/></mesh>;
}
export default function RoofConveyance({physics,low,highlight}:{physics:ModelPhysics;low:boolean;highlight:boolean}) {
  const d=drainDesign(physics.config),path=roofRunoffPath(d),q=roofDischarge(d,physics.frame);
  if(d.catchment.roofArea<=0)return null;
  const sump=path[4].end,crossing=path[5],mid=crossing.start.map((v,i)=>(v+crossing.end[i])/2) as Point3;
  return <group name="roof-conveyance" userData={{roofArea:d.catchment.roofArea,discharge:q,path}}>
    {path.map((segment,i)=><group key={segment.name} name={'roof-path-'+segment.name} userData={{start:segment.start,end:segment.end,discharge:q}}>
      {[1,4,6].includes(i)&&<Channel {...segment} radius={i===1?.05:i===4?.1125:.1875} name={segment.name}/>}
      {[2,3,5].includes(i)&&<Pipe {...segment} name={segment.name} highlight={highlight}/>}
      {highlight&&<Line points={[segment.start,segment.end]} color="#d7a746" lineWidth={3} depthTest={false}/>} 
      <FlowTrace name={'roof-water-'+segment.name} points={[segment.start,segment.end]} q={q} velocity={flowSpeed(q)} low={low}/>
    </group>)}
    <mesh name="crossing-cover" position={[mid[0],d.catchment.kerbHeight-.02,mid[2]]}>
      <boxGeometry args={[.4,.04,Math.abs(crossing.end[2]-crossing.start[2])+.05]}/><meshStandardMaterial color="#c8c6b9" roughness={.8}/>
    </mesh>
    <mesh name="lot-sump-floor" position={[sump[0],-.025,sump[2]]}><boxGeometry args={[.35,.05,.35]}/><meshStandardMaterial color="#aaa99c"/></mesh>
    {[-1,1].map(side=><mesh key={side} name="lot-sump-wall" position={[sump[0]+side*.175,.06,sump[2]]}><boxGeometry args={[.035,.12,.35]}/><meshStandardMaterial color="#aaa99c"/></mesh>)}
    {[1,2,3,4].map(y=><mesh key={y} name="downpipe-bracket" position={[path[2].start[0],y,path[2].start[2]-.025]}><boxGeometry args={[.09,.025,.08]}/><meshStandardMaterial color="#6d706b"/></mesh>)}
  </group>;
}
