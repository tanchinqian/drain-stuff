import { useMemo, useEffect } from 'react';
import { Html, Line } from '@react-three/drei';
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
import { StormRain, WaterMaterial, Seepage } from './WaterEffects';
import SectionCaps from './SectionCaps';
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
  const pipeLength = id === 'outfall' ? 1.5 : d.length;
  const geometry = useMemo(
    () =>
      id === 'ponding'
        ? channelPrism(d.length, d.bedWidth, Math.max(0.000001, h), d.sideSlope)
        : undefined,
    [id, d.length, d.bedWidth, h, d.sideSlope],
  );
  const pipeGeometry = useMemo(() => {
    if (id !== 'underdrain' && id !== 'outfall') return;
    const angle = Math.acos(1 - 2 * Math.max(0.000001, fill)),
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
    return g;
  }, [id, fill, r, pipeLength]);
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
        <StormRain physics={physics} low={low} plane={plane} />
        {h > 0.000001 && (
          <mesh name="ponded-water" geometry={geometry}>
            {water(h)}
          </mesh>
        )}
        {h > 0 && plane && geometry && <FluidCap geometry={geometry} plane={plane} order={10000} />}
      </group>
    );
  if (id === 'media' && physics.amendment)
    return (
      <Html position={[0, -0.05, d.bedWidth / 2 + 0.2]} center>
        <span className="dimension-label">
          Compost amended · {(physics.amendment.depth * 1000).toFixed(0)} mm ·{' '}
          {physics.amendment.dose}
        </span>
      </Html>
    );
  if (id === 'drainage') return <Seepage physics={physics} low={low} />;
  if (id === 'underdrain' || id === 'outfall') {
    const x = id === 'outfall' ? d.length / 2 + 0.75 : 0;
    const tail = Math.max(0, v.tailwater.value - v.outfallInvert.value);
    return (
      <group>
        {fill > 0.000001 && (
          <mesh
            name={'pipe-water-' + id}
            geometry={pipeGeometry}
            position={[x, d.pipeY, 0]}
            userData={{ fill, velocity: f.pipeVelocity }}
          >
            {water(fill * d.pipeDiameter, f.pipeVelocity)}
          </mesh>
        )}
        {fill > 0 && plane && pipeGeometry && (
          <FluidCap
            geometry={pipeGeometry}
            plane={plane}
            position={[x, d.pipeY, 0]}
            order={id === 'outfall' ? 10200 : 10100}
          />
        )}
        {id === 'outfall' && f.flux.outfall > 0 && (
          <mesh position={[d.length / 2 + 1.65, d.pipeY - 0.08, 0]} rotation={[0, 0, -0.45]}>
            <cylinderGeometry
              args={[
                Math.min(r, Math.sqrt(f.flux.outfall / Math.max(0.01, f.pipeVelocity) / Math.PI)),
                0.01,
                0.28,
                low ? 8 : 16,
              ]}
            />
            {water(0.05, f.pipeVelocity)}
          </mesh>
        )}
        {id === 'outfall' && tail > 0 && (
          <group>
            <mesh position={[d.length / 2 + 1.8, d.pipeY - r + tail / 2, 0]}>
              <boxGeometry args={[0.7, tail, 0.9]} />
              {water(tail)}
            </mesh>
            <Html position={[d.length / 2 + 1.8, d.pipeY + tail + 0.12, 0]}>
              <span className="dimension-label">
                Tailwater {tail.toFixed(2)} m{tail >= d.pipeDiameter ? ' · submerged' : ''}
              </span>
            </Html>
          </group>
        )}
      </group>
    );
  }
  if (id === 'overflow' && f.flux.overflow > 0)
    return (
      <mesh position={[d.length / 2 - 0.5, v.crest.value, -d.bedWidth / 3]}>
        <cylinderGeometry args={[0.17, 0.14, Math.max(0.002, h - v.crest.value), 24, 1, true]} />
        {water(Math.max(0.002, h - v.crest.value), f.flux.overflow / (0.32 * 0.01))}
      </mesh>
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
      width = Math.min(0.9, Math.max(0.02, Math.sqrt(q * 60000) * 0.08));
    return (
      <group>
        {level > 0 && id === 'inlet' && (
          <mesh position={[x - 0.35, level / 2 - 0.12, 0]}>
            <boxGeometry args={[0.7, level, 0.9]} />
            {water(level)}
          </mesh>
        )}
        {q > 0 && (
          <mesh position={[x, Math.max(0.002, h), 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[id === 'inlet' ? 1.1 : 0.55, width]} />
            {water(0.005, q / (width * 0.005))}
          </mesh>
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
      <Html position={[0, bottom - 0.24, z]} center>
        <span className="dimension-label">{l.toFixed(2)} m</span>
      </Html>
      <Line
        points={[
          [l / 2 + 0.25, top, -w / 2],
          [l / 2 + 0.25, bottom, -w / 2],
        ]}
        color="#5e564b"
      />
      <Html position={[l / 2 + 0.3, (top + bottom) / 2, -w / 2]}>
        <span className="dimension-label">{(top - bottom).toFixed(2)} m</span>
      </Html>
      <Line
        points={[
          [-l / 2, 0, -w / 2],
          [-l / 2 - 0.6, 0, -w / 2],
        ]}
        color="#5e564b"
      />
      <Html position={[-l / 2 - 0.6, 0, -w / 2]} center>
        <span className="dimension-label">RL 0.00 m</span>
      </Html>
    </group>
  );
}
