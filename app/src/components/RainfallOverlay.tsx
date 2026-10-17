import { useId, useMemo } from 'react';
import { weatherCanvas, playbackRain, type RainPlayback } from '../site/weather';
import type { ZoneRain } from '../api/types';
import { useWeatherTime } from '../simulation/physics/useWeatherTime';

export default function RainfallOverlay({ rain, opacity, playback }: {
  rain: ZoneRain[]; opacity: number; playback?: RainPlayback;
}) {
  const { second, drift } = useWeatherTime(!!playback);
  const monochrome = !!playback;
  const cloud = useMemo(() => weatherCanvas(rain, monochrome).toDataURL(), [rain, monochrome]);
  const id = 'rain-' + useId().replaceAll(':', '');
  const bounds = { x: 29, y: 72, width: 792, height: 336 };
  if (!playback) return <image href={cloud} {...bounds} opacity={opacity / 100} pointerEvents="none" />;
  const current = playbackRain(playback, second);
  return (
    <g aria-hidden="true" data-rainfall-mm-hr={current.mmPerHr} data-cloud-drift={drift} pointerEvents="none">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" {...bounds}>
          <image href={cloud} x={bounds.x - bounds.width * (1 - drift)}
            y={bounds.y - bounds.height * (1 - drift / 4)}
            width={bounds.width * 3} height={bounds.height * 3} />
        </mask>
      </defs>
      <rect {...bounds} mask={`url(#${id})`} fill={current.color} opacity={opacity / 100 * current.strength} />
    </g>
  );
}
