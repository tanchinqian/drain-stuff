import {WebGLRenderTarget,FloatType,RGBAFormat,NearestFilter,DataTexture,RawShaderMaterial,GLSL3,Scene,Mesh,PlaneGeometry,OrthographicCamera,Vector2,type WebGLRenderer} from 'three';
import {stableStep,type SurfaceGrid} from './surfaceWater';
const vertex=`precision highp float; in vec3 position; in vec2 uv; out vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment=`precision highp float; precision highp int;
in vec2 vUv; out vec4 colour;
uniform sampler2D stateMap,terrainMap,sourceMap;
uniform ivec2 dimensions; uniform vec2 spacing; uniform float dt;
const float g=9.81; const float dry=1e-7;
vec3 face(ivec2 p,ivec2 offset,vec2 n){
  vec4 a=texelFetch(stateMap,p,0),ta=texelFetch(terrainMap,p,0);
  ivec2 q=p+offset; bool outside=any(lessThan(q,ivec2(0)))||any(greaterThanEqual(q,dimensions));
  vec4 tb=outside?ta:texelFetch(terrainMap,q,0), b=outside?a:texelFetch(stateMap,q,0);
  vec2 u=a.x>dry?a.yz/a.x:vec2(0),v=b.x>dry?b.yz/b.x:vec2(0);
  if(outside||tb.z==0.||(ta.z==1.)!=(tb.z==1.)){b=a;tb=ta;v=u-2.*dot(u,n)*n;}
  float top=max(ta.x,tb.x),hl=max(0.,a.x+ta.x-top),hr=max(0.,b.x+tb.x-top);
  float un=dot(u,n),vn=dot(v,n),speed=max(abs(un)+sqrt(g*hl),abs(vn)+sqrt(g*hr));
  vec3 left=vec3(hl*un,hl*u*un+.5*g*hl*hl*n),right=vec3(hr*vn,hr*v*vn+.5*g*hr*hr*n);
  vec3 flux=.5*(left+right-speed*(vec3(hr,hr*v)-vec3(hl,hl*u)));
  flux.yz+=.5*g*(a.x*a.x-hl*hl)*n; return flux;
}
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);vec4 old=texelFetch(stateMap,p,0),terrain=texelFetch(terrainMap,p,0);
  if(terrain.z==0.){colour=vec4(0);return;}
  vec3 s=old.xyz-dt*((face(p,ivec2(1,0),vec2(1,0))+face(p,ivec2(-1,0),vec2(-1,0)))/spacing.x+(face(p,ivec2(0,1),vec2(0,1))+face(p,ivec2(0,-1),vec2(0,-1)))/spacing.y);
  float before=max(0.,s.x),after=max(0.,before+dt*texelFetch(sourceMap,p,0).x);
  s.yz*=before>dry?min(1.,after/before):0.;
  if(after<=dry){colour=vec4(after,0,0,0);return;}
  float speed=length(s.yz)/after,friction=1.+dt*g*terrain.y*terrain.y*speed/pow(after,4./3.);
  colour=vec4(after,s.yz/friction,min(1.,max(old.w*exp(-dt*2.),speed/sqrt(g*after)*.12)));
}`;
export function floatTexture(data:Float32Array,nx:number,nz:number){
  const t=new DataTexture(new Float32Array(data),nx,nz,RGBAFormat,FloatType);t.minFilter=t.magFilter=NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;
}
export class GpuSurfaceWater {
  private targets:WebGLRenderTarget[];private index=0;private scene=new Scene();private camera=new OrthographicCamera(-1,1,1,-1,0,1);
  private quad:Mesh<PlaneGeometry,RawShaderMaterial>;private stepMaterial:RawShaderMaterial;private copyMaterial:RawShaderMaterial;
  private stateInput:DataTexture;private terrain:DataTexture;private source:DataTexture;
  readonly readback:Float32Array;submissionMs=0;gpuMs:number|null=null;
  private ext: {TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number}|null;
  private queries:WebGLQuery[]=[];
  constructor(private renderer:WebGLRenderer,readonly grid:SurfaceGrid){
    if(!renderer.capabilities.isWebGL2||!renderer.extensions.has('EXT_color_buffer_float'))throw new Error('WebGL2 float render targets unavailable');
    const {nx,nz}=grid;this.readback=new Float32Array(nx*nz*4);
    this.targets=[0,1].map(()=>new WebGLRenderTarget(nx,nz,{type:FloatType,format:RGBAFormat,minFilter:NearestFilter,magFilter:NearestFilter,depthBuffer:false,stencilBuffer:false}));
    this.stateInput=floatTexture(this.readback,nx,nz);this.terrain=floatTexture(grid.terrain,nx,nz);this.source=floatTexture(new Float32Array(this.readback.length),nx,nz);
    this.stepMaterial=new RawShaderMaterial({glslVersion:GLSL3,vertexShader:vertex,fragmentShader:fragment,depthTest:false,depthWrite:false,uniforms:{stateMap:{value:null},terrainMap:{value:this.terrain},sourceMap:{value:this.source},dimensions:{value:new Vector2(nx,nz)},spacing:{value:new Vector2(grid.dx,grid.dz)},dt:{value:.001}}});
    this.copyMaterial=new RawShaderMaterial({glslVersion:GLSL3,vertexShader:vertex,fragmentShader:'precision highp float; in vec2 vUv; out vec4 colour; uniform sampler2D image; void main(){colour=texture(image,vUv);}',depthTest:false,depthWrite:false,uniforms:{image:{value:this.stateInput}}});
    this.quad=new Mesh(new PlaneGeometry(2,2),this.copyMaterial);this.quad.frustumCulled=false;this.scene.add(this.quad);
    this.ext=renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2');this.upload(this.readback);
  }
  get texture(){return this.targets[this.index].texture;}
  get terrainTexture(){return this.terrain;}
  private draw(material:RawShaderMaterial,target:WebGLRenderTarget){
    const previous=this.renderer.getRenderTarget();this.quad.material=material;this.renderer.setRenderTarget(target);this.renderer.render(this.scene,this.camera);this.renderer.setRenderTarget(previous);
  }
  upload(state:Float32Array){this.stateInput.image.data.set(state);this.stateInput.needsUpdate=true;this.draw(this.copyMaterial,this.targets[this.index]);}
  setSources(source:Float32Array){this.source.image.data.set(source);this.source.needsUpdate=true;}
  read(){this.renderer.readRenderTargetPixels(this.targets[this.index],0,0,this.grid.nx,this.grid.nz,this.readback);return this.readback;}
  step(seconds:number){
    const started=performance.now(),ctx=this.renderer.getContext() as WebGL2RenderingContext;
    // Readback also supplies the next frame's global CFL bound. Half the bound guards growth within this batch.
    const limit=stableStep(this.grid,this.readback,.008)*.5;
    const steps=Math.max(1,Math.min(24,Math.ceil(Math.min(seconds,.05)/limit))),dt=Math.min(limit,seconds/steps);
    let query:WebGLQuery|null=null;if(this.ext&&this.queries.length<4){query=ctx.createQuery();ctx.beginQuery(this.ext.TIME_ELAPSED_EXT,query);}
    for(let i=0;i<steps;i++){
      this.stepMaterial.uniforms.stateMap.value=this.texture;this.stepMaterial.uniforms.dt.value=dt;
      const next=1-this.index;this.draw(this.stepMaterial,this.targets[next]);this.index=next;
    }
    if(query&&this.ext){ctx.endQuery(this.ext.TIME_ELAPSED_EXT);this.queries.push(query);}
    if(this.ext&&this.queries[0]&&ctx.getQueryParameter(this.queries[0],ctx.QUERY_RESULT_AVAILABLE)){
      const q=this.queries.shift()!;if(!ctx.getParameter(this.ext.GPU_DISJOINT_EXT))this.gpuMs=ctx.getQueryParameter(q,ctx.QUERY_RESULT)/1e6;ctx.deleteQuery(q);
    }
    this.submissionMs=performance.now()-started;return steps*dt;
  }
  dispose(){this.targets.forEach(t=>t.dispose());this.stateInput.dispose();this.terrain.dispose();this.source.dispose();this.stepMaterial.dispose();this.copyMaterial.dispose();this.quad.geometry.dispose();const ctx=this.renderer.getContext() as WebGL2RenderingContext;this.queries.forEach(q=>ctx.deleteQuery(q));}
}
