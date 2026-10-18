import { useEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, BoxGeometry, MeshStandardMaterial, type Plane } from 'three';
import type { PartId } from '../api/types';
import type { ModelPhysics } from './PhysicsOverlay';
import { drainDesign } from '../simulation/physics/design';
import { surfaceMaps, variation } from './sceneMaterials';
import { featureConfig, type PhysicsConfig } from '../simulation/physics/config';
export function depositAmount(config: PhysicsConfig, id: PartId, confirmed: boolean) {
  if (!confirmed) return 0;
  const v = config.values;
  return id === 'inlet'
    ? 1 - v.inletOpen.value
    : id === 'sock'
      ? 1 - v.sockOpen.value
      : id === 'underdrain'
        ? 1 - Math.min(1, v.drainC.value / featureConfig(config.id).values.drainC.value)
        : 0;
}
export default function FaultDeposits({
  id,
  physics,
  confirmed,
  plane,
}: {
  id: PartId;
  physics: ModelPhysics;
  confirmed: boolean;
  plane?: Plane;
}) {
  const d = drainDesign(physics.config);
  const amount = depositAmount(physics.config, id, confirmed);
  const deposit = useMemo(() => {
    if (amount <= 0) return;
    const count = Math.ceil(Math.max(0, amount) * 55),
      maps = surfaceMaps(id === 'sock' ? 'soil' : 'mulch');
    const material = new MeshStandardMaterial({
      ...maps,
      color: 0xffffff,
      roughness: 0.9,
      clippingPlanes: plane ? [plane] : [],
    });
    const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), material, count),
      o = new Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(
        id === 'underdrain'
          ? (variation(i + 51) - 0.5) * d.length
          : -d.length / 2 + (id === 'inlet' ? -0.4 : 0.8) + (variation(i + 72) - 0.5) * 0.2,
        id === 'underdrain' ? d.pipeY - d.pipeDiameter * 0.38 : id === 'sock' ? 0.03 : 0.015,
        (variation(i + 90) - 0.5) * 0.8,
      );
      o.rotation.set(variation(i + 5) * 0.3, variation(i + 6) * 6, variation(i + 7) * 0.3);
      o.scale.set(0.04 + variation(i + 9) * 0.06, 0.012, 0.03 + variation(i + 11) * 0.08);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.name = 'confirmed-deposit-' + id;
    mesh.userData.confirmedFault = true;
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }, [id, amount, d.length, d.pipeY, d.pipeDiameter, plane]);
  useEffect(
    () => () => {
      if (!deposit) return;
      deposit.geometry.dispose();
      const m = deposit.material as MeshStandardMaterial;
      m.map?.dispose();
      m.normalMap?.dispose();
      m.dispose();
    },
    [deposit],
  );
  if (!deposit) return null;
  return <primitive object={deposit} />;
}
