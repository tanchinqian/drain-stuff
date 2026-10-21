import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { drainDesign, terrainHeight, type DrainDesign } from '../simulation/physics/design';
import type { ModelPhysics } from './PhysicsOverlay';
import { rainBounds, rainColour } from './visibility';
import { dropDiameter, terminalSpeed, rainPhase, mistStrength } from './rainPhysics';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
const random = (seed: number) => {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export const rainCount = (rain: number, low = false, record = false) =>
  rain <= 0
    ? 0
    : Math.min(
        record ? 4096 : low ? 512 : 2048,
        Math.ceil(rain * 3.6e6 * (record ? 60 : low ? 10 : 28)),
      );
export const seepageCount = (q: number, low = false) =>
  q > 0 ? Math.min(low ? 12 : 40, Math.ceil(q * 60000 * 2)) : 0;
export function StormRain({physics,low=false,record=false}:{physics:ModelPhysics;low?:boolean;record?:boolean}) {
  const d=drainDesign(physics.config), frame=physics.frame, rain=frame?.rain??0;
  const count=rainCount(rain,low,record), reduced=useReducedMotion();
  const drops=useRef<THREE.InstancedMesh>(null), impacts=useRef<THREE.InstancedMesh>(null), mist=useRef<THREE.InstancedMesh>(null), splashes=useRef<THREE.InstancedMesh>(null);
  const time=useRef(0), object=useMemo(()=>new THREE.Object3D(),[]), {scene,invalidate}=useThree();
  const bounds=rainBounds(d), strength=mistStrength(rain);
  // Stable x/z samples retain their collision height as density changes. Real meshes are ray-cast once.
  const samples=useMemo(()=>Array.from({length:4096},(_,i)=>({x:(random(i+1)-.5)*bounds.length,z:(random(i+999)-.5)*bounds.width,y:NaN,previous:1})),[bounds.length,bounds.width,physics.config]);
  const collision=useMemo(()=>({ray:new THREE.Raycaster(), meshes:[] as THREE.Object3D[],ready:false}),[samples]);
  useFrame((_,delta)=>{
    if(!drops.current||!impacts.current||!count||document.hidden)return;
    const started=performance.now();
    if(!reduced)time.current+=Math.min(delta,.1);
    if(!collision.ready) {
      scene.updateMatrixWorld(true);
      scene.traverse(o=>{
        const mesh=o as THREE.Mesh;
        if(!mesh.isMesh||o.userData.sectionPass)return;
        let part=false, context=false, parent:THREE.Object3D|null=o;
        while(parent){part ||= !!parent.userData.physicalPart;context ||= parent.name==='catchment-context';parent=parent.parent;}
        const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
        if((part||context)&&materials.every(m=>!m.transparent))collision.meshes.push(o);
      });
      collision.ready=true;
    }
    let casts=0;
    for(let i=0;i<count;i++) {
      const p=samples[i], {x,z}=p;
      if(Number.isNaN(p.y)&&casts++<128){
        collision.ray.set(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));
        p.y=collision.ray.intersectObjects(collision.meshes,false)[0]?.point.y??d.catchment.kerbHeight;
      }
      if(Number.isNaN(p.y)){object.scale.setScalar(0);object.updateMatrix();drops.current.setMatrixAt(i,object.matrix);impacts.current.setMatrixAt(i,object.matrix);continue;}
      const onBed=Math.abs(x)<=d.length/2&&Math.abs(z)<=d.topWidth/2;
      const fallback=onBed?terrainHeight(d,z):d.catchment.kerbHeight;
      const solidY=Number.isFinite(p.y)?p.y:fallback;
      const impactY=onBed?Math.max(solidY,frame?.ponding??0):solidY;
      const diameter=dropDiameter(rain*3.6e6,random(i+42)), speed=terminalSpeed(diameter);
      const phase=rainPhase(time.current,diameter,bounds.height,random(i+222));
      const altitude=impactY+(1-phase)*bounds.height, length=Math.min(speed/45,Math.max(.001,altitude-impactY));
      object.position.set(x-(altitude-impactY)*.08,altitude+length/2,z);
      object.rotation.set(0,0,-.08);
      // Width is magnified for screen visibility; physical diameter still determines fall speed.
      object.scale.set(diameter*.004,length,diameter*.004);object.updateMatrix();drops.current.setMatrixAt(i,object.matrix);
      const sinceImpact=phase*bounds.height/speed, age=sinceImpact/.18;
      object.position.set(x,impactY+.003,z);object.rotation.set(-Math.PI/2,0,0);
      object.scale.setScalar(age<1?.008+age*.07:0);object.updateMatrix();impacts.current.setMatrixAt(i,object.matrix);
      if(phase<p.previous&&!reduced){
        const impulses=(scene.userData.rainImpulses??=[]) as {x:number;z:number;strength:number}[];
        if(impulses.length<128)impulses.push({x,z,strength:diameter*.00008});
      }
      p.previous=phase;
      if(splashes.current){
        object.position.set(x+sinceImpact*.2,impactY+Math.max(0,.65*sinceImpact-4.905*sinceImpact*sinceImpact),z+sinceImpact*.1);
        object.rotation.set(0,0,0);object.scale.setScalar(age<.7&&impactY<=solidY+.004?.004*diameter:0);object.updateMatrix();splashes.current.setMatrixAt(i,object.matrix);
      }
    }
    drops.current.instanceMatrix.needsUpdate=true;impacts.current.instanceMatrix.needsUpdate=true;if(splashes.current)splashes.current.instanceMatrix.needsUpdate=true;
    if(mist.current) {
      for(let i=0;i<24;i++){
        object.position.set((random(i+800)-.5)*bounds.length,.3+(i%3)*.16,(random(i+300)-.5)*bounds.width);
        object.rotation.set(-Math.PI/2,0,time.current*.025);object.scale.set(1.2,.7,1);object.updateMatrix();mist.current.setMatrixAt(i,object.matrix);
      }
      mist.current.instanceMatrix.needsUpdate=true;
    }
    scene.userData.rainMs=performance.now()-started;
    if(!reduced)invalidate();
  });
  if(!count)return null;
  return <group name="storm-rain" userData={{bounds,colour:rainColour,dropDistribution:'conditional Marshall-Palmer',realTime:true}}>
    <instancedMesh name="rain-streaks" ref={drops} args={[undefined,undefined,count]} frustumCulled={false}>
      <boxGeometry/>
      <meshBasicMaterial color="#adbdbb" transparent opacity={Math.min(.9,.5+rain*3.6e6/160)} depthWrite={false}
        onBeforeCompile={shader=>{
          shader.vertexShader='varying float rainFade;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nrainFade=clamp(1.3-abs(mvPosition.z)/55.0,0.3,1.0);');
          shader.fragmentShader='varying float rainFade;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=rainFade;');
        }}/>
    </instancedMesh>
    <instancedMesh name="rain-impacts" ref={impacts} args={[undefined,undefined,count]} frustumCulled={false}>
      <ringGeometry args={[.7,1,low?8:16]}/><meshBasicMaterial color="#b6c9c7" side={THREE.DoubleSide} transparent opacity={.45} depthWrite={false}/>
    </instancedMesh>
    {!low&&<instancedMesh name="rain-splash-particles" ref={splashes} args={[undefined,undefined,count]} frustumCulled={false}>
      <tetrahedronGeometry/><meshBasicMaterial color="#ccd9d4" transparent opacity={.6} depthWrite={false}/>
    </instancedMesh>}
    {strength>0&&!low&&<instancedMesh name="rain-mist" ref={mist} args={[undefined,undefined,24]} frustumCulled={false}>
      <planeGeometry/><meshBasicMaterial color="#c8d3ce" transparent opacity={strength} depthWrite={false} side={THREE.DoubleSide}
        onBeforeCompile={shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=exp(-12.0*dot(vUv-0.5,vUv-0.5));');shader.defines={...shader.defines,USE_UV:''};}}/>
    </instancedMesh>}
  </group>;
}

