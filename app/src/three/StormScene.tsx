import { useRef, type ComponentRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, Html, Line, OrbitControls } from '@react-three/drei';
import FitCamera from './FitCamera';
import type { StormFrame } from '../simulation/storm';

type Point = [number, number, number];
const water = '#61cce9';
function Box({ position, size, color }: { position: Point; size: Point; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
      <Edges color="#6f665a" />
    </mesh>
  );
}
function Flow({ points, active, minute }: { points: Point[]; active: boolean; minute: number }) {
  return (
    <group>
      <Line points={points} color={active ? water : '#6f665a'} lineWidth={active ? 3 : 1} />
      {active &&
        Array.from({ length: 8 }, (_, i) => {
          const t = ((minute * 0.137 + i / 8) % 1) * (points.length - 1),
            segment = Math.floor(t),
            f = t - segment;
          const a = points[segment],
            b = points[segment + 1];
          return (
            <mesh key={i} position={a.map((v, axis) => v + (b[axis] - v) * f) as Point}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshBasicMaterial color={water} />
            </mesh>
          );
        })}
    </group>
  );
}
function Scene({ frame }: { frame: StormFrame }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  return (
    <>
      <FitCamera width={13} height={7} controlsRef={controls} enabled target={[0, 0, 0]} />
      <color attach="background" args={['#e2dccb']} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[2, 9, 7]} intensity={2} />
      <Box position={[0, -1.2, 0]} size={[10, 0.1, 4]} color="#ddd6c6" />
      {[-1, 0, 1].map((z) => (
        <group key={z} position={[-3.5, 0, z * 1.05]}>
          <Box position={[0, 0, 0]} size={[1.2, 0.8, 0.8]} color="#f2eee4" />
          <mesh position={[0, 0.65, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.85, 0.6, 4]} />
            <meshStandardMaterial color="#6f665a" />
          </mesh>
        </group>
      ))}
      <Box position={[-1.8, -0.1, 0]} size={[0.65, 0.8, 1.7]} color="#cfc7b4" />
      <Box position={[0.5, 0.05, 0]} size={[3, 0.4, 2.4]} color="#b2663a" />
      <Box position={[0.5, -0.35, 0]} size={[3, 0.35, 2.4]} color="#d8b978" />
      <Box position={[0.5, -0.75, 0]} size={[3, 0.4, 2.4]} color="#6f665a" />
      {frame.ponding > 0 && (
        <mesh position={[0.5, 0.28 + frame.ponding / 500, 0]}>
          <boxGeometry args={[3, Math.max(0.02, frame.ponding / 250), 2.4]} />
          <meshStandardMaterial color={water} transparent opacity={0.65} />
        </mesh>
      )}
      <Flow
        points={[
          [-3.4, 0.5, 1.5],
          [-1.8, 0.5, 1.5],
          [-1, 0.4, 1.5],
          [0.5, 0.4, 1.5],
        ]}
        active={frame.runoff > 0}
        minute={frame.minute}
      />
      <Flow
        points={[
          [0.5, 0.4, 1.5],
          [0.5, -0.35, 1.5],
          [0.5, -0.8, 1.5],
        ]}
        active={frame.infiltration > 0}
        minute={frame.minute}
      />
      <Flow
        points={[
          [0.5, -0.8, 1.5],
          [2.5, -0.8, 1.5],
          [4, -0.8, 1.5],
        ]}
        active={frame.outlet > 0}
        minute={frame.minute}
      />
      {frame.rain > 0 &&
        [-3.9, -3.5, -3.1].map((x) => (
          <Flow
            key={x}
            points={[
              [x, 2.5, 0],
              [x, 1.2, 0],
            ]}
            active
            minute={frame.minute}
          />
        ))}
      {(
        [
          ['Houses → inlet', -2.9, 1.6],
          ['Soil layers', 0.5, -1.5],
          ['Outlet', 3.6, 0],
        ] as const
      ).map(([label, x, z]) => (
        <Html key={label} position={[x, 1.5, z]} center style={{ pointerEvents: 'none' }}>
          <span className="scene-label">{label}</span>
        </Html>
      ))}
    </>
  );
}
export default function StormScene({ frame }: { frame: StormFrame }) {
  return (
    <div
      className="storm-scene"
      aria-label="S1 simulated runoff from houses through inlet, soil layers and outlet"
    >
      <Canvas
        orthographic
        camera={{ position: [9, 9, 13], near: 0.1, far: 100 }}
        frameloop="demand"
        dpr={[1, 2]}
        fallback={<p>Water flows and depth are listed below.</p>}
      >
        <Scene frame={frame} />
      </Canvas>
    </div>
  );
}
