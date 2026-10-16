import type { PhysicsConfig } from '../simulation/physics/config';
import type { PhysicsFrame } from '../simulation/physics/engine';
import { useMemo } from 'react';
import { drainDesign } from '../simulation/physics/design';
export default function PhysicsSection({
  config,
  frame,
  amendment,
}: {
  config: PhysicsConfig;
  frame?: PhysicsFrame;
  amendment?: { depth: number; dose: string; batch: string };
}) {
  const d = drainDesign(config);
  const field = frame?.soil;
  const soilImage = useMemo(() => {
    if (!field) return;
    const canvas = document.createElement('canvas');
    canvas.width = field.nx;
    canvas.height = field.nz;
    const ctx = canvas.getContext('2d')!,
      image = ctx.createImageData(field.nx, field.nz);
    for (let i = 0; i < field.saturation.length; i++) {
      const depth = (Math.floor(i / field.nx) + 0.5) * field.dz;
      const dry =
        depth < d.mediaDepth
          ? [201, 178, 142]
          : depth < d.mediaDepth + d.transitionDepth
            ? [232, 222, 198]
            : depth < d.soilDepth
              ? [197, 190, 170]
              : [157, 132, 101];
      const factor = 1 - 0.5 * field.saturation[i];
      for (let j = 0; j < 3; j++) image.data[i * 4 + j] = Math.round(dry[j] * factor);
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL();
  }, [field, d.mediaDepth, d.transitionDepth, d.soilDepth]);
  const v = config.values,
    inlet = config.kind === 'inlet',
    depth = inlet
      ? v.crest.value
      : 0.05 + v.mediaDepth.value + v.transitionDepth.value + v.gravelDepth.value;
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
            {layer(0, 0.05, '#bba07c')}
            {layer(0.05, v.mediaDepth.value, '#c9b28e')}
            {layer(0.05 + v.mediaDepth.value, v.transitionDepth.value, '#e8dec6')}
            {layer(
              0.05 + v.mediaDepth.value + v.transitionDepth.value,
              v.gravelDepth.value,
              '#c5beaa',
            )}
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
        {!inlet && soilImage && field && (
          <image
            href={soilImage}
            x={center - w / 2}
            y={y + d.mulchDepth * scale}
            width={w}
            height={field.depth * scale}
            preserveAspectRatio="none"
          />
        )}
        {!inlet && amendment && (
          <rect
            x={center - w / 2}
            y={y + 0.05 * scale}
            width={w}
            height={Math.min(v.mediaDepth.value, amendment.depth) * scale}
            fill="#b03a78"
            fillOpacity=".4"
          />
        )}
        {(frame?.rain ?? 0) > 0 &&
          Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${90 + i * 28} 22l3 10`} stroke="#5e564b" />
          ))}
        {water > 0 && (
          <path
            d={`M${center - w / 2} ${y}H${center + w / 2}L${center + w / 2 + v.sideSlope.value * water * scale} ${y - water * scale}H${center - w / 2 - v.sideSlope.value * water * scale}Z`}
            fill="#88afa5"
            fillOpacity=".5"
          />
        )}
        {!inlet && (
          <g>
            <defs>
              <clipPath id={'pipe-section-' + config.id}>
                <circle
                  cx={center}
                  cy={y + (depth - d.gravelDepth / 2) * scale}
                  r={(d.pipeDiameter * scale) / 2}
                />
              </clipPath>
            </defs>
            <circle
              cx={center}
              cy={y + (depth - d.gravelDepth / 2) * scale}
              r={(d.pipeDiameter * scale) / 2}
              fill="#f2eee4"
              stroke="#2f2b26"
            />
            <rect
              clipPath={'url(#pipe-section-' + config.id + ')'}
              x={center - (d.pipeDiameter * scale) / 2}
              y={
                y +
                (depth -
                  d.gravelDepth / 2 +
                  d.pipeDiameter / 2 -
                  (frame?.pipeFill ?? 0) * d.pipeDiameter) *
                  scale
              }
              width={d.pipeDiameter * scale}
              height={(frame?.pipeFill ?? 0) * d.pipeDiameter * scale}
              fill="#88afa5"
            />
          </g>
        )}
      </svg>
      <figcaption>
        {v.width.value.toFixed(2)} m {inlet ? 'chamber width' : 'bed width'} /{' '}
        {inlet
          ? `${depth.toFixed(2)} m chamber depth`
          : `${(v.mediaDepth.value * 1000).toFixed(0)} mm media, ${(v.transitionDepth.value * 1000).toFixed(0)} mm transition, ${(v.gravelDepth.value * 1000).toFixed(0)} mm gravel`}
        .<br />
        {amendment && (
          <>
            Compost amended: {(amendment.depth * 1000).toFixed(0)} mm · {amendment.dose}.<br />
          </>
        )}
        Section / water {(water * 1000).toFixed(1)} mm.
      </figcaption>
    </figure>
  );
}
