import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, CurvePath, LineCurve3 } from 'three';
import { flowVisual } from './sceneMetrics';
import { useReducedMotion } from './WaterEffects';
export default function FlowTrace({
  name,
  points,
  q,
  velocity,
  plane,
  low = false,
}: {
  name: string;
  points: [number, number, number][];
  q: number;
  velocity: number;
  plane?: import('three').Plane;
  low?: boolean;
}) {
  const shape = flowVisual(q, velocity),
    mesh = useRef<InstancedMesh>(null),
    clock = useRef(0);
  const reduced = useReducedMotion(),
    invalidate = useThree((s) => s.invalidate);
  const curve = useMemo(() => {
    const c = new CurvePath<Vector3>();
    for (let i = 1; i < points.length; i++)
      c.add(new LineCurve3(new Vector3(...points[i - 1]), new Vector3(...points[i])));
    return c;
  }, [JSON.stringify(points)]);
  const object = useMemo(() => new Object3D(), []),
    length = curve.getLength();
  const count = q > 0 ? Math.min(low ? 20 : 48, Math.max(3, Math.ceil(q * 60000 * 0.4))) : 0;
  useFrame((_, delta) => {
    if (!mesh.current || !count) return;
    if (!reduced) clock.current += Math.min(delta, 0.1) * shape.speed;
    for (let i = 0; i < count; i++) {
      const t = (i / count + clock.current / Math.max(0.001, length)) % 1;
      object.position.copy(curve.getPoint(t));
      object.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), curve.getTangent(t).normalize());
      object.scale.set(
        Math.min(0.16, (length / count) * 0.65),
        0.003,
        shape.width / Math.max(1, Math.ceil(count / 8)),
      );
      object.updateMatrix();
      mesh.current.setMatrixAt(i, object.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (!reduced && shape.speed > 0) invalidate();
  });
  if (!shape.active) return null;
  return (
    <instancedMesh
      name={name}
      ref={mesh}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      userData={{
        discharge: q,
        width: shape.width,
        velocity: shape.speed,
        speed: shape.speed,
        path: points,
      }}
    >
      <boxGeometry />
      <meshBasicMaterial
        color="#d6e5df"
        transparent
        opacity={0.72}
        depthWrite={false}
        clippingPlanes={plane ? [plane] : []}
      />
    </instancedMesh>
  );
}
