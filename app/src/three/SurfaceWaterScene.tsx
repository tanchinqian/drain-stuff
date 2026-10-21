import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,MeshPhysicalMaterial,Vector2,Vector4,DoubleSide,type Texture,type Plane} from 'three';
import type {ModelPhysics} from './PhysicsOverlay';
import {GpuSurfaceWater,floatTexture} from './GpuSurfaceWater';
import {buildSurfaceGrid,surfaceSources,surfaceTargets} from './surfaceScene';
import {rainImpulse,reconcileSurface,type SurfaceGrid} from './surfaceWater';

function surfaceGeometry(g:SurfaceGrid){
  const p:number[]=[],uv:number[]=[],normals:number[]=[],indices:number[]=[];
  for(let z=0;z<g.nz;z++)for(let x=0;x<g.nx;x++){
    p.push(g.x0+(x+.5)*g.dx,0,g.z0+(z+.5)*g.dz);uv.push((x+.5)/g.nx,(z+.5)/g.nz);normals.push(0,1,0);
    if(x<g.nx-1&&z<g.nz-1){const a=z*g.nx+x;indices.push(a,a+g.nx,a+1,a+1,a+g.nx,a+g.nx+1);}
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(p,3));geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);return geometry;
}
export default function SurfaceWater({physics,plane,low=false,record=false}:{physics:ModelPhysics;plane?:Plane;low?:boolean;record?:boolean}) {
  const {gl,scene,invalidate}=useThree(),frame=useRef(physics.frame);frame.current=physics.frame;
  const [forcedCpu,setForcedCpu]=useState(false);
  const gpuCapable=!forcedCpu&&gl.capabilities.isWebGL2&&gl.extensions.has('EXT_color_buffer_float');
  const nx=gpuCapable?(record?384:low?128:256):64,nz=nx/2;
  const grid=useMemo(()=>buildSurfaceGrid(physics.config,nx,nz),[physics.config,nx,nz]);
  const resources=useMemo(()=>{
    const state=new Float32Array(nx*nz*4),texture=floatTexture(state,nx,nz),terrain=floatTexture(grid.terrain,nx,nz);
    const uniforms={surfaceMap:{value:texture as Texture},terrainMap:{value:terrain},surfaceTexel:{value:new Vector2(1/nx,1/nz)},surfaceSpacing:{value:new Vector2(grid.dx,grid.dz)},sectionPlane:{value:new Vector4()},sectionEnabled:{value:0},surfaceTime:{value:0},surfaceRain:{value:0},turbidity:{value:0}};
    const material=new MeshPhysicalMaterial({color:'#a6beb2',roughness:.12,metalness:0,ior:1.333,transmission:low?0:.55,thickness:.08,transparent:true,opacity:.65,depthWrite:false,side:DoubleSide});
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='uniform sampler2D surfaceMap,terrainMap; uniform vec2 surfaceTexel,surfaceSpacing; varying vec2 surfaceUv; varying vec3 surfaceWorld,surfaceNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        surfaceUv=uv;vec4 s=texture2D(surfaceMap,uv),b=texture2D(terrainMap,uv);
        transformed.y=b.x+s.x+.0002;
        vec2 ex=vec2(surfaceTexel.x,0.),ez=vec2(0.,surfaceTexel.y);
        float left=texture2D(surfaceMap,uv-ex).x+texture2D(terrainMap,uv-ex).x,right=texture2D(surfaceMap,uv+ex).x+texture2D(terrainMap,uv+ex).x;
        float bottom=texture2D(surfaceMap,uv-ez).x+texture2D(terrainMap,uv-ez).x,top=texture2D(surfaceMap,uv+ez).x+texture2D(terrainMap,uv+ez).x;
        surfaceNormal=normalMatrix*normalize(vec3((left-right)/(2.*surfaceSpacing.x),1.,(bottom-top)/(2.*surfaceSpacing.y)));
        surfaceWorld=(modelMatrix*vec4(transformed,1.)).xyz;`);
      shader.fragmentShader='uniform sampler2D surfaceMap,terrainMap; uniform vec4 sectionPlane; uniform float sectionEnabled,surfaceTime,surfaceRain,turbidity; varying vec2 surfaceUv; varying vec3 surfaceWorld,surfaceNormal;\n'+shader.fragmentShader
        .replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          vec4 surfaceState=texture2D(surfaceMap,surfaceUv),surfaceBed=texture2D(terrainMap,surfaceUv);
          if(surfaceState.x<0.0001||surfaceBed.z<.5)discard;
          if(sectionEnabled>.5&&surfaceBed.z<1.5&&dot(sectionPlane.xyz,surfaceWorld)+sectionPlane.w<0.)discard;`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          float surfaceDepth=surfaceState.x;vec2 flowVelocity=surfaceState.yz/max(surfaceDepth,.0001);
          diffuseColor.rgb=mix(vec3(.64,.73,.69),vec3(.28,.43,.35),1.-exp(-surfaceDepth*5.));
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.41,.33,.21),turbidity*(1.-exp(-surfaceDepth*12.)));
          diffuseColor.a*=smoothstep(.0001,.003,surfaceDepth)*(.3+.7*(1.-exp(-surfaceDepth*25.)));`)
        .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          normal=normalize(surfaceNormal);
          float moving=clamp(length(flowVelocity),0.,1.);
          float detail=sin(dot(surfaceWorld.xz,normalize(flowVelocity+vec2(.0001)))*40.-surfaceTime*length(flowVelocity)*40.);
          float capillary=sin(surfaceWorld.x*75.+surfaceWorld.z*69.-surfaceTime*16.)*min(surfaceRain/100.,1.);
          normal=normalize(normal+vec3(detail*moving+capillary*.4,0.,-detail*moving)*.009);`)
        .replace('#include <opaque_fragment>',`float fresnel=.02+.98*pow(1.-abs(dot(normal,normalize(vViewPosition))),5.);
          outgoingLight=mix(outgoingLight,vec3(.73,.81,.82),fresnel*.45);
          float foam=smoothstep(.08,.5,surfaceState.w);outgoingLight=mix(outgoingLight,vec3(.85,.87,.8),foam*.6);
          #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>`surface-saint-venant-v1-${low}`;
    return {state,texture,terrain,uniforms,material,geometry:surfaceGeometry(grid)};
  },[grid,low]);
  useEffect(()=>()=>{resources.texture.dispose();resources.terrain.dispose();resources.material.dispose();resources.geometry.dispose();},[resources]);
  const runtime=useRef<{gpu?:GpuSurfaceWater;worker?:Worker;busy:boolean;state:Float32Array;lastSecond:number;elapsed:number;workerElapsed:number}>();
  useEffect(()=>{
    const r={busy:false,state:resources.state,lastSecond:-1,elapsed:0,workerElapsed:0} as NonNullable<typeof runtime.current>;
    if(gpuCapable){try{r.gpu=new GpuSurfaceWater(gl,grid);}catch(error){console.warn('[surface-water] CPU worker fallback',error);setForcedCpu(true);return;}}
    if(!r.gpu){
      r.worker=new Worker(new URL('./surfaceWater.worker.ts',import.meta.url),{type:'module'});
      r.worker.postMessage({kind:'init',grid});
      r.worker.onmessage=({data})=>{r.state=data.state;resources.texture.image.data.set(r.state);resources.texture.needsUpdate=true;r.busy=false;scene.userData.surfaceStats={...data.stats,backend:'CPU worker',solverMs:data.ms,gpuMs:null,nx,nz};invalidate();};
      r.worker.onerror=()=>{r.busy=false;scene.userData.surfaceStats={backend:'unavailable',error:'Surface worker failed'};};
    }
    runtime.current=r;
    scene.userData.surfaceSample=(x:number,z:number)=>{
      const ix=Math.max(0,Math.min(nx-1,Math.floor((x-grid.x0)/grid.dx))),iz=Math.max(0,Math.min(nz-1,Math.floor((z-grid.z0)/grid.dz))),i=(iz*nx+ix)*4,h=r.state[i];
      return {depth:h,height:grid.terrain[i]+h,vx:h>1e-7?r.state[i+1]/h:0,vz:h>1e-7?r.state[i+2]/h:0};
    };
    return ()=>{r.gpu?.dispose();r.worker?.terminate();runtime.current=undefined;delete scene.userData.surfaceSample;delete scene.userData.surfaceStats;delete scene.userData.surfaceRender;delete scene.userData.surfaceRender;};
  },[grid,resources,gl,gpuCapable,scene,invalidate]);
  resources.uniforms.sectionEnabled.value=plane?1:0;
  if(plane)resources.uniforms.sectionPlane.value.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
  resources.uniforms.surfaceRain.value=(physics.frame?.rain??0)*3.6e6;
  resources.uniforms.turbidity.value=Math.min(.8,(1-physics.config.values.inletOpen.value)*.5+physics.config.values.sediment.value*2);
  useFrame((_,delta)=>{
    const r=runtime.current,f=frame.current;if(!r||!f||document.hidden)return;
    const started=performance.now(),targets=surfaceTargets(f),changed=f.second!==r.lastSecond;
    const reset=changed&&(f.second<r.lastSecond||Math.abs(f.second-r.lastSecond)>90);
    r.elapsed+=delta;r.workerElapsed+=delta;resources.uniforms.surfaceTime.value+=Math.min(.05,delta);
    const impulses=(scene.userData.rainImpulses??[]) as {x:number;z:number;strength:number}[];
    if(r.gpu){
      r.state=r.gpu.read();if(reset)r.state.fill(0);
      if(changed||r.elapsed>=.1){
        impulses.splice(0).forEach(p=>rainImpulse(grid,r.state,p.x,p.z,p.strength));
        const stats=reconcileSurface(grid,r.state,targets.bedVolume,targets.gutterVolume,targets.depth);
        r.gpu.upload(r.state);r.gpu.setSources(surfaceSources(grid,r.state,physics.config,f));r.elapsed=0;
        scene.userData.surfaceStats={...stats,backend:'WebGL2 float',nx,nz};
      }
      r.gpu.step(Math.min(delta,.05));resources.uniforms.surfaceMap.value=r.gpu.texture;
      const stats=scene.userData.surfaceStats??{};stats.solverMs=performance.now()-started;stats.gpuMs=r.gpu.gpuMs;stats.submissionMs=r.gpu.submissionMs;scene.userData.surfaceStats=stats;
    }else if(r.worker&&!r.busy&&(changed||r.workerElapsed>=.05)){
      r.busy=true;r.worker.postMessage({kind:'step',seconds:r.workerElapsed,reset,source:surfaceSources(grid,r.state,physics.config,f),impulses:impulses.splice(0),...targets});r.workerElapsed=0;
    }
    scene.userData.surfaceRender={texture:resources.uniforms.surfaceMap.value,x0:grid.x0,z0:grid.z0,width:grid.nx*grid.dx,height:grid.nz*grid.dz};
    scene.userData.surfaceRender={texture:resources.uniforms.surfaceMap.value,x0:grid.x0,z0:grid.z0,width:grid.nx*grid.dx,height:grid.nz*grid.dz};
    r.lastSecond=f.second;
    if(targets.bedVolume>0||targets.gutterVolume>0||f.rain>0)invalidate();
  });
  return <mesh name="surface-water-grid" geometry={resources.geometry} material={resources.material} frustumCulled={false} userData={{nx,nz,displaySolver:true}}/>;
}
