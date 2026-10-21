import { useEffect, useState, useRef, type ComponentRef, type RefObject } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box3, Vector3, OrthographicCamera } from 'three';
export default function FitCamera({
  width,
  height,
  controlsRef,
  enabled,
  target,
  bounds,
  direction,
  transition = false,
}: {
  width: number;
  height: number;
  controlsRef: RefObject<ComponentRef<typeof OrbitControls>>;
  enabled: boolean;
  target: [number, number, number];
  bounds?: Box3;
  direction?: [number, number, number];
  transition?: boolean;
}) {
  const { camera, size, invalidate } = useThree();
  const [boundsZoom, setBoundsZoom] = useState<number>();
  const initialized = useRef(false),
    movement = useRef<{
      from: Vector3;
      to: Vector3;
      targetFrom: Vector3;
      targetTo: Vector3;
      zoomFrom: number;
      zoomTo: number;
      t: number;
    }>();
  const fittedZoom = boundsZoom ?? Math.min(size.width / width, size.height / height);
  useFrame(({ gl }, delta) => {
    if (camera instanceof OrthographicCamera)
      gl.domElement.dataset.cameraZoom = String(camera.zoom);
    const m = movement.current;
    if (m && camera instanceof OrthographicCamera) {
      m.t = Math.min(1, m.t + delta / 0.45);
      const t = 1 - Math.pow(1 - m.t, 3);
      camera.position.lerpVectors(m.from, m.to, t);
      camera.zoom = m.zoomFrom + (m.zoomTo - m.zoomFrom) * t;
      controlsRef.current?.target.lerpVectors(m.targetFrom, m.targetTo, t);
      camera.updateProjectionMatrix();
      controlsRef.current?.update();
      if (m.t >= 1) movement.current = undefined;
      invalidate();
    }
  });
  useEffect(() => {
    if (camera instanceof OrthographicCamera) {
      const from = camera.position.clone(),
        zoomFrom = camera.zoom,
        targetFrom = controlsRef.current?.target.clone() ?? new Vector3(...target);
      let zoom = Math.min(size.width / width, size.height / height);
      if (bounds && direction) {
        camera.position.set(
          target[0] + direction[0],
          target[1] + direction[1],
          target[2] + direction[2],
        );
        camera.lookAt(...target);
        camera.updateMatrixWorld(true);
        const projected = new Box3();
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z])
              projected.expandByPoint(new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
        const extent = projected.getSize(new Vector3());
        zoom = Math.min(
          (size.width * 0.82) / Math.max(0.01, extent.x),
          (size.height * 0.82) / Math.max(0.01, extent.y),
        );
      }
      setBoundsZoom(bounds ? zoom : undefined);
      const to = camera.position.clone();
      if (
        transition &&
        initialized.current &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        camera.position.copy(from);
        movement.current = {
          from,
          to,
          targetFrom,
          targetTo: new Vector3(...target),
          zoomFrom,
          zoomTo: zoom,
          t: 0,
        };
      } else {
        camera.zoom = zoom;
        controlsRef.current?.target.set(...target);
      }
      initialized.current = true;
      camera.updateProjectionMatrix();
      controlsRef.current?.update();
      invalidate();
    }
  }, [
    camera,
    size.width,
    size.height,
    width,
    height,
    controlsRef,
    invalidate,
    bounds,
    direction?.[0],
    direction?.[1],
    direction?.[2],
    target[0],
    target[1],
    target[2],
  ]);
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enablePan={false}
      minPolarAngle={0.15}
      maxPolarAngle={1.42}
      minZoom={fittedZoom * 0.6}
      maxZoom={fittedZoom * 3.5}
      zoomSpeed={0.7}
    />
  );
}
