import { useEffect, useState } from 'react';
import { useSimulation } from './store';

// Interpolate only the weather overlay; the shared model clock stays at 10 Hz.
export function useWeatherTime(enabled: boolean) {
  const second = useSimulation((s) => enabled ? s.second : 0);
  const playing = useSimulation((s) => enabled && s.playing);
  const speed = useSimulation((s) => s.speed);
  const duration = useSimulation((s) => s.configs.S1.values.duration.value);
  const [visualSecond, setVisualSecond] = useState(second);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(motion.matches);
    motion.addEventListener('change', change);
    return () => motion.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    setVisualSecond(second);
    if (!playing || reduced) return;
    const started = performance.now();
    let frame: number;
    const tick = (now: number) => {
      if (!document.hidden) setVisualSecond(second + Math.min(0.1, (now - started) / 1000) * speed);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [second, playing, speed, reduced]);
  return { second: visualSecond, drift: reduced ? 0 : Math.min(1, visualSecond / Math.max(1, duration)) };
}
