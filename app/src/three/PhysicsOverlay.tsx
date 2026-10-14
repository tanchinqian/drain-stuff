import { useMemo, useEffect } from 'react';
import { Edges, Html, Line } from '@react-three/drei';
import { ExtrudeGeometry, Shape, type Plane } from 'three';
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
  if (id === 'ponding' && h > 0.0001)
    return (
      <group>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color="#61cce9"
            transparent
            opacity={0.55}
            depthWrite={false}
            clippingPlanes={plane ? [plane] : []}
          />
          <Edges color="#2f2b26" />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <Line
            key={i}
            points={[
              [-l / 2, h, -w / 2 + (i * w) / 5],
              [l / 2, h, -w / 2 + (i * w) / 5],
            ]}
            color="#2f2b26"
            lineWidth={0.7}
          />
        ))}
      </group>
    );
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
