import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { InstancedMesh, Object3D } from 'three';
import { drainDesign } from '../simulation/physics/design';
import type { ModelPhysics } from './PhysicsOverlay';
import { flowSpeed } from './visibility';
import { useReducedMotion, WaterMaterial } from './WaterEffects';
export default function CatchmentContext({
  physics,
  low,
}: {
  physics: ModelPhysics;
  low: boolean;
}) {
  const d = drainDesign(physics.config),
    c = d.catchment,
    f = physics.frame;
  const x = -d.length / 2 - c.roadWidth / 2 - 0.7,
    z = -d.topWidth / 2 - c.footpathWidth / 2;
  const rain = f?.rain ?? 0,
    q = f?.flux.inlet ?? 0;
  const roofQ = f?.links.find((link) => link.id === 'roof outlet to downpipe')?.discharge ?? 0;
  const wet =
    rain > 0
      ? Math.min(1, (rain * 3.6e6) / 20)
      : Math.exp(-Math.max(0, (f?.second ?? 0) - physics.config.values.duration.value) / 1800) *
        ((f?.second ?? 0) > 0 ? 1 : 0);
  const streaks = useRef<InstancedMesh>(null),
    time = useRef(0),
    object = useMemo(() => new Object3D(), []);
  const reduced = useReducedMotion(),
    invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    if (!streaks.current || q <= 0) return;
    if (!reduced) time.current += Math.min(delta, 0.1) * flowSpeed(q);
    for (let i = 0; i < 16; i++) {
      const phase = (i / 16 + time.current / Math.max(c.roadWidth, 0.1)) % 1;
      object.position.set(
        -d.length / 2 - 0.6 - (1 - phase) * c.roadWidth,
        c.kerbHeight + 0.006,
        ((i % 3) - 1) * 0.075,
      );
      object.scale.set(0.08 + Math.min(0.2, q * 60000 * 0.006), 0.002, 0.008);
      object.updateMatrix();
      streaks.current.setMatrixAt(i, object.matrix);
    }
    streaks.current.instanceMatrix.needsUpdate = true;
    if (!reduced) invalidate();
  });
  const box = (
    key: string,
    position: [number, number, number],
    size: [number, number, number],
    color: string,
  ) => (
    <mesh key={key} name={key} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
  return (
    <group
      name="catchment-context"
      userData={{ pavedArea: c.pavedArea, roofArea: c.roofArea, gutterSlope: c.gutterSlope }}
    >
      <mesh name="road" position={[x, c.kerbHeight - 0.06, 0]}>
        <boxGeometry args={[c.roadWidth, 0.12, d.topWidth + 1]} />
        <meshStandardMaterial
          color={wet ? '#737570' : '#96958c'}
          roughness={0.9 - wet * 0.6}
          metalness={0.05}
        />
      </mesh>
      {box(
        'footpath',
        [0, c.kerbHeight - 0.04, z],
        [d.length + 1, 0.08, c.footpathWidth],
        '#c9c4b7',
      )}
      {[-1, 1].map((side) =>
        box(
          'kerb-' + side,
          [-d.length / 2 - 0.65, c.kerbHeight / 2, side * (d.topWidth / 4 + 0.25)],
          [0.15, c.kerbHeight, d.topWidth / 2 - 0.25],
          '#aaa99c',
        ),
      )}
      {box('gutter', [x, c.kerbHeight - 0.015, 0], [c.roadWidth, 0.02, 0.3], '#777e78')}
      {(f?.network.find(n=>n.id==='kerb flow')?.depth ?? 0) > 0.001 && <mesh name="upstream-ponding" position={[x,c.kerbHeight+(f!.network.find(n=>n.id==='kerb flow')!.depth/2),0]}><boxGeometry args={[c.roadWidth,f!.network.find(n=>n.id==='kerb flow')!.depth,d.topWidth+0.4]}/><WaterMaterial design={d} depth={f!.network.find(n=>n.id==='kerb flow')!.depth} low={low}/></mesh>}
      {c.roofArea > 0 && (
        <group>
          {box(
            'house-wall-edge',
            [0, c.kerbHeight + 0.5, z - c.footpathWidth / 2 - 0.1],
            [d.length * 0.7, 1, 0.12],
            '#d5ccba',
          )}
          <mesh
            name="roof-edge"
            position={[0, c.kerbHeight + 1.05, z - c.footpathWidth / 2 - 0.15]}
            rotation={[0.08, 0, 0]}
          >
            <boxGeometry args={[d.length * 0.75, 0.08, c.roofEdgeDepth]} />
            <meshStandardMaterial color="#84745f" />
          </mesh>
          <mesh position={[-d.length * 0.34, c.kerbHeight + 0.5, z + 0.06]}>
            <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
            <meshStandardMaterial color="#9d9f93" />
          </mesh>
        </group>
      )}
      {roofQ > 0 && (
        <mesh
          name="downpipe-flow"
          position={[-d.length * 0.34, c.kerbHeight + 0.02, z + 0.1]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.2, 0.3]} />
          <WaterMaterial design={d} depth={0.005} velocity={flowSpeed(roofQ)} flow low={low} />
        </mesh>
      )}
      {q > 0 && (
        <instancedMesh
          name="gutter-flow"
          ref={streaks}
          args={[undefined, undefined, 16]}
          frustumCulled={false}
          userData={{ speed: flowSpeed(q) }}
        >
          <boxGeometry />
          <meshBasicMaterial color="#c9e0d9" transparent opacity={0.8} />
        </instancedMesh>
      )}
      <mesh
        name="outfall-pool"
        position={[d.length / 2 + 1.75, d.pipeY - d.pipeDiameter / 2 - 0.15, 0]}
      >
        <boxGeometry args={[0.9, 0.05, 0.75]} />
        <meshStandardMaterial color="#a3a99b" />
      </mesh>
      {(f?.flux.outfall ?? 0) > 0 && (
        <mesh
          position={[d.length / 2 + 1.75, d.pipeY - d.pipeDiameter / 2 - 0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.85, 0.7]} />
          <WaterMaterial design={d} depth={0.025} low={low} />
        </mesh>
      )}
    </group>
  );
}
