import { useEffect, useState } from 'react';
import SearchableSelect from './SearchableSelect';
import { usePhysics } from '../simulation/physics/view';
import { useSimulation } from '../simulation/physics/store';
export default function PhysicsControls({ ownerId }: { ownerId: string }) {
  const { frame } = usePhysics(ownerId),
    second = useSimulation((s) => s.second),
    playing = useSimulation((s) => s.playing),
    busy = useSimulation((s) => s.busy),
    error = useSimulation((s) => s.error),
    speed = useSimulation((s) => s.speed),
    duration = useSimulation((s) => s.configs.S1.values.duration.value),
    recovery = useSimulation((s) => s.configs.S1.values.recovery.value);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = matchMedia('(prefers-reduced-motion: reduce)'),
      change = () => setReduced(q.matches);
    change();
    q.addEventListener('change', change);
    return () => q.removeEventListener('change', change);
  }, []);
  const state = useSimulation.getState();
  return (
    <div
      className="physics-playback"
      aria-label="Shared storm playback"
      data-model-minute={Math.floor(second / 60)}
    >
      {error ? (
        <p role="alert" className="error">
          {error} <button onClick={state.retry}>Retry model</button>
        </p>
      ) : busy ? (
        <p role="status">Calculating all six feature models…</p>
      ) : null}
      <div className="actions">
        {!reduced && (
          <button disabled={busy || !!error} onClick={state.play}>
            {playing ? 'Pause storm' : 'Play storm'}
          </button>
        )}
        <button disabled={busy} onClick={() => state.seek(second - 60)}>
          Previous minute
        </button>
        <button disabled={busy} onClick={() => state.seek(second + 60)}>
          Next minute
        </button>
        <button onClick={() => state.seek(0)}>Reset storm</button>
        <span>Shared clock · minute {Math.floor(second / 60)}</span>
      </div>
      <label className="field">
        Storm timeline · includes {recovery / 3600} h after rain
        <input
          aria-label="Storm timeline"
          type="range"
          min="0"
          max={(duration + recovery) / 60}
          step="1"
          value={second / 60}
          disabled={busy || !!error}
          onChange={(e) => state.seek(Number(e.target.value) * 60)}
        />
      </label>
      {!reduced && (
        <label className="field physics-speed">
          Playback speed
          <SearchableSelect
            label="Playback speed"
            value={speed}
            onChange={(e) => state.setSpeed(Number(e.target.value))}
          >
            {[30, 60, 300, 600].map((v) => (
              <option key={v} value={v}>
                {v}x
              </option>
            ))}
          </SearchableSelect>
        </label>
      )}
      <p className="small">
        {reduced ? 'Reduced motion: use the timeline or minute buttons. ' : ''}Arrows are static;
        width shows flow. Playback is shared across the six feature pages. Speed is simulated
        seconds per real second.
      </p>
      {frame && (
        <p className="model-current" aria-live={playing ? 'off' : 'polite'}>
          Minute {Math.floor(second / 60)}: ponding{' '}
          <strong data-testid="ponding">{(frame.ponding * 1000).toFixed(1)} mm</strong>, inlet{' '}
          {(frame.flux.inlet * 60000).toFixed(1)} L/min, overflow{' '}
          {(frame.flux.overflow * 60000).toFixed(1)} L/min.
        </p>
      )}
    </div>
  );
}
