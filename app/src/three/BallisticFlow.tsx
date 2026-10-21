import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Curve, Vector3, TubeGeometry, InstancedMesh, Object3D, type Plane } from 'three';
import { ballisticPoint, flightTime, type Point3 } from './flowPhysics';
import { useReducedMotion } from './WaterEffects';
import { recordParticleCost } from './materialInteractions';
export default function BallisticFlow({
  name,
  start,
  landing,
  velocity,
  q,
  plane,
  low = false,
}: {
  name: string;
  start: Point3;
  landing: number;
  velocity: number;
  q: number;
  plane?: Plane;
  low?: boolean;
}) {
  const duration = flightTime(start[1] - landing),
    reduced = useReducedMotion(),
    { invalidate, scene } = useThree();
  const clock = useRef(0),
    particles = useRef<InstancedMesh>(null),
    object = useMemo(() => new Object3D(), []);
  const radius = Math.min(0.15, Math.sqrt(Math.max(0, q) / Math.max(0.01, velocity) / Math.PI));
  const geometry = useMemo(() => {
    class Jet extends Curve<Vector3> {
      constructor() {
        super();
      }
      getPoint(t: number) {
        return new Vector3(...ballisticPoint(start, velocity, t * duration));
      }
    }
    return new TubeGeometry(new Jet(), 24, Math.max(0.001, radius), low ? 6 : 10, false);
  }, [...start, velocity, duration, radius, low]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const count = q > 0 && duration > 0 ? (low ? 12 : 32) : 0;
  useFrame(({ clock: renderClock }, dt) => {
    if (!particles.current || !count || document.hidden) return;
    const started = performance.now();
    if (!reduced) clock.current += Math.min(dt, 0.1);
    for (let i = 0; i < count; i++) {
      const t = ((i / count + clock.current / Math.max(0.02, duration)) % 1) * duration;
      const p = ballisticPoint(start, velocity, t);
      object.position.set(p[0], p[1], p[2] + Math.sin(i * 22) * radius * 0.6);
      object.scale.setScalar(Math.max(0.003, radius * 0.22));
      object.updateMatrix();
      particles.current.setMatrixAt(i, object.matrix);
    }
    particles.current.instanceMatrix.needsUpdate = true;
    recordParticleCost(scene.userData, renderClock.elapsedTime, performance.now() - started);
    if (!reduced) invalidate();
  });
  if (!count) return null;
  return (
    <group name={name} userData={{ discharge: q, velocity, ballistic: true, start, landing }}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color="#8faea4"
          transparent
          opacity={0.52}
          roughness={0.13}
          metalness={0}
          transmission={low ? 0 : 0.35}
          clippingPlanes={plane ? [plane] : []}
        />
      </mesh>
      <instancedMesh ref={particles} args={[undefined, undefined, count]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color="#dae5de"
          transparent
          opacity={0.65}
          clippingPlanes={plane ? [plane] : []}
        />
      </instancedMesh>
    </group>
  );
}
