import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { EdgesGeometry, Group, InstancedMesh, Matrix4, Mesh, Plane, Vector3 } from 'three';
import type { Status } from '../api/types';

/** Only the part edges, never a bounding box or an opaque fault wash. */
export default function PartHighlight({
  group,
  status,
  plane,
  natural = false,
}: {
  group: Group;
  status: Status;
  plane?: Plane;
  natural?: boolean;
}) {
  const meshes = useMemo(() => {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const rows: Vector3[][] = [];
    group.traverse((object) => {
      if (!(object instanceof Mesh) || !object.visible) return;
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
        rows.push(local.map((p) => p.clone().applyMatrix4(matrix)));
      }
      edges.dispose();
    });
    return rows;
  }, [group]);
  return (
    <group
      name={status === 'ok' ? 'selection-outline' : 'fault-outline'}
      userData={{ partId: group.name }}
    >
      {meshes.length > 0 && (
        <Line
          points={meshes.flat()}
          segments
          color={
            natural
              ? status === 'fault'
                ? '#7d6142'
                : '#88784d'
              : status === 'fault'
                ? '#8E3A2E'
                : '#B07A12'
          }
          clippingPlanes={plane ? [plane] : []}
          lineWidth={natural ? 1 : 1.5}
          raycast={() => undefined}
        />
      )}
    </group>
  );
}
