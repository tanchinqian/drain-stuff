import { useEffect, useState } from 'react';
import SearchableSelect from './SearchableSelect';
import { useSimulation } from '../simulation/physics/store';
import { playbackRain, type RainPlayback } from '../site/weather';

export default function StormMapPlayback({ playback }: { playback: RainPlayback }) {
  const second = useSimulation((state) => state.second);
  const playing = useSimulation((state) => state.playing);
  const speed = useSimulation((state) => state.speed);
  const duration = useSimulation((state) => state.configs.S1.values.duration.value);
  const recovery = useSimulation((state) => state.configs.S1.values.recovery.value);
  const [includeRecovery, setIncludeRecovery] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(query.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  const state = useSimulation.getState(), end = duration + recovery;
  const showingRecovery = includeRecovery || second > duration;
  const timelineEnd = showingRecovery ? end : duration;
  const current = playbackRain(playback, second);
  const peak = playback.points.reduce((best, point) => point.intensity > best.intensity ? point : best, playback.points[0]);
  return (
    <div className="physics-playback storm-map-playback" aria-label="Storm map playback" data-model-second={second}>
      <div className="actions">
        {!reduced && <button onClick={state.play}>{playing ? 'Pause storm' : second >= duration && second < end ? 'Play recovery' : 'Play storm'}</button>}
        <button onClick={() => state.seek(0)}>Reset storm</button>
        <button onClick={() => state.seek(peak.second)}>Jump to peak rainfall</button>
      </div>
      <label className="field">
        {showingRecovery ? `Storm and drainage timeline · ${end / 60} min` : `Rainfall timeline · ${duration / 60} min`}
        <input aria-label="Storm map timeline" type="range" min="0" max={timelineEnd / 60} step="any"
          value={second / 60} onChange={(event) => state.seek(Number(event.target.value) * 60)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={showingRecovery} onChange={(event) => {
          setIncludeRecovery(event.target.checked);
          if (!event.target.checked && second > duration) state.seek(duration);
        }} />{' '}
        Include {recovery / 3600} h of drainage recovery
      </label>
      {!reduced && (
        <label className="field physics-speed">
          Playback speed
          <SearchableSelect label="Playback speed" value={speed} onChange={(event) => state.setSpeed(Number(event.target.value))}>
            {[30, 60, 300, 600].map((value) => <option key={value} value={value}>{value}× · {value / 60} min/s</option>)}
          </SearchableSelect>
        </label>
      )}
      <p className="small rainfall-instant">
        {playing ? 'Playing' : 'Paused'} · Minute {(second / 60).toFixed(1)} / {timelineEnd / 60} · {current.mmPerHr.toFixed(1)} mm/h ·{' '}
        {second >= end ? 'Playback complete' : second >= duration ? 'After rain · drainage recovery' : 'Rainfall'}
      </p>
      {!playing && second >= duration && second < end && (
        <p className="small">Rainfall has ended, so the cloud is clear. Play recovery to continue through drainage.</p>
      )}
      <p className="small">
        Cloud movement illustrates playback; rainfall intensity is uniform across zones. 3D, Plan and asset views share the clock.
        {reduced ? ' Use the timeline to step through the storm with reduced motion.' : ' Speed is simulated time per real second.'}
      </p>
    </div>
  );
}
