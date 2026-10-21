import {useMemo,useRef,useLayoutEffect,useEffect} from 'react';
import {InstancedMesh,Object3D,BoxGeometry,IcosahedronGeometry,CylinderGeometry,type BufferGeometry,Color} from 'three';
import type {DrainDesign} from '../simulation/physics/design';
import {surfaceMaps,variation,type Surface} from './sceneMaterials';
type Item={p:[number,number,number];s:[number,number,number];r?:number};
function Batch({name,items,colour,kind='concrete',shape='box',wet=0}:{name:string;items:Item[];colour:string;kind?:Surface;shape?:'box'|'tree'|'pole';wet?:number}){
  const mesh=useRef<InstancedMesh>(null);
  const geometry=useMemo<BufferGeometry>(()=>shape==='tree'?new IcosahedronGeometry(1,1):shape==='pole'?new CylinderGeometry(.5,.6,1,8):new BoxGeometry(),[shape]);
  const maps=useMemo(()=>surfaceMaps(kind,new Color(colour).getHex()),[kind,colour]);
  useLayoutEffect(()=>{if(!mesh.current)return;const o=new Object3D();items.forEach((item,i)=>{o.position.set(...item.p);o.scale.set(...item.s);o.rotation.set(0,item.r??0,0);o.updateMatrix();mesh.current!.setMatrixAt(i,o.matrix);mesh.current!.setColorAt(i,new Color('white').multiplyScalar(.92+variation(i+70)*.12));});mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;},[items]);
  useEffect(()=>()=>{geometry.dispose();maps.map.dispose();maps.normalMap.dispose();},[geometry,maps]);
  return <instancedMesh name={name} ref={mesh} args={[geometry,undefined,items.length]} castShadow receiveShadow>
    <meshStandardMaterial {...maps} color={new Color('white').multiplyScalar(1-wet*.2)} roughness={.86-wet*.35}/>
  </instancedMesh>;
}
export default function TerraceStreet({design:d,low,wet}:{design:DrainDesign;low:boolean;wet:number}){
  const kit=useMemo(()=>{
    const wall:Item[]=[],roof:Item[]=[],trim:Item[]=[],glass:Item[]=[],paving:Item[]=[],vegetation:Item[]=[],trunks:Item[]=[],markings:Item[]=[],cars:Item[]=[],bins:Item[]=[];
    const width=Math.max(4.8,d.length*.8),front=-d.topWidth/2-d.catchment.footpathWidth-.35,ground=d.catchment.kerbHeight;
    const houses=low?[-1,0,1]:[-2,-1,0,1,2];
    for(const house of houses){const x=house*width;
      wall.push({p:[x,ground+2.4,front-3],s:[width-.06,4.8,6]});
      roof.push({p:[x,ground+4.9,front-3],s:[width+.14,.18,6.24]});
      trim.push({p:[x,ground+4.78,front+.09],s:[width,.09,.09]});
      if(house!==0||d.catchment.roofArea===0)trim.push({p:[x-width*.425,ground+2.4,front+.14],s:[.065,4.8,.065]});
      paving.push({p:[x,ground+.025,front+.5],s:[width-.06,.05,.3]},{p:[x-width*.2,ground+.025,front+.18],s:[.75,.05,.36]});
      for(const side of [-1,1]){
        wall.push({p:[x+side*(width/2-.06),ground+.5,front+.2],s:[.12,1,.8]});
        glass.push({p:[x+side*width*.25,ground+3.4,front+.018],s:[.72,1,.04]});
        trim.push({p:[x+side*width*.25,ground+3.95,front+.04],s:[.8,.07,.06]});
      }
      roof.push({p:[x-width*.2,ground+1.05,front+.025],s:[.7,2.1,.055]});
      glass.push({p:[x+width*.23,ground+1.3,front+.025],s:[1,.8,.055]});
      for(let k=0;k<8;k++)trim.push({p:[x-width*.42+k*width*.12,ground+.42,front+.65],s:[.025,.84,.03]});
      trim.push({p:[x,ground+.85,front+.65],s:[width*.9,.04,.04]});
      bins.push({p:[x+width*.42,ground+.25,front+.48],s:[.28,.5,.27]});
    }
    // Frontage road meets the existing side road; both extend beyond the camera's drain framing.
    const junction=d.topWidth/2+3.3,sideRoad=-d.length/2-d.catchment.roadWidth/2-.7;
    for(let i=0;i<12;i++)markings.push({p:[-12+i*2.3,ground+.007,junction],s:[.9,.008,.06]});
    for(let i=0;i<4;i++)markings.push({p:[sideRoad-.35+i*.3,ground+.009,junction-1.05],s:[.12,.01,1.2]});
    for(let i=0;i<7;i++){
      const x=-15+i*5,z=junction+3.4+(i%2)*.5,h=2.1+variation(i+80)*.8;
      trunks.push({p:[x,ground+h/2,z],s:[.16,h,.16]});
      for(let k=0;k<3;k++)vegetation.push({p:[x+(k-1)*.5,ground+h+.5+(k%2)*.5,z],s:[.8,1,.8]});
    }
    for(const x of [-9,0,9])trim.push({p:[x,ground+2, junction+2],s:[.08,4,.08]},{p:[x+.2,ground+4,junction+2],s:[.5,.08,.2]});
    for(let i=0;i<20;i++)vegetation.push({p:[-15+i*1.5,ground+.35,front-6.6],s:[.55,.45,.45]});
    // Distant silhouettes soften the horizon without additional detailed buildings.
    for(let i=0;i<24;i++){const a=i*Math.PI/12;vegetation.push({p:[Math.cos(a)*45,3+variation(i)*2,Math.sin(a)*45],s:[3,3+variation(i)*2,2.5]});}
    for(const x of [-8,8]){
      cars.push({p:[x,ground+.45,junction+1],s:[2.5,.55,1.1]},{p:[x-.15,ground+.9,junction+1],s:[1.4,.5,1]});
      for(const a of [-1,1])for(const b of [-1,1])trim.push({p:[x+a*.8,ground+.23,junction+1+b*.56],s:[.4,.4,.12]});
    }
    return {wall,roof,trim,glass,paving,vegetation,trunks,markings,cars,bins,junction,front,width,count:houses.length};
  },[d.length,d.topWidth,d.catchment.roofArea,d.catchment.roadWidth,d.catchment.kerbHeight,low]);
  return <group name="terrace-street" userData={{houseCount:kit.count,typical:true}}>
    <Batch name="terrace-walls" items={kit.wall} colour="#dbd6c7" wet={wet}/>
    <Batch name="terrace-roofs-doors" items={kit.roof} colour="#848a80" kind="paving" wet={wet}/>
    <Batch name="terrace-trim-gates" items={kit.trim} colour="#56625b"/>
    <Batch name="terrace-windows" items={kit.glass} colour="#788b8c"/>
    <Batch name="terrace-porches" items={kit.paving} colour="#bfbdae" kind="paving" wet={wet}/>
    <Batch name="street-trees-shrubs" items={kit.vegetation} colour="#809373" kind="grass" shape="tree" wet={wet}/>
    <Batch name="street-tree-trunks" items={kit.trunks} colour="#88745e" kind="soil" shape="pole"/>
    <Batch name="road-markings" items={kit.markings} colour="#dedbc8"/>
    <Batch name="parked-vehicles" items={kit.cars} colour="#9ca7a2"/>
    <Batch name="household-bins" items={kit.bins} colour="#6e806e"/>
    <Batch name="frontage-road" items={[{p:[0,d.catchment.kerbHeight-.05,kit.junction],s:[36,.1,2.8]}]} colour="#737d7b" kind="asphalt" wet={wet}/>
    <Batch name="back-lane" items={[{p:[0,d.catchment.kerbHeight-.035,kit.front-7],s:[kit.width*kit.count,.07,1]}]} colour="#b8b6a7" kind="paving" wet={wet}/>
    <Batch name="frontage-kerbs" items={[-1,1].map(side=>({p:[(18-d.length/2-.5)/2,d.catchment.kerbHeight+.06,kit.junction+side*1.45],s:[18+d.length/2+.5,.12,.13]}))} colour="#c7c6b8" wet={wet}/>
  </group>;
}
