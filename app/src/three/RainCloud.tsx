import { useEffect, useMemo } from 'react';
import { CanvasTexture, DoubleSide, PlaneGeometry, SRGBColorSpace } from 'three';
import { weatherAt, weatherCanvas, type RainSample } from '../site/weather';

export default function RainCloud({
  samples,
  opacity,
}: {
  samples: RainSample[];
  opacity: number;
}) {
  const { texture, geometry } = useMemo(() => {
    const texture = new CanvasTexture(weatherCanvas(samples));
    texture.colorSpace = SRGBColorSpace;
    const geometry = new PlaneGeometry(66, 28, 100, 48);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const { coverage } = weatherAt(positions.getX(i), positions.getZ(i), samples);
      positions.setY(i, 1.5 + coverage * 0.75);
    }
    geometry.computeVertexNormals();
    return { texture, geometry };
  }, [samples]);
  useEffect(
    () => () => {
      texture.dispose();
      geometry.dispose();
    },
    [texture, geometry],
  );
  return (
    <mesh geometry={geometry} raycast={() => undefined} renderOrder={2}>
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity / 100}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
