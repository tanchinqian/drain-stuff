import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ModelPhysics } from './PhysicsOverlay';
import { moistureTexture, wetMaterial } from './soilMaterial';

/** Three.js webgl_clipping_stencil technique, per closed mesh; works for all cut axes. */
export default function SectionCaps({
  group,
  plane,
  physics,
  orderBase,
}: {
  group: THREE.Group;
  plane: THREE.Plane;
  physics?: ModelPhysics;
  orderBase: number;
}) {
  const field = physics?.frame?.soil;
  const texture = useMemo(() => {
    if (!field) return;
    const texture = moistureTexture(field);
    texture.userData.amendmentDepth = physics?.amendment?.depth ?? 0;
    return texture;
  }, [field, physics?.amendment?.depth]);
  const caps = useMemo(() => {
    const root = new THREE.Group();
    let order = orderBase;
    group.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        object instanceof THREE.InstancedMesh ||
        object.userData.sectionFace
      )
        return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const source = materials[0];
      if (!(source instanceof THREE.MeshStandardMaterial) || source.opacity < 0.1) return;
      object.updateMatrix();
      const base = new THREE.MeshBasicMaterial({
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        stencilWrite: true,
        stencilFunc: THREE.AlwaysStencilFunc,
        clippingPlanes: [plane],
      });
      for (const side of [THREE.BackSide, THREE.FrontSide]) {
        const material = base.clone();
        material.side = side;
        material.stencilFail =
          material.stencilZFail =
          material.stencilZPass =
            side === THREE.BackSide ? THREE.IncrementWrapStencilOp : THREE.DecrementWrapStencilOp;
        const mask = new THREE.Mesh(object.geometry, material);
        mask.matrixAutoUpdate = false;
        mask.matrix.copy(object.matrix);
        mask.renderOrder = order;
        root.add(mask);
      }
      base.dispose();
      const material = source.clone();
      // Material.clone copies userData, but not the shader callback that owns these uniforms.
      delete material.userData.moistureUniform;
      delete material.userData.wetBandUniform;
      delete material.userData.amendmentUniform;
      if (source.map) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d')!,
          surface = source.map.userData.surface;
        ctx.fillStyle =
          surface === 'gravel'
            ? '#b2b4a7'
            : surface === 'sand'
              ? '#c7b994'
              : surface === 'mulch'
                ? '#78654d'
                : '#ac9577';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#746957';
        ctx.lineWidth = 0.8;
        for (let i = -4; i < 12; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 8, 0);
          ctx.lineTo(i * 8 + 64, 64);
          ctx.stroke();
        }
        material.map = new THREE.CanvasTexture(canvas);
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
        material.normalMap = null;
        material.map.repeat.set(100, 100);
        material.map.needsUpdate = true;
      }
      material.side = THREE.DoubleSide;
      material.clippingPlanes = [];
      material.stencilWrite = true;
      material.stencilRef = 0;
      material.stencilFunc = THREE.NotEqualStencilFunc;
      material.stencilFail = material.stencilZFail = material.stencilZPass = THREE.ReplaceStencilOp;
      const cap = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), material);
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal);
      plane.coplanarPoint(cap.position);
      cap.renderOrder = order + 1;
      cap.onAfterRender = (renderer) => renderer.clearStencil();
      root.add(cap);
      order += 3;
    });
    return root;
  }, [group, plane, orderBase]);
  useEffect(() => {
    caps.children.forEach((o) => {
      if (o instanceof THREE.Mesh && o.geometry instanceof THREE.PlaneGeometry)
        plane.coplanarPoint(o.position);
    });
  }, [caps, plane.constant]);
  useEffect(() => {
    if (!texture || !field) return;
    caps.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial)
        wetMaterial(o.material, texture, field.width, field.depth);
    });
  }, [caps, field, texture]);
  useEffect(
    () => () => {
      texture?.dispose();
    },
    [texture],
  );
  useEffect(
    () => () => {
      caps.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          if (o.geometry instanceof THREE.PlaneGeometry) o.geometry.dispose();
          if (o.material instanceof THREE.MeshStandardMaterial) o.material.map?.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    },
    [caps],
  );
  return <primitive object={caps} />;
}
