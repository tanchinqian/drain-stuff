import type { PhysicsConfig } from '../simulation/physics/config';
import type { PhysicsFrame } from '../simulation/physics/engine';
export default function PhysicsSection({
  config,
  frame,
}: {
  config: PhysicsConfig;
  frame?: PhysicsFrame;
}) {
  const v = config.values,
    inlet = config.kind === 'inlet',
    depth = inlet
      ? v.crest.value
      : v.mediaDepth.value + v.transitionDepth.value + v.gravelDepth.value;
  const water = frame?.ponding ?? 0,
    upper = Math.max(v.crest.value, water, 0.01);
  const scale = Math.min(
    100,
    400 / (v.width.value + 2 * v.sideSlope.value * upper),
    inlet ? 145 / upper : Math.min(110 / depth, 65 / upper),
  );
  const w = v.width.value * scale,
    center = 250,
    y = inlet ? 180 : 85;
  const layer = (top: number, thickness: number, color: string) => (
    <rect
      x={center - w / 2}
      y={y + top * scale}
      width={w}
      height={thickness * scale}
      fill={color}
      stroke="#5e564b"
    />
  );
  return (
    <figure className="physics-section">
      <svg
        viewBox="0 0 500 215"
        role="img"
        aria-label={`${config.id} ${config.kind} section; dimensions from model parameters`}
        data-section-ponding-mm={water * 1000}
      >
        {inlet ? (
          <>
            <path
              d={`M${center - w / 2} ${y - depth * scale}V${y}H${center + w / 2}V${y - depth * scale}`}
              fill="#ddd6c6"
              stroke="#5e564b"
              strokeWidth="7"
            />
            <path
              d={`M${center - w / 2} ${y - depth * scale}H${center + w / 2}M${center + w / 2} ${y - (v.pipeDiameter.value * scale) / 2}h60`}
              stroke="#2f2b26"
              strokeWidth="3"
            />
          </>
        ) : (
          <>
            {layer(0, v.mediaDepth.value, '#c9b28e')}
            {layer(v.mediaDepth.value, v.transitionDepth.value, '#e8dec6')}
            {layer(v.mediaDepth.value + v.transitionDepth.value, v.gravelDepth.value, '#c5beaa')}
            <path
              d={`M${center - w / 2 - v.sideSlope.value * v.crest.value * scale} ${y - v.crest.value * scale}L${center - w / 2} ${y}H${center + w / 2}L${center + w / 2 + v.sideSlope.value * v.crest.value * scale} ${y - v.crest.value * scale}`}
              fill="none"
              stroke="#5e564b"
              strokeWidth="2"
            />
            <circle
              cx={center}
              cy={y + (depth - v.gravelDepth.value / 2) * scale}
              r={(v.pipeDiameter.value * scale) / 2}
              fill="#f2eee4"
              stroke="#2f2b26"
            />
            {config.kind === 'tree_pit' && (
              <path d="M250 85V25M250 45L230 30M250 55L270 35" stroke="#79624a" strokeWidth="5" />
            )}
          </>
        )}
        {water > 0 && (
          <path
            d={`M${center - w / 2} ${y}H${center + w / 2}L${center + w / 2 + v.sideSlope.value * water * scale} ${y - water * scale}H${center - w / 2 - v.sideSlope.value * water * scale}Z`}
            fill="#61cce9"
            fillOpacity=".6"
          />
        )}
      </svg>
      <figcaption>
        {v.width.value.toFixed(2)} m {inlet ? 'chamber width' : 'bed width'} /{' '}
        {inlet
          ? `${depth.toFixed(2)} m chamber depth`
          : `${(v.mediaDepth.value * 1000).toFixed(0)} mm media, ${(v.transitionDepth.value * 1000).toFixed(0)} mm transition, ${(v.gravelDepth.value * 1000).toFixed(0)} mm gravel`}
        .<br />
        Synthetic section / water {(water * 1000).toFixed(1)} mm.
      </figcaption>
    </figure>
  );
}
