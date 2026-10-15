import { useMemo, useEffect } from 'react';
import { Edges, Html, Line } from '@react-three/drei';
import { ExtrudeGeometry, Shape, DoubleSide, type Plane } from 'three';
import type { PartId } from '../api/types';
import type { PhysicsConfig } from '../simulation/physics/config';
import type { PhysicsFrame } from '../simulation/physics/engine';
import { channelPrism } from './physicsGeometry';
export interface ModelPhysics {
  config: PhysicsConfig;
  frame?: PhysicsFrame;
  amendment?: { depth: number; dose: string; batch: string };
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
    w = v.width.value,
    h = f?.ponding ?? 0,
    inlet = physics.config.kind === 'inlet';
  const pipeY = inlet
      ? v.pipeDiameter.value / 2
      : -v.mediaDepth.value - v.transitionDepth.value - v.gravelDepth.value / 2 - 0.05,
    r = v.pipeDiameter.value / 2;
  const fill = Math.min(
    1,
    Math.max(
      0,
      (inlet ? (f?.ponding ?? 0) : (f?.gravelHead ?? 0) - v.drainOffset.value) /
        v.pipeDiameter.value,
    ),
  );
  const geometry = useMemo(
    () =>
      id === 'ponding' ? channelPrism(l, w, Math.max(0.00001, h), v.sideSlope.value) : undefined,
    [id, l, w, h, v.sideSlope.value],
  );
  const pipeLength = id === 'outfall' ? 1.5 : l;
  const pipeGeometry = useMemo(() => {
    if (id !== 'underdrain' && id !== 'outfall') return;
    const angle = Math.acos(1 - 2 * Math.max(0.00001, fill)),
      shape = new Shape();
    for (let i = 0; i <= 32; i++) {
      const a = -angle + (2 * angle * i) / 32,
        x = r * Math.sin(a),
        y = -r * Math.cos(a);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
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
  if (id === 'ponding')
    return (
      <group>
        {f.rain > 0 && (
          <group>
            {Array.from({ length: 24 }, (_, i) => {
              const x = ((i % 8) / 7 - 0.5) * l,
                z = (Math.floor(i / 8) / 2 - 0.5) * w;
              return (
                <Line
                  key={i}
                  points={[
                    [x - 0.035, 1.1, z],
                    [x, 0.94, z],
                  ]}
                  color="#5e564b"
                  lineWidth={0.8}
                />
              );
            })}
          </group>
        )}
        {h > 0.0001 && (
          <>
            <mesh geometry={geometry}>
              <meshBasicMaterial
                color="#61cce9"
                transparent
                opacity={0.38}
                depthWrite={false}
                side={DoubleSide}
                clippingPlanes={plane ? [plane] : []}
              />
              <Edges color="#2f2b26" />
            </mesh>
            {Array.from({ length: 8 }, (_, i) => (
              <Line
                key={i}
                points={[
                  [-l / 2, h + 0.002, -w / 2 + (i * w) / 7],
                  [l / 2, h + 0.002, -w / 2 + (i * w) / 7],
                ]}
                color="#2f2b26"
                lineWidth={0.7}
              />
            ))}
            {plane && Math.abs(plane.normal.z) > 0 && (
              <mesh position={[0, h / 2, plane.constant / -plane.normal.z + 0.006]}>
                <planeGeometry args={[l, h]} />
                <meshBasicMaterial color="#61cce9" transparent opacity={0.5} side={DoubleSide} />
              </mesh>
            )}
          </>
        )}
      </group>
    );
  if (id === 'media') {
    const wetDepth =
      v.mediaDepth.value *
      Math.min(
        1,
        Math.max(0, (f.moisture - v.wilting.value) / (v.porosity.value - v.wilting.value)),
      );
    const cutZ = plane && Math.abs(plane.normal.z) > 0.99 ? -plane.constant / plane.normal.z : 0;
    const amendment = physics.amendment,
      depth = Math.min(v.mediaDepth.value, amendment?.depth ?? 0);
    return (
      <group>
        {wetDepth > 0.001 && (
          <mesh position={[0, -0.05 - wetDepth / 2, cutZ + 0.022]}>
            <planeGeometry args={[l, wetDepth]} />
            <meshBasicMaterial color="#79624a" transparent opacity={0.55} side={DoubleSide} />
          </mesh>
        )}
        {depth > 0 && (
          <group>
            {plane && Math.abs(plane.normal.z) > 0.99 && (
              <mesh position={[0, -0.05 - depth / 2, cutZ + 0.018]}>
                <planeGeometry args={[l, depth]} />
                <meshBasicMaterial color="#b03a78" transparent opacity={0.45} side={DoubleSide} />
              </mesh>
            )}
            <mesh position={[0, -0.05 - depth / 2, 0]}>
              <boxGeometry args={[l, depth, w]} />
              <meshStandardMaterial
                color="#b03a78"
                transparent
                opacity={0.35}
                depthWrite={false}
                clippingPlanes={plane ? [plane] : []}
              />
              <Edges color="#5e564b" />
            </mesh>
            <Html position={[0, -0.05 - depth / 2, w / 2 + 0.15]} center>
              <span className="dimension-label">
                Compost amended · {(depth * 1000).toFixed(0)} mm · {amendment?.dose}
              </span>
            </Html>
          </group>
        )}
      </group>
    );
  }
  if (id === 'drainage' && f.gravelHead > 0.0001) {
    const level = Math.min(v.gravelDepth.value, f.gravelHead);
    return (
      <mesh position={[0, pipeY - v.gravelDepth.value / 2 + level / 2, 0.01]}>
        <planeGeometry args={[l, level]} />
        <meshBasicMaterial color="#61cce9" transparent opacity={0.5} side={DoubleSide} />
      </mesh>
    );
  }
  const q =
    id === 'inlet'
      ? f.flux.inlet
      : id === 'outfall' || id === 'underdrain'
        ? f.flux.drain
        : id === 'overflow'
          ? f.flux.overflow
          : 0;
  const arrow = (x: number, y: number, length = 0.6, color = '#2f2b26') => (
    <Line
      points={[
        [x, y, 0.08],
        [x + length, y, 0.08],
        [x + length - 0.12, y + 0.05, 0.08],
        [x + length, y, 0.08],
        [x + length - 0.12, y - 0.05, 0.08],
      ]}
      color={color}
      lineWidth={Math.min(7, 1 + Math.sqrt(q * 60000) / 3)}
    />
  );
  if (id === 'underdrain' || id === 'outfall') {
    const x = id === 'outfall' ? l / 2 + 0.75 : 0;
    return (
      <group>
        {fill > 0.001 && (
          <>
            <mesh geometry={pipeGeometry} position={[x, pipeY, 0]}>
              <meshBasicMaterial color="#61cce9" clippingPlanes={plane ? [plane] : []} />
            </mesh>
            {plane && Math.abs(plane.normal.z) > 0 && (
              <mesh position={[x, pipeY - r + fill * r, 0.009]}>
                <planeGeometry args={[pipeLength, fill * r * 2]} />
                <meshBasicMaterial color="#61cce9" side={DoubleSide} />
              </mesh>
            )}
          </>
        )}
        {q > 1e-9 && arrow(id === 'outfall' ? l / 2 : 0, pipeY + 0.05, id === 'outfall' ? 1.5 : 1)}
        {id === 'outfall' && v.tailwater.value > 0 && (
          <Line
            points={[
              [l / 2 + 1.3, pipeY + v.tailwater.value, -0.5],
              [l / 2 + 2, pipeY + v.tailwater.value, 0.5],
            ]}
            color="#2f2b26"
            lineWidth={1}
          />
        )}
      </group>
    );
  }
  if (id === 'overflow')
    return (
      <group>
        {f.ponding > 0 && (
          <mesh position={[l / 2 - 0.5, Math.min(f.ponding, v.crest.value) / 2, -w / 3]}>
            <cylinderGeometry args={[0.12, 0.12, Math.min(f.ponding, v.crest.value), 16]} />
            <meshBasicMaterial
              color="#61cce9"
              transparent
              opacity={0.6}
              clippingPlanes={plane ? [plane] : []}
            />
          </mesh>
        )}
        {q > 1e-9 && arrow(l / 2 - 0.5, v.crest.value, 0.8, '#8e3a2e')}
      </group>
    );
  if (id === 'inlet' || id === 'pretreat' || id === 'sock') {
    const level = f.network.find((n) => n.id === 'kerb flow')?.depth ?? 0,
      x = id === 'inlet' ? -l / 2 - 0.4 : id === 'pretreat' ? -l / 2 + 0.35 : -l / 2 + 0.8;
    return (
      <group>
        {level > 0.0001 && (
          <mesh position={[inlet ? 0 : x, level + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[id === 'sock' ? 0.12 : 0.65, id === 'sock' ? 1.2 : 0.9]} />
            <meshBasicMaterial color="#61cce9" transparent opacity={0.5} side={DoubleSide} />
          </mesh>
        )}
        {id === 'inlet' && q > 1e-9 && arrow(-l / 2 - 0.65, 0.15, 1.1)}
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