export function WaterMaterial({
  depth,
  design,
  rain = 0,
  plane,
  low = false,
  velocity = 0,
  flow = false,
}: {
  depth: number;
  design: DrainDesign;
  rain?: number;
  plane?: THREE.Plane;
  low?: boolean;
  velocity?: number;
  flow?: boolean;
}) {
  const reduced = useReducedMotion(),
    invalidate = useThree((s) => s.invalidate);
  const uniforms = useMemo(
    () => ({
      waterTime: { value: 0 },
      waterRain: { value: rain * 3.6e6 },
      waterSpeed: { value: velocity },
      waterDepth: { value: depth },
    }),
    [],
  );
  uniforms.waterRain.value = rain * 3.6e6;
  uniforms.waterSpeed.value = velocity;
  uniforms.waterDepth.value = depth;
  useFrame((_, delta) => {
    if (!reduced && (flow ? velocity > 0 : depth > 0)) {
      uniforms.waterTime.value += Math.min(delta, 0.1);
      invalidate();
    }
  });
  if (low)
    return (
      <meshBasicMaterial
        color="#749a93"
        transparent
        opacity={0.6}
        depthWrite={false}
        side={THREE.DoubleSide}
        clippingPlanes={plane ? [plane] : []}
        onBeforeCompile={(shader) => {
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader =
            'varying float flowPosition;\n' +
            shader.vertexShader.replace(
              '#include <begin_vertex>',
              '#include <begin_vertex>\nflowPosition = position.x;',
            );
          shader.fragmentShader =
            'varying float flowPosition; uniform float waterTime; uniform float waterSpeed;\n' +
            shader.fragmentShader.replace(
              '#include <color_fragment>',
              '#include <color_fragment>\ndiffuseColor.rgb *= 0.8 + 0.2 * sin(flowPosition * 15.0 - waterTime * waterSpeed * 15.0);',
            );
        }}
      />
    );
  return (
    <meshPhysicalMaterial
      color="#9cb8ae"
      roughness={low ? 0.24 : 0.12}
      metalness={0}
      ior={1.333}
      transmission={low ? 0 : 0.82}
      thickness={depth}
      attenuationColor="#688b7e"
      attenuationDistance={2.5}
      transparent
      opacity={low ? 0.4 : 0.48}
      depthWrite={false}
      side={THREE.DoubleSide}
      clippingPlanes={plane ? [plane] : []}
      onBeforeCompile={(shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader =
          'varying vec3 waterPosition;\n' +
          shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nwaterPosition = position;',
          );
        shader.fragmentShader =
          'varying vec3 waterPosition; uniform float waterTime; uniform float waterRain; uniform float waterSpeed; uniform float waterDepth;\n' +
          shader.fragmentShader
            .replace(
              '#include <color_fragment>',
              `#include <color_fragment>
          ${
            !flow
              ? `float localDepth = max(0.0, waterDepth - max(0.0, (abs(waterPosition.z) - ${(design.bedWidth / 2).toFixed(8)}) / ${Math.max(0.0001, design.sideSlope).toFixed(8)}));
          diffuseColor.a *= smoothstep(0.0, 0.004, localDepth);
          diffuseColor.a *= 0.25 + 0.75 * (1.0 - exp(-localDepth * 30.0));
          diffuseColor.rgb = mix(vec3(0.64, 0.71, 0.68), diffuseColor.rgb, 1.0 - exp(-localDepth * 10.0));`
              : ''
          }`,
            )
            .replace(
              '#include <normal_fragment_maps>',
              `#include <normal_fragment_maps>
          float phase = waterPosition.x * 15.0 - waterTime * waterSpeed * 15.0;
          float waves = sin(waterPosition.x * 12.0 + waterTime) * cos(waterPosition.z * 13.0 - waterTime * 0.7);
          vec2 rippleCell = floor(waterPosition.xz * 2.7);
          float rippleSeed = fract(sin(dot(rippleCell, vec2(127.1, 311.7))) * 43758.5453);
          vec2 rippleCentre = vec2(fract(rippleSeed * 37.3), fract(rippleSeed * 83.7));
          float ringRadius = length(fract(waterPosition.xz * 2.7) - rippleCentre);
          float rings = sin(ringRadius * 52.0 - waterTime * 9.0 + rippleSeed * 6.28) * exp(-ringRadius * 4.0) * min(waterRain / 100.0, 1.0);
          normal = normalize(normal + vec3(waves + rings * 0.35, 0.0, cos(phase)) * 0.025);`,
            )
            .replace(
              '#include <opaque_fragment>',
              `
          float fresnel = 0.02 + 0.98 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 5.0);
          outgoingLight = mix(outgoingLight, vec3(0.76, 0.83, 0.85), fresnel * 0.35);
          ${flow ? 'outgoingLight *= 0.8 + 0.2 * sin(phase); outgoingLight = mix(outgoingLight, vec3(0.82, 0.86, 0.82), smoothstep(0.9, 1.0, sin(phase)) * 0.22);' : ''}
          #include <opaque_fragment>`,
            );
      }}
      customProgramCacheKey={() => 'water-v4-' + low + '-' + flow + '-' + design.bedWidth}
    />
  );
}

