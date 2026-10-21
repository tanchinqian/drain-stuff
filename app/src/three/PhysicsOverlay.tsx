import { useMemo, useEffect } from 'react';
import { Line } from '@react-three/drei';
import {
  ExtrudeGeometry,
  Shape,
  Group,
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Plane,
} from 'three';
import type { PartId } from '../api/types';
import type { PhysicsConfig } from '../simulation/physics/config';
import type { PhysicsFrame } from '../simulation/physics/engine';
import { drainDesign } from '../simulation/physics/design';
import { channelPrism } from './physicsGeometry';
import { WaterMaterial, Seepage } from './WaterEffects';
import SectionCaps from './SectionCaps';
import { flowSpeed } from './visibility';
import FlowTrace from './FlowTrace';
import ObstacleWater from './ObstacleWater';
import BallisticFlow from './BallisticFlow';
import {outfallJet,outfallPose} from './flowPhysics';
import { flowVisual } from './sceneMetrics';
function FluidCap({
  geometry,
  plane,
  position = [0, 0, 0],
  order,
}: {
  geometry: BufferGeometry;
  plane: Plane;
  position?: [number, number, number];
  order: number;
}) {
  const group = useMemo(() => {
    const group = new Group(),
      material = new MeshStandardMaterial({ color: '#88afa5', roughness: 0.4 });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    group.add(mesh);
    return group;
  }, [geometry, position[0], position[1], position[2]]);
  useEffect(
    () => () => {
      (group.children[0] as Mesh<BufferGeometry, MeshStandardMaterial>).material.dispose();
    },
    [group],
  );
  return <SectionCaps group={group} plane={plane} orderBase={order} />;
}
const cappedLanding=(h:number,upstream:number)=>Math.min(upstream,Math.max(.002,h));
export interface ModelPhysics {
  config: PhysicsConfig;
  frame?: PhysicsFrame;
  amendment?: { depth: number; dose: string; batch: string };
}
export function PhysicsWater({
  id,
  physics,
  plane,
  low = false,
}: {
  id: PartId;
  physics: ModelPhysics;
  plane?: Plane;
  low?: boolean;
}) {
  const d = drainDesign(physics.config),
    v = physics.config.values,
    f = physics.frame;
  const h = f?.ponding ?? 0,
    fill = f?.pipeFill ?? 0,
    r = d.pipeDiameter / 2;
  const pose=outfallPose(d,physics.config);
  const pipeLength = id === 'outfall' ? pose.length : d.length;
  const geometry = useMemo(
    () =>
      id === 'ponding'
        ? channelPrism(d.length, d.bedWidth, Math.max(0.000001, h), d.sideSlope)
        : undefined,
    [id, d.length, d.bedWidth, h, d.sideSlope],
  );
  const pipeGeometry = useMemo(() => {
    if (id !== 'underdrain' && id !== 'outfall') return;
    const angle = Math.acos(1 - 2 * Math.min(1,Math.max(0.000001, fill))),
      shape = new Shape();
    for (let i = 0; i <= 32; i++) {
      const a = -angle + (2 * angle * i) / 32;
      const z = r * Math.sin(a),
        y = -r * Math.cos(a);
      if (!i) shape.moveTo(z, y);
      else shape.lineTo(z, y);
    }
    shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth: pipeLength, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    g.translate(-pipeLength / 2, 0, 0);
    if(id==='underdrain'){
      const pos=g.getAttribute('position');
      for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)-pos.getX(i)*v.pipeSlope.value);
      pos.needsUpdate=true;g.computeVertexNormals();
    }
    return g;
  }, [id, fill, r, pipeLength, v.pipeSlope.value]);
  useEffect(
    () => () => {
      geometry?.dispose();
      pipeGeometry?.dispose();
    },
    [geometry, pipeGeometry],
  );
  if (!f) return null;
  const water = (depth: number, velocity = 0) => (
    <WaterMaterial
      depth={depth}
      design={d}
      rain={id === 'ponding' ? f.rain : 0}
      plane={plane}
      low={low}
      velocity={velocity}
      fullPipe={(id==='outfall'||id==='underdrain')&&fill>=.999}
      flow={
        id === 'outfall' ||
        id === 'underdrain' ||
        id === 'overflow' ||
        id === 'inlet' ||
        id === 'sock' ||
        id === 'pretreat'
      }
    />
  );
  if (id === 'ponding')
    return (
      <group>
        {h > 0.000001 && (
          <mesh name="ponded-water" geometry={geometry} visible={false}>
            {water(h)}
          </mesh>
        )}
        {h > 0 && plane && geometry && <FluidCap geometry={geometry} plane={plane} order={10000} />}
      </group>
    );
  if(id==='checkdam')return <ObstacleWater physics={physics} plane={plane} low={low}/>;
  if (id === 'media')
    return (
      <FlowTrace
        name="soil-infiltration"
        q={f.flux.infiltration}
        velocity={f.flux.infiltration / Math.max(0.001, d.length * d.bedWidth)}
        low={low}
        plane={plane}
        points={[
          [0, 0, 0],
          [0, -d.mulchDepth - d.mediaDepth, 0],
        ]}
      />
    );
  if (id === 'transition')
    return (
      <FlowTrace
        name="transition-flow"
        q={f.flux.percolation}
        velocity={f.flux.percolation / Math.max(0.001, d.length * d.bedWidth)}
        low={low}
        plane={plane}
        points={[
          [0, -d.mulchDepth - d.mediaDepth, 0],
          [0, d.bottomY + d.gravelDepth, 0],
        ]}
      />
    );
  if (id === 'drainage')
    return (
      <>
        <Seepage physics={physics} low={low} plane={plane} />
        <FlowTrace
          name="gravel-flow"
          q={f.flux.drain}
          velocity={f.pipeVelocity}
          low={low}
          plane={plane}
          points={[
            [0, d.bottomY + d.gravelDepth, 0],
            [0, d.pipeY, 0],
          ]}
        />
      </>
    );
  if (id === 'underdrain' || id === 'outfall') {
    const x = id === 'outfall' ? d.length / 2 + pose.length/2 : 0;
    const pipeY=id==='outfall'?pose.y:d.pipeY;
    const jet=outfallJet(d,physics.config,f);
    const tail = Math.max(0, v.tailwater.value - v.outfallInvert.value);
    return (
      <group>
        {fill > 0.000001 && (
          <mesh
            name={'pipe-water-' + id}
            geometry={pipeGeometry}
            position={[x, pipeY, 0]}
            userData={{ fill, velocity: f.pipeVelocity, pressurised: fill>=.999 }}
          >
            {water(fill * d.pipeDiameter, f.pipeVelocity)}
          </mesh>
        )}
        {fill > 0 && plane && pipeGeometry && (
          <FluidCap
            geometry={pipeGeometry}
            plane={plane}
            position={[x, pipeY, 0]}
            order={id === 'outfall' ? 10200 : 10100}
          />
        )}
        {id === 'outfall' && jet.active && <BallisticFlow name="outfall-jet" start={jet.start} landing={jet.landing} velocity={jet.velocity} q={jet.discharge} plane={plane} low={low}/>}
        {id === 'outfall' && tail > 0 && (
          <group>
            <mesh position={[pose.x + .25, pipeY - r + tail / 2, 0]}>
              <boxGeometry args={[0.7, tail, 0.9]} />
              {water(tail)}
            </mesh>
          </group>
        )}
      </group>
    );
  }
  if (id === 'overflow' && f.flux.overflow > 0)
    return h > v.crest.value ? (
      <mesh name="overflow-spill" position={[d.length / 2 - 0.5, v.crest.value, -d.bedWidth / 3]}>
        <cylinderGeometry args={[0.17, 0.14, Math.max(0.002, h - v.crest.value), 24, 1, true]} />
        {water(Math.max(0.002, h - v.crest.value), f.flux.overflow / (0.32 * 0.01))}
      </mesh>
    ) : (
      <group name="overflow-spill">
        <FlowTrace
          name="upstream-overflow"
          q={f.flux.overflow}
          velocity={flowSpeed(f.flux.overflow)}
          low={low}
          points={[
            [-d.length / 2 - d.catchment.roadWidth - 0.65, d.catchment.kerbHeight, 0],
            [-d.length / 2 - d.catchment.roadWidth - 0.9, d.catchment.kerbHeight - 0.05, 0],
          ]}
        />
      </group>
    );
  if (id === 'inlet' || id === 'pretreat' || id === 'sock') {
    const level = f.network.find((n) => n.id === 'kerb flow')?.depth ?? 0;
    const x =
      id === 'inlet'
        ? -d.length / 2 - 0.4
        : id === 'pretreat'
          ? -d.length / 2 + 0.35
          : -d.length / 2 + 0.8;
    const q = f.flux.inlet,
      width = flowVisual(q, flowSpeed(q)).width;
    return (
      <group>
        {level > 0 && id === 'inlet' && (
          <mesh position={[x - 0.35, level / 2 - 0.12, 0]}>
            <boxGeometry args={[0.7, level, 0.9]} />
            {water(level)}
          </mesh>
        )}
        {id==='inlet'&&q>0&&<mesh name="kerb-opening-sheet" position={[-d.length/2-.4,d.catchment.kerbHeight+level+.002,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.78,Math.min(.5,width)]}/>{water(.005,flowSpeed(q))}</mesh>}
        {id==='inlet'&&q>0&&cappedLanding(h,d.catchment.kerbHeight+level)<d.catchment.kerbHeight+level&&
          <BallisticFlow name="kerb-lip-fall" start={[-d.length/2-.02,d.catchment.kerbHeight+level,0]} landing={cappedLanding(h,d.catchment.kerbHeight+level)} velocity={Math.min(1,Math.max(.1,flowSpeed(q)))} q={q} plane={plane} low={low}/>}
        {q > 0 && (
          <mesh
            name="inlet-stream"
            userData={{ velocity: flowSpeed(q) }}
            position={[x, Math.max(0.002, h), 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[id === 'inlet' ? 1.1 : 0.8, width]} />
            {water(0.005, flowSpeed(q))}
          </mesh>
        )}
        {id === 'sock' && (
          <FlowTrace
            name="bed-surface-flow"
            q={q}
            velocity={flowSpeed(q)}
            low={low}
            plane={plane}
            points={[
              [x, Math.max(0.004, h), 0],
              [-d.length / 4, Math.max(0.004, h), 0],
              [0, Math.max(0.004, h), 0],
            ]}
          />
        )}
      </group>
    );
  }
  return null;
}
export function DimensionLines({ config }: { config: PhysicsConfig }) {
  const v = config.values,
    l = v.length.value,
    w = v.width.value,
    bottom =
      config.kind === 'inlet'
        ? 0
        : -v.mediaDepth.value - v.transitionDepth.value - v.gravelDepth.value - 0.05,
    top = config.kind === 'inlet' ? v.crest.value : 0,
    z = w / 2 + 0.3;
  return (
    <group>
      <Line
        points={[
          [-l / 2, bottom - 0.2, z],
          [l / 2, bottom - 0.2, z],
        ]}
        color="#5e564b"
        lineWidth={1}
      />
      {[-l / 2, l / 2].map((x) => (
        <Line
          key={x}
          points={[
            [x, bottom - 0.1, z],
            [x, bottom - 0.3, z],
          ]}
          color="#5e564b"
        />
      ))}
      <Line
        points={[
          [l / 2 + 0.25, top, -w / 2],
          [l / 2 + 0.25, bottom, -w / 2],
        ]}
        color="#5e564b"
      />
      <Line
        points={[
          [-l / 2, 0, -w / 2],
          [-l / 2 - 0.6, 0, -w / 2],
        ]}
        color="#5e564b"
      />
    </group>
  );
}
