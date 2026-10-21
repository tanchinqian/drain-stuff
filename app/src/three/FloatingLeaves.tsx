import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  Object3D,
  DoubleSide,
  type Plane,
} from 'three';
import { drainDesign } from '../simulation/physics/design';
import type { ModelPhysics } from './PhysicsOverlay';
import { variation } from './sceneMaterials';
import { useReducedMotion } from './WaterEffects';
import { recordParticleCost } from './materialInteractions';
export function leafGeometry() {
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new Float32BufferAttribute([-0.5, 0, 0, 0, 0.12, -0.3, 0.5, 0, 0, 0, 0, 0.3, 0, 0.12, 0], 3),
  );
  g.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
  g.computeVertexNormals();
  return g;
}
export function moveLeaf(
  p: { x: number; z: number },
  v: { depth: number; vx: number; vz: number },
  dt: number,
  inletX: number,
  inletOpen: number,
  sockX: number,
  sockOpen: number,
) {
  const inletTrap = inletOpen < 0.5 && p.x < inletX && p.x > inletX - 0.35 && Math.abs(p.z) < 0.4;
  const sockTrap = sockOpen < 0.5 && Math.abs(p.x - sockX) < 0.12;
  if (v.depth <= 0.003 || inletTrap || sockTrap) return { ...p, trapped: inletTrap || sockTrap };
  return { x: p.x + v.vx * dt, z: p.z + v.vz * dt, trapped: false };
}
function LeafPopulation({
  physics,
  plane,
  low,
  road = false,
}: {
  physics: ModelPhysics;
  plane?: Plane;
  low: boolean;
  road?: boolean;
}) {
  const d = drainDesign(physics.config),
    count = road ? (low ? 6 : 12) : low ? 12 : 32,
    mesh = useRef<InstancedMesh>(null),
    { scene, invalidate } = useThree(),
    reduced = useReducedMotion();
  const geometry = useMemo(leafGeometry, []),
    object = useMemo(() => new Object3D(), []);
  const leaves = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: road
          ? -d.length / 2 - 0.7 + variation(i + 300) * 0.42
          : (variation(i + 300) - 0.5) * d.length * 0.9,
        z: (variation(i + 500) - 0.5) * (road ? 0.7 : d.bedWidth * 0.9),
      })),
    [count, d.length, d.bedWidth, road],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }, delta) => {
    if (!mesh.current || document.hidden) return;
    const sample = scene.userData.surfaceSample as
      | ((x: number, z: number) => { depth: number; height: number; vx: number; vz: number })
      | undefined;
    if (!sample) return;
    const started = performance.now();
    let moving = false;
    for (let i = 0; i < count; i++) {
      const p = leaves[i],
        s = sample(p.x, p.z),
        next = moveLeaf(
          p,
          s,
          reduced ? 0 : Math.min(0.05, delta),
          -d.length / 2,
          physics.config.values.inletOpen.value,
          -d.length / 2 + 0.8,
          physics.config.values.sockOpen.value,
        );
      p.x = road
        ? Math.max(-d.length / 2 - 0.8, Math.min(-d.length / 2 - 0.251, next.x))
        : Math.max(-d.length / 2 + 0.02, Math.min(d.length / 2 - 0.02, next.x));
      p.z = Math.max(-d.bedWidth / 2 + 0.02, Math.min(d.bedWidth / 2 - 0.02, next.z));
      object.position.set(p.x, s.height + 0.004, p.z);
      object.rotation.set(0, Math.atan2(s.vz, s.vx) + variation(i) * 2, 0);
      const size = 0.06 + variation(i + 20) * 0.05;
      object.scale.set(size, 0.08, size);
      object.updateMatrix();
      mesh.current.setMatrixAt(i, object.matrix);
      moving ||= s.depth > 0.003 && Math.hypot(s.vx, s.vz) > 0.001 && !next.trapped;
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    recordParticleCost(scene.userData, clock.elapsedTime, performance.now() - started);
    if (moving && !reduced) invalidate();
  });
  return (
    <instancedMesh
      name={road ? 'road-leaves' : 'advected-leaves'}
      ref={mesh}
      args={[geometry, undefined, count]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        color="#706040"
        roughness={0.7}
        side={DoubleSide}
        clippingPlanes={!road && plane ? [plane] : []}
      />
    </instancedMesh>
  );
}

export default function FloatingLeaves(props: {
  physics: ModelPhysics;
  plane?: Plane;
  low: boolean;
}) {
  return (
    <>
      <LeafPopulation {...props} />
      <LeafPopulation {...props} road />
    </>
  );
}