export function Seepage({
  physics,
  low = false,
  plane,
}: {
  physics: ModelPhysics;
  low?: boolean;
  plane?: THREE.Plane;
}) {
  const q = physics.frame?.flux.drain ?? 0,
    d = drainDesign(physics.config);
  const count = seepageCount(q, low);
  const mesh = useRef<THREE.InstancedMesh>(null),
    object = useMemo(() => new THREE.Object3D(), []);
  const time = useRef(0),
    reduced = useReducedMotion(),
    invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    if (!mesh.current || !count) return;
    if (!reduced) time.current += Math.min(delta, 0.1);
    for (let i = 0; i < count; i++) {
      const phase = (random(i + 111) + (time.current * Math.sqrt(q * 60000)) / 4) % 1;
      object.position.set(
        (random(i + 20) - 0.5) * d.length,
        d.pipeY + ((1 - phase) * d.gravelDepth) / 2,
        (i % 2 ? 1 : -1) * (1 - phase) * 0.15,
      );
      object.scale.set(0.003, 0.02, 0.003);
      object.rotation.z = (i % 2 ? 1 : -1) * 0.35;
      object.updateMatrix();
      mesh.current.setMatrixAt(i, object.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (!reduced) invalidate();
  });
  if (!count) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry />
      <meshBasicMaterial color="#789f9b" clippingPlanes={plane ? [plane] : []} />
    </instancedMesh>
  );
}
