import { useEffect, type ComponentRef, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OrthographicCamera } from 'three';
export default function FitCamera({
  width,
  height,
  controlsRef,
  enabled,
  target,
}: {
  width: number;
  height: number;
  controlsRef: RefObject<ComponentRef<typeof OrbitControls>>;
  enabled: boolean;
  target: [number, number, number];
}) {
  const { camera, size, invalidate } = useThree();
  const fittedZoom = Math.min(size.width / width, size.height / height);
  useEffect(() => {
    if (camera instanceof OrthographicCamera) {
      camera.zoom = fittedZoom;
      camera.updateProjectionMatrix();
      controlsRef.current?.update();
      invalidate();
    }
  }, [camera, fittedZoom, controlsRef, invalidate]);
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
      target={target}
    />
  );
}
