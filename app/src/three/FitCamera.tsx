import { useEffect, useState, type ComponentRef, type RefObject } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box3, Vector3, OrthographicCamera } from 'three';
export default function FitCamera({
  width,
  height,
  controlsRef,
  enabled,
  target, bounds, direction,
}: {
  width: number;
  height: number;
  controlsRef: RefObject<ComponentRef<typeof OrbitControls>>;
  enabled: boolean;
  target: [number, number, number]; bounds?: Box3; direction?: [number,number,number];
}) {
  const { camera, size, invalidate } = useThree();
  const [boundsZoom,setBoundsZoom]=useState<number>();
  const fittedZoom = boundsZoom ?? Math.min(size.width / width, size.height / height);
  useFrame(({ gl }) => {
    if (camera instanceof OrthographicCamera) gl.domElement.dataset.cameraZoom = String(camera.zoom);
  });
  useEffect(() => {
    if (camera instanceof OrthographicCamera) {
      let zoom = Math.min(size.width / width, size.height / height);
      if(bounds && direction) {
        camera.position.set(target[0]+direction[0],target[1]+direction[1],target[2]+direction[2]);
        camera.lookAt(...target);camera.updateMatrixWorld(true);
        const projected=new Box3();
        for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]) projected.expandByPoint(new Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
        const extent=projected.getSize(new Vector3());
        zoom=Math.min(size.width*0.82/Math.max(.01,extent.x),size.height*0.82/Math.max(.01,extent.y));
      }
      setBoundsZoom(bounds ? zoom : undefined);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      controlsRef.current?.update();
      invalidate();
    }
  }, [camera, size.width, size.height, width, height, controlsRef, invalidate, bounds, direction?.[0], direction?.[1], direction?.[2], target[0], target[1], target[2]]);
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
