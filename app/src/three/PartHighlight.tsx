import { useEffect, useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import {
  Box3,
  CanvasTexture,
  EdgesGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  RepeatWrapping,
  Vector3,
} from 'three';
import type { Status } from '../api/types';

export default function PartHighlight({
  group,
  status,
  number,
  name,
}: {
  group: Group;
  status: Status;
  number: number;
  name: string;
}) {
  const hatch = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    for (let x = -32; x < 64; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 32, 32);
      ctx.stroke();
    }
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }, []);
  const meshes = useMemo(() => {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const rows: { mesh: Mesh; matrix: Matrix4; points: Vector3[] }[] = [];
    group.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const relative = new Matrix4().multiplyMatrices(inverse, object.matrixWorld);
      const edges = new EdgesGeometry(object.geometry, 35);
      const positions = edges.getAttribute('position');
      const local = Array.from({ length: positions.count }, (_, i) =>
        new Vector3().fromBufferAttribute(positions, i),
      );
      const count = object instanceof InstancedMesh ? object.count : 1;
      for (let i = 0; i < count; i++) {
        const matrix = relative.clone();
        if (object instanceof InstancedMesh) {
          const instance = new Matrix4();
          object.getMatrixAt(i, instance);
          matrix.multiply(instance);
        }
        rows.push({
          mesh: object,
          matrix,
          points: local.map((p) => p.clone().applyMatrix4(matrix)),
        });
      }
      edges.dispose();
    });
    return rows;
  }, [group]);
  useEffect(() => () => hatch.dispose(), [hatch]);
  const color = status === 'fault' ? '#8E3A2E' : status === 'watch' ? '#B07A12' : '#6F665A';
  const bounds = group.userData.localBounds as Box3;
  const label = bounds.getCenter(new Vector3());
  label.y = bounds.max.y + 0.65;
  const text =
    status === 'fault'
      ? 'Fault'
      : status === 'watch'
        ? 'Watch / inferred'
        : 'Sensor suspect or offline';
  return (
    <group>
      {meshes.map(({ mesh, matrix, points }, i) => (
        <group key={i}>
          {points.length > 0 && (
            <Line
              points={points}
              segments
              color={color}
              lineWidth={status === 'fault' ? 2.5 : 2}
              dashed={status !== 'fault'}
              dashSize={status === 'watch' ? 0.12 : 0.015}
              gapSize={0.08}
              raycast={() => undefined}
            />
          )}
          {status === 'fault' && (
            <mesh
              geometry={mesh.geometry}
              matrix={matrix}
              matrixAutoUpdate={false}
              raycast={() => undefined}
              dispose={null}
            >
              <meshBasicMaterial
                color={color}
                alphaMap={hatch}
                transparent
                opacity={0.25}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
          )}
        </group>
      ))}
      <Html position={label} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
        <span
          className="highlight-label"
          data-part-highlight={status}
          aria-label={`${name}: ${text}`}
        >
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            {status === 'fault' ? (
              <polygon points="15,2 28,27 2,27" fill="none" stroke={color} strokeWidth="2" />
            ) : status === 'watch' ? (
              <circle cx="15" cy="15" r="12" fill="none" stroke={color} strokeWidth="2" />
            ) : (
              <polygon points="15,1 29,15 15,29 1,15" fill="none" stroke={color} strokeWidth="2" />
            )}
            <text x="15" y={status === 'fault' ? 22 : 19} textAnchor="middle" fill="#2F2B26">
              {number}
            </text>
          </svg>
          <span>{text}</span>
        </span>
      </Html>
    </group>
  );
}
