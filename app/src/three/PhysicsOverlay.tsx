import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSimulation } from '../simulation/physics/store';
import { Edges, Html, Line } from '@react-three/drei';
import {
  ExtrudeGeometry,
  Shape,
  DoubleSide,
  Object3D,
  type InstancedMesh,
  type Plane,
} from 'three';
import type { PartId } from '../api/types';
import type { PhysicsConfig } from '../simulation/physics/config';
import type { PhysicsFrame } from '../simulation/physics/engine';
import { channelPrism } from './physicsGeometry';
export interface ModelPhysics {
  config: PhysicsConfig;
  frame?: PhysicsFrame;
  exaggerate?: boolean;
}
export function PhysicsWater({
  id,
  physics,
  plane,
}: {
  id: PartId;
  physics: ModelPhysics;
  plane?: Plane;
}) {
  const v = physics.config.values,
    f = physics.frame,
    l = v.length.value,
    w = v.width.value;
  const h = (f?.ponding ?? 0) * (physics.exaggerate ? 5 : 1);
  const geometry = useMemo(
    () => channelPrism(l, w, Math.max(0.00001, h), v.sideSlope.value),
    [l, w, h, v.sideSlope.value],
  );
  const fill = Math.min(
    1,
    Math.max(0, (f?.gravelHead ?? 0) - v.drainOffset.value) / v.pipeDiameter.value,
  );
  const pipeGeometry = useMemo(() => {
    const r = v.pipeDiameter.value / 2,
      angle = Math.acos(1 - 2 * Math.max(0.00001, fill)),
      shape = new Shape();
    for (let i = 0; i <= 32; i++) {
      const a = -angle + (2 * angle * i) / 32;
      const x = r * Math.sin(a),
        y = -r * Math.cos(a);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth: l, bevelEnabled: false });
    g.rotateY(Math.PI / 2);
    g.translate(-l / 2, 0, 0);
    return g;
  }, [fill, l, v.pipeDiameter.value]);
  useEffect(
    () => () => {
      geometry.dispose();
      pipeGeometry.dispose();
    },
    [geometry, pipeGeometry],
  );
  const bottom = -v.mediaDepth.value - v.transitionDepth.value - v.gravelDepth.value,
    pipeY =
      physics.config.kind === 'inlet' ? v.pipeDiameter.value / 2 : bottom + v.gravelDepth.value / 2;
  if (!f) return null;
  if (id === 'ponding') {
    const wet = h > 0.0001 || f.flux.infiltration > 1e-9;
    // The thin wetting cue sits above decorative mulch; it is not additional water storage.
    const surface = Math.max(physics.config.kind === 'inlet' ? 0 : 0.052, h) + 0.003;
    return (
      <group>
        {f.rain > 0 && <WaterParticles mode="rain" physics={physics} />}
        {h > 0.0001 && (
          <mesh geometry={geometry}>
            <meshBasicMaterial
              color="#61cce9"
              transparent
              opacity={0.65}
              depthWrite={false}
              side={DoubleSide}
              clippingPlanes={plane ? [plane] : []}
            />
            <Edges color="#2f2b26" />
          </mesh>
        )}
        {wet && (
          <mesh position={[0, surface, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[l, w]} />
            <meshBasicMaterial
              color="#61cce9"
              transparent
              opacity={h > 0.05 ? 0.65 : 0.35}
              depthWrite={false}
              side={DoubleSide}
              clippingPlanes={plane ? [plane] : []}
            />
          </mesh>
        )}
        {h > 0.0001 && plane?.normal.z !== undefined && Math.abs(plane.normal.z) > 0 && (
          <mesh position={[0, h / 2, plane.constant / -plane.normal.z + 0.003]}>
            <planeGeometry args={[l, h]} />
            <meshBasicMaterial
              color="#61cce9"
              transparent
              opacity={0.55}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        )}
        {wet &&
          Array.from({ length: 5 }, (_, i) => (
            <Line
              key={i}
              points={[
                [-l / 2, surface, -w / 2 + (i * w) / 4],
                [l / 2, surface, -w / 2 + (i * w) / 4],
              ]}
              color="#2f2b26"
              lineWidth={0.8}
            />
          ))}
      </group>
    );
  }
  if (id === 'media' && f.flux.infiltration > 1e-9)
    return <WaterParticles mode="infiltration" physics={physics} />;
  if (id === 'underdrain' && fill > 0.001)
    return (
      <mesh geometry={pipeGeometry} position={[0, pipeY, 0]}>
        <meshStandardMaterial color="#61cce9" clippingPlanes={plane ? [plane] : []} />
      </mesh>
    );
  if (id === 'outfall' && v.tailwater.value > 0)
    return (
      <mesh position={[l / 2 + 1.7, pipeY + v.tailwater.value / 2, 0]}>
        <boxGeometry args={[0.5, v.tailwater.value, 1.5]} />
        <meshStandardMaterial color="#61cce9" transparent opacity={0.4} />
        <Edges color="#2f2b26" />
      </mesh>
    );
  const discharge =
    id === 'inlet'
      ? f.flux.inlet
      : id === 'outfall'
        ? f.flux.drain
        : id === 'overflow'
          ? f.flux.overflow
          : 0;
  if (discharge <= 1e-9) return null;
  const x = id === 'inlet' ? -l / 2 - 0.6 : id === 'overflow' ? l / 2 - 0.5 : l / 2 + 0.3,
    y = id === 'outfall' ? pipeY : id === 'overflow' ? v.crest.value : 0.2;
  return (
    <group>
      <WaterParticles
        mode={id === 'inlet' ? 'inlet' : id === 'overflow' ? 'overflow' : 'outlet'}
        physics={physics}
      />
      <Line
        points={[
          [x, y, 0.55],
          [x + 0.6, y, 0.55],
          [x + 0.48, y + 0.06, 0.55],
          [x + 0.6, y, 0.55],
          [x + 0.48, y - 0.06, 0.55],
        ]}
        color={id === 'overflow' ? '#8e3a2e' : '#2f2b26'}
        lineWidth={Math.min(7, 1 + Math.sqrt(discharge * 60000) / 3)}
      />
    </group>
  );
}
// Particle count and speed illustrate the current flux; particles are not parcels in the solver.
function WaterParticles({
  mode,
  physics,
}: {
  mode: 'rain' | 'infiltration' | 'inlet' | 'outlet' | 'overflow';
  physics: ModelPhysics;
}) {
  const mesh = useRef<InstancedMesh>(null),
    phase = useRef(0),
    dummy = useMemo(() => new Object3D(), []);
  const playing = useSimulation((s) => s.playing),
    invalidate = useThree((s) => s.invalidate);
  const f = physics.frame!,
    v = physics.config.values,
    l = v.length.value,
    w = v.width.value;
  const count = mode === 'rain' ? Math.max(12, Math.min(100, Math.round(f.rain * 3.6e6))) : 28;
  useEffect(() => {
    phase.current = f.second * 0.03;
    invalidate();
  }, [f.second, playing, invalidate]);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    if (playing && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      phase.current += delta * 0.8;
      invalidate();
    }
    for (let i = 0; i < count; i++) {
      const t = (phase.current + i * 0.61803398875) % 1;
      const x = (((i * 37) % 101) / 101 - 0.5) * l,
        z = (((i * 61) % 97) / 97 - 0.5) * w;
      const pipeY =
        physics.config.kind === 'inlet'
          ? v.pipeDiameter.value / 2
          : -v.mediaDepth.value - v.transitionDepth.value - v.gravelDepth.value / 2;
      if (mode === 'rain') dummy.position.set(x, 0.15 + (1 - t) * 1.5, z);
      else if (mode === 'infiltration') dummy.position.set(x, -t * v.mediaDepth.value, 0.015);
      else if (mode === 'inlet')
        dummy.position.set(-l / 2 - 0.65 + t * 1.25, 0.09, 0.07 * Math.sin(i));
      else dummy.position.set(l / 2 + t * 1.5, mode === 'overflow' ? v.crest.value : pipeY, 0.02);
      dummy.scale.set(1, mode === 'rain' ? 4 : 1, 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      raycast={() => null}
    >
      <sphereGeometry args={[mode === 'rain' ? 0.018 : 0.035, 6, 4]} />
      <meshBasicMaterial color="#61cce9" />
    </instancedMesh>
  );
}
export function DimensionLines({ config }: { config: PhysicsConfig }) {
  const v = config.values,
    l = v.length.value,
    w = v.width.value,
    bottom =
      config.kind === 'inlet'
        ? 0
        : -v.mediaDepth.value - v.transitionDepth.value - v.gravelDepth.value,
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
