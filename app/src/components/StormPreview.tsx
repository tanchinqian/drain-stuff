import { useEffect, useMemo, useState } from 'react';
import { simulateStorm, stormAssumptions } from '../simulation/storm';
import StormScene from '../three/StormScene';

export default function StormPreview() {
  const [rain, setRain] = useState(60),
    [duration, setDuration] = useState(45),
    [blockage, setBlockage] = useState(0);
  const [minute, setMinute] = useState(0),
    [playing, setPlaying] = useState(false);
  const frames = useMemo(
    () => simulateStorm({ rain, duration, blockage }),
    [rain, duration, blockage],
  );
  const index = Math.min(minute, frames.length - 1),
    frame = frames[index];
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setMinute((t) => Math.min(t + 1, frames.length - 1)),
      150,
    );
    return () => window.clearInterval(timer);
  }, [playing, frames.length]);
  useEffect(() => {
    if (minute >= frames.length - 1) setPlaying(false);
  }, [minute, frames.length]);
  const change = (setter: (v: number) => void, value: number) => {
    setter(value);
    setMinute(0);
    setPlaying(false);
  };
  return (
    <section className="panel storm-preview" aria-labelledby="storm-title">
      <div className="panel-heading">
        <div>
          <h2 id="storm-title">Try a storm at S1</h2>
          <p className="sub">
            Illustrative simulation · Household catchment · Not a flood forecast
          </p>
        </div>
        <a className="button" href="#drain-assembly">
          Inspect drainage parts
        </a>
      </div>
      <div className="storm-controls">
        <label className="field">
          Rain intensity · {rain} mm/h
          <input
            aria-label="Rain intensity"
            type="range"
            min="0"
            max="120"
            step="5"
            value={rain}
            onChange={(e) => change(setRain, +e.target.value)}
          />
        </label>
        <label className="field">
          Rain duration · {duration} min
          <input
            aria-label="Rain duration"
            type="range"
            min="5"
            max="120"
            step="5"
            value={duration}
            onChange={(e) => change(setDuration, +e.target.value)}
          />
        </label>
        <label className="field">
          Outlet blockage · {blockage}%
          <input
            aria-label="Outlet blockage"
            type="range"
            min="0"
            max="100"
            step="10"
            value={blockage}
            onChange={(e) => change(setBlockage, +e.target.value)}
          />
        </label>
      </div>
      <StormScene frame={frame} />
      <div className="storm-playback">
        <button
          onClick={() => {
            if (index === frames.length - 1) setMinute(0);
            setPlaying(!playing);
          }}
        >
          {playing ? 'Pause storm' : index === frames.length - 1 ? 'Replay storm' : 'Play storm'}
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setMinute(0);
          }}
        >
          Reset storm
        </button>
        <span>
          {index === 0 ? 'Ready' : frame.rain > 0 ? 'Raining' : 'Rain stopped · Draining'} · {index}{' '}
          min
        </span>
      </div>
      <label className="field">
        Storm timeline · Includes 180 minutes after rain
        <input
          aria-label="Storm timeline"
          type="range"
          min="0"
          max={frames.length - 1}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            setMinute(+e.target.value);
          }}
        />
      </label>
      <div className="summary-strip storm-readings" aria-label="Simulated water readings">
        <div>
          <small>Runoff into inlet</small>
          {frame.runoff.toFixed(1)} L/min
        </div>
        <div>
          <small>Through soil layers</small>
          {frame.infiltration.toFixed(1)} L/min
        </div>
        <div>
          <small>Outlet flow</small>
          {frame.outlet.toFixed(1)} L/min
        </div>
        <div>
          <small>Surface ponding</small>
          <output data-testid="ponding">{frame.ponding.toFixed(0)} mm</output>
        </div>
        <div>
          <small>Total overflow</small>
          {(frame.overflow * 1000).toFixed(0)} L
        </div>
      </div>
      <p className="small">
        Water beads mark active flow; their motion follows the timeline. Blue surface depth shows
        ponding (visually exaggerated). Changing a setting restarts the scenario.
      </p>
      <details>
        <summary>Simulation assumptions and limits</summary>
        <p className="small">
          Illustrative catchment {stormAssumptions.catchment} m², 85% runoff, bed area 18 m²,
          maximum ponding 250 mm, media storage 1,800 L, infiltration up to 60 mm/h and clear outlet
          capacity 15 L/min. Blockage reduces the outlet capacity; full media storage slows
          infiltration and raises surface water. Each step accounts for one minute. Overflow leaves
          the model; the timeline may end with water remaining. Uniform rain, simplified storage, no
          surveyed routing or calibrated soil behaviour. Results do not change sensor readings or
          trial records.
        </p>
      </details>
    </section>
  );
}

