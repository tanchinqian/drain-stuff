import * as THREE from 'three';
import type {PartId} from '../api/types';
export const palette={ink:0x2F2B26,ink2:0x5E564B,ink3:0x6F665A,panel:0xF2EEE4,ground:0xE9E4D8,well:0xDDD6C6,well2:0xE2DCCB,heat0:0xE8DEC6,heat1:0xD8B978,heat2:0xBC7A44,heat3:0x8E3A2E,control:0x7B4DAF,decompaction:0xB07A12,compost:0xB03A78};
export function roofGeometry(w=2.18,d=1.93,h=.64){const x=w/2,z=d/2,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-x,0,-z,x,0,-z,0,h,-z,-x,0,z,x,0,z,0,h,z],3));g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);g.computeVertexNormals();return g;}
const frac=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function createDrainParts(featureId:string):Record<PartId,THREE.Group>{
 const groups=Object.fromEntries((['planting','amended','subsoil','chamber','sock','outfall'] as const).map(id=>{const g=new THREE.Group();g.userData.partId=id;return [id,g];})) as Record<PartId,THREE.Group>;
 const material=(color:number,options:THREE.MeshStandardMaterialParameters={})=>new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,...options});
 const mesh=(group:THREE.Group,geometry:THREE.BufferGeometry,mat:THREE.Material,position:[number,number,number],edges=true)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(...position);group.add(m);if(edges)m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry,28),new THREE.LineBasicMaterial({color:palette.ink3,transparent:true,opacity:.6})));return m;};
 const box=(group:THREE.Group,size:[number,number,number],pos:[number,number,number],color:number|THREE.Material,edges=true)=>mesh(group,new THREE.BoxGeometry(...size),typeof color==='number'?material(color):color,pos,edges);
 const line=(group:THREE.Group,points:[number,number,number][])=>group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:palette.ink3})));
 const ring=(group:THREE.Group,r:number,tube:number,pos:[number,number,number],color:number,axis='x')=>{const m=mesh(group,new THREE.TorusGeometry(r,tube,8,32),material(color),pos,false);if(axis==='x')m.rotation.y=Math.PI/2;};
 const soil=(thickness:number,channel:number)=>{const s=new THREE.Shape();s.moveTo(-2.45,0);s.lineTo(2.45,0);s.lineTo(2.45,thickness);s.lineTo(1.55,thickness);s.lineTo(.75,thickness-channel);s.lineTo(-.75,thickness-channel);s.lineTo(-1.55,thickness);s.lineTo(-2.45,thickness);s.closePath();return new THREE.ExtrudeGeometry(s,{depth:3.55,bevelEnabled:false});};
 const {subsoil,amended,planting,chamber,sock,outfall}=groups;
 mesh(subsoil,soil(.75,.23),material(0xB78C61),[0,-.85,-1.775]);box(subsoil,[4.82,.055,3.48],[0,-.84,0],palette.well,false);
 const stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.05,0),material(palette.ink3),85),matrix=new THREE.Object3D();for(let i=0;i<85;i++){matrix.position.set((frac(i+1)-.5)*4.4,-.035,(frac(i+140)-.5)*3.3);matrix.scale.setScalar(.6+frac(i+240));matrix.updateMatrix();stones.setMatrixAt(i,matrix.matrix);}subsoil.add(stones);
 mesh(amended,soil(.55,.2),material(featureId==='S1'?0xC995B0:featureId==='S2'?0xC7A65A:0xBCA88E),[0,-.05,-1.775]);
 for(let i=0;i<45;i++)mesh(amended,new THREE.IcosahedronGeometry(.028,0),material(i%2?palette.well:palette.ink3),[(frac(i+410)-.5)*4.7,.18,(frac(i+550)-.5)*3.5],false);
 mesh(planting,soil(.19,.13),material(palette.heat0),[0,.5,-1.775]);
 const blades=new THREE.InstancedMesh(new THREE.ConeGeometry(.032,.22,3),material(0x9F8854),145);for(let i=0;i<145;i++){const x=(frac(i+800)-.5)*4.7,z=(frac(i+1000)-.5)*3.35;matrix.position.set(x,Math.abs(x)<.75?.67:.77,z);matrix.rotation.set(.18*(frac(i+60)-.5),frac(i)*Math.PI,.35*(frac(i+90)-.5));matrix.scale.setScalar(.75+frac(i+55)*.6);matrix.updateMatrix();blades.setMatrixAt(i,matrix.matrix);}planting.add(blades);
 const concrete=material(0xC7C0AE);box(chamber,[1.72,.17,1.65],[3.35,-.78,0],concrete);box(chamber,[.15,1.34,1.65],[2.56,-.16,0],concrete);box(chamber,[.15,1.34,1.65],[4.14,-.16,0],concrete);box(chamber,[1.55,1.34,.15],[3.35,-.16,-.75],concrete);box(chamber,[1.55,.77,.15],[3.35,-.44,.75],concrete);
 box(chamber,[1.81,.08,.1],[3.35,.54,-.85],palette.ink2);box(chamber,[1.81,.08,.1],[3.35,.54,.85],palette.ink2);box(chamber,[.1,.08,1.6],[2.5,.54,0],palette.ink2);box(chamber,[.1,.08,1.6],[4.2,.54,0],palette.ink2);
 for(let i=0;i<10;i++)box(chamber,[.053,.06,1.55],[2.65+i*.155,.56,0],palette.ink3,false);for(let j=0;j<3;j++)box(chamber,[1.6,.04,.03],[3.35,.59,-.53+j*.53],palette.ink2,false);
 for(const x of [2.52,4.18])for(const z of [-.78,.78])mesh(chamber,new THREE.CylinderGeometry(.046,.046,.045,6),material(palette.ink),[x,.62,z],false);
 box(chamber,[.48,.04,.85],[2.22,-.33,0],palette.ink3);box(chamber,[.5,.22,.06],[2.22,-.22,-.42],palette.well);box(chamber,[.5,.22,.06],[2.22,-.22,.42],palette.well);
 mesh(sock,new THREE.CylinderGeometry(.24,.24,1.2,32,1,true),material(palette.heat1,{side:THREE.DoubleSide}),[2.4,-.06,0]).rotation.x=Math.PI/2;
 for(let i=0;i<17;i++)ring(sock,.242,.009,[2.4,-.06,-.58+i*.073],palette.ink3,'z');
 for(let a=0;a<12;a++){const angle=a/12*Math.PI*2;line(sock,[[2.4+Math.cos(angle)*.244,-.06+Math.sin(angle)*.244,-.6],[2.4+Math.cos(angle)*.244,-.06+Math.sin(angle)*.244,.6]]);}
 ring(sock,.253,.025,[2.4,-.06,-.55],palette.ink2,'z');ring(sock,.253,.025,[2.4,-.06,.55],palette.ink2,'z');for(let i=0;i<25;i++)mesh(sock,new THREE.IcosahedronGeometry(.025+frac(i)*.045,0),material(i%3?palette.heat2:palette.heat3),[2.25+(frac(i+12)-.5)*.4,-.18+frac(i+40)*.12,(frac(i+120)-.5)*1.13],false);
 mesh(outfall,new THREE.CylinderGeometry(.29,.29,2.7,40,1,true),material(0xAEA38A,{side:THREE.DoubleSide}),[5.51,-.4,0]).rotation.z=Math.PI/2;
 mesh(outfall,new THREE.CylinderGeometry(.24,.24,2.7,40,1,true),material(palette.ink2,{side:THREE.BackSide}),[5.51,-.4,0],false).rotation.z=Math.PI/2;
 for(const x of [4.16,5.15,6.86])ring(outfall,.285,.035,[x,-.4,0],palette.well);ring(outfall,.35,.052,[5.1,-.4,0],palette.ink3);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;mesh(outfall,new THREE.CylinderGeometry(.035,.035,.09,6),material(palette.ink2),[5.1,-.4+Math.cos(a)*.35,Math.sin(a)*.35],false).rotation.z=Math.PI/2;}
 box(outfall,[.36,.28,.7],[5.82,-.84,0],palette.well);box(outfall,[.36,.28,.7],[4.55,-.84,0],palette.well);
 return groups;
}
