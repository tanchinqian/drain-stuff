import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, PlaneGeometry, SRGBColorSpace } from 'three';
import { weatherAt, weatherCanvas, playbackRain, type RainSample, type RainPlayback } from '../site/weather';
import { useWeatherTime } from '../simulation/physics/useWeatherTime';

export default function RainCloud({
  samples,
  opacity,
  playback,
}: {
  samples: RainSample[];
  opacity: number;
  playback?: RainPlayback;
}) {
  const { second, drift } = useWeatherTime(!!playback);
  const invalidate = useThree((state) => state.invalidate);
  const appearance = playback ? playbackRain(playback, second) : null;
  const monochrome = !!playback;
  const { texture, geometry } = useMemo(() => {
    const texture = new CanvasTexture(weatherCanvas(samples, monochrome));
    texture.colorSpace = SRGBColorSpace;
    if (monochrome) texture.repeat.set(1 / 3, 1 / 3);
    const geometry = new PlaneGeometry(66, 28, 100, 48);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const { coverage } = weatherAt(positions.getX(i), positions.getZ(i), samples);
      positions.setY(i, 1.5 + coverage * 0.75);
    }
    geometry.computeVertexNormals();
    return { texture, geometry };
  }, [samples, monochrome]);
  // Illustrative cloud drift, independent of the uniform rainfall calculation.
  texture.offset.set(playback ? (1 - drift) / 3 : 0, playback ? (1 + drift / 4) / 3 : 0);
  useEffect(() => { invalidate(); }, [drift, invalidate]);
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
        color={appearance?.color ?? '#ffffff'}
        transparent
        opacity={(opacity / 100) * (appearance?.strength ?? 1)}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
