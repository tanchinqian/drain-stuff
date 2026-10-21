import { drainDesign } from '../simulation/physics/design';
import type { ModelPhysics } from '../three/PhysicsOverlay';
import { cutRange, cutSample, type CutAxis } from '../three/sceneMetrics';
export default function SectionCutControls({
  physics,
  axis,
  position,
  onAxis,
  onChange,
  onActive,
  sampleDepth,
  sampleAcross,
}: {
  physics: ModelPhysics;
  axis: CutAxis;
  position: number;
  onAxis: (axis: CutAxis) => void;
  onChange: (position: number) => void;
  onActive: (active: boolean) => void;
  sampleDepth?: number;
  sampleAcross?: number;
}) {
  const d = drainDesign(physics.config),
    [min, max] = cutRange(d, axis, physics.config.kind === 'inlet');
  const sample = cutSample(
    physics.config,
    physics.frame,
    axis,
    position,
    sampleDepth,
    sampleAcross,
  );
  const text = `Cut at ${(position - min).toFixed(2)} m of ${(max - min).toFixed(2)} m`;
  return (
    <section className="section-cut" aria-label="Cross-section controls">
      <div className="section-cut-heading">
        <label htmlFor="section-cut-slider">
          Cross-section <output>{text}</output>
        </label>
        <div className="segments" aria-label="Section axis">
          {(['X', 'Y', 'Z'] as const).map((a, i) => (
            <button
              key={a}
              aria-label={a}
              title={['Across the bed', 'Along the asset', 'Depth'][i]}
              aria-pressed={axis === a}
              onClick={() => onAxis(a)}
            >
              {a} <span>{['Across', 'Along', 'Depth'][i]}</span>
            </button>
          ))}
        </div>
        <button onClick={() => onChange(0)}>Reset cut</button>
      </div>
      <input
        id="section-cut-slider"
        aria-label="Section cut position"
        aria-valuetext={text}
        type="range"
        min={min}
        max={max}
        step="0.01"
        value={position}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={() => onActive(true)}
        onBlur={() => onActive(false)}
        onPointerDown={() => onActive(true)}
        onPointerUp={(e) => onActive(document.activeElement === e.currentTarget)}
        onKeyDown={(e) => {
          if (e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
            onChange(
              Math.max(
                min,
                Math.min(max, position + (['ArrowLeft', 'ArrowDown'].includes(e.key) ? -0.1 : 0.1)),
              ),
            );
          }
        }}
      />
      <p
        className="small cut-readouts"
        data-cut-position={position}
        data-cut-axis={axis}
        data-cut-saturation={sample.saturation ?? ''}
        data-cut-front={sample.front}
        data-cut-water-depth={sample.waterDepth}
        data-cut-pipe-fill={sample.pipeFill}
      >
        Water {(sample.waterDepth * 1000).toFixed(1)} mm · Pipe {(sample.pipeFill * 100).toFixed(1)}
        % full · {sample.layer}:{' '}
        {sample.saturation === null ? 'no soil field' : `S = ${sample.saturation.toFixed(3)}`} ·
        Wetting front{' '}
        {sample.front === null ? 'not modeled here' : `${(sample.front * 1000).toFixed(0)} mm`}
      </p>
    </section>
  );
}
