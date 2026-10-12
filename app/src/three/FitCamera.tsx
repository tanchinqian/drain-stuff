import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrthographicCamera } from 'three';
export default function FitCamera({ width, height }: { width: number; height: number }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (camera instanceof OrthographicCamera) {
      camera.zoom = Math.min(size.width / width, size.height / height);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size, width, height, invalidate]);
  return null;
}
