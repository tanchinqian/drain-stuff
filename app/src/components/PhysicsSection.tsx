import type { PhysicsConfig } from '../simulation/physics/config';
import type { PhysicsFrame } from '../simulation/physics/engine';
import { useMemo } from 'react';
import { drainDesign } from '../simulation/physics/design';
import { cutSample, type CutAxis } from '../three/sceneMetrics';
import { useSceneCuts } from '../three/sceneCuts';
export default function PhysicsSection({
  config,
  frame,
  amendment,
  cutAxis: requestedAxis,
  cutPosition: requestedPosition,
  onSampleDepth,
  onSampleAcross,
}: {
  config: PhysicsConfig;
  frame?: PhysicsFrame;
  amendment?: { depth: number; dose: string; batch: string };
  cutAxis?: CutAxis;
  cutPosition?: number;
  onSampleDepth?: (depth: number) => void;
  onSampleAcross?: (across: number) => void;
}) {
  const savedCut = useSceneCuts((s) => s.cuts[config.id]);
  const cutAxis = requestedAxis ?? savedCut?.axis ?? 'X',
    cutPosition = requestedPosition ?? savedCut?.position ?? 0;
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
      const column = Math.max(
        0,
        Math.min(field.nx - 1, Math.floor((cutPosition / field.width + 0.5) * field.nx)),
      );
      const sample =
        cutAxis === 'X'
          ? field.saturation[Math.floor(i / field.nx) * field.nx + column]
          : cutAxis === 'Z'
            ? field.saturation[
                Math.max(
                  0,
                  Math.min(field.nz - 1, Math.floor((-cutPosition - d.mulchDepth) / field.dz)),
                ) *
                  field.nx +
                  (i % field.nx)
              ]
            : field.saturation[i];
      const factor = 1 - 0.5 * sample;
      for (let j = 0; j < 3; j++) image.data[i * 4 + j] = Math.round(dry[j] * factor);
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL();
  }, [field, d.mediaDepth, d.transitionDepth, d.soilDepth, cutAxis, cutPosition, d.mulchDepth]);
  const v = config.values,
    side = cutAxis === 'X' ? 0 : config.values.sideSlope.value,
    inlet = config.kind === 'inlet',
    depth = inlet
      ? v.crest.value
      : 0.05 + v.mediaDepth.value + v.transitionDepth.value + v.gravelDepth.value;
  const water = frame?.ponding ?? 0,
    upper = Math.max(v.crest.value, water, 0.01);
  const cutDepth = -cutPosition - d.mulchDepth,
    sliceLayer = cutSample(config, frame, cutAxis, cutPosition).layer;
  const solverSlice =
    !!field &&
    (cutAxis !== 'X' || Math.abs(cutPosition) <= field.width / 2) &&
    (cutAxis !== 'Z' || (cutDepth >= 0 && cutDepth <= field.depth));
  const horizontalContours: number[] = [];
  if (field && cutAxis === 'Z' && solverSlice) {
    const row = Math.max(0, Math.min(field.nz - 1, Math.floor(cutDepth / field.dz)));
    for (let i = 0; i < field.nx - 1; i++) {
      const a = field.saturation[row * field.nx + i],
        b = field.saturation[row * field.nx + i + 1];
      if ((a < 0.5 && b >= 0.5) || (a >= 0.5 && b < 0.5))
        horizontalContours.push(185 - ((i + 0.5 + (0.5 - a) / (b - a)) / field.nx) * 160);
    }
  }
  const scale = Math.min(
    100,
    400 / ((cutAxis === 'X' ? d.length : v.width.value) + 2 * side * upper),
    inlet ? 145 / upper : Math.min(110 / depth, 65 / upper),
  );
  const w = (cutAxis === 'X' ? d.length : v.width.value) * scale,
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
        data-section-cut-axis={cutAxis}
        data-section-cut-position={cutPosition}
        onPointerMove={(e) => {
          const svg = e.currentTarget,
            point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
              svg.getScreenCTM()!.inverse(),
            );
          onSampleDepth?.(
            cutAxis === 'Z' ? -cutPosition - d.mulchDepth : (point.y - y) / scale - d.mulchDepth,
          );
          onSampleAcross?.(
            cutAxis === 'X'
              ? cutPosition
              : cutAxis === 'Z'
                ? (-(point.y - 105) / 160) * d.bedWidth
                : (point.x - center) / scale,
          );
        }}
      >
        <text x="12" y="14" fill="#5e564b" fontSize="10">
          {cutAxis === 'X'
            ? 'Longitudinal section'
            : cutAxis === 'Y'
              ? 'Cross section'
              : 'Depth slice'}{' '}
          · cut {cutPosition.toFixed(2)} m
        </text>
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
              d={`M${center - w / 2 - side * v.crest.value * scale} ${y - v.crest.value * scale}L${center - w / 2} ${y}H${center + w / 2}L${center + w / 2 + side * v.crest.value * scale} ${y - v.crest.value * scale}`}
              fill="none"
              stroke="#5e564b"
              strokeWidth="2"
            />
            {cutAxis !== 'X' && (
              <circle
                cx={center}
                cy={y + (depth - v.gravelDepth.value / 2) * scale}
                r={(v.pipeDiameter.value * scale) / 2}
                fill="#f2eee4"
                stroke="#2f2b26"
              />
            )}
            {config.kind === 'tree_pit' && (
              <path d="M250 85V25M250 45L230 30M250 55L270 35" stroke="#79624a" strokeWidth="5" />
            )}
          </>
        )}
        {!inlet && soilImage && field && solverSlice && (
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
            d={`M${center - w / 2} ${y}H${center + w / 2}L${center + w / 2 + side * water * scale} ${y - water * scale}H${center - w / 2 - side * water * scale}Z`}
            fill="#88afa5"
            fillOpacity=".5"
          />
        )}
        {!inlet && cutAxis !== 'X' && (
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
        {!inlet && cutAxis === 'X' && Math.abs(cutPosition) < d.pipeDiameter / 2 && (
          <g>
            <rect
              x={center - w / 2}
              y={y + (depth - d.gravelDepth / 2 - d.pipeDiameter / 2) * scale}
              width={w}
              height={d.pipeDiameter * scale}
              fill="#f2eee4"
              stroke="#5e564b"
            />
            <rect
              x={center - w / 2}
              y={
                y +
                (depth -
                  d.gravelDepth / 2 +
                  d.pipeDiameter / 2 -
                  (frame?.pipeFill ?? 0) * d.pipeDiameter) *
                  scale
              }
              width={w}
              height={(frame?.pipeFill ?? 0) * d.pipeDiameter * scale}
              fill="#88afa5"
            />
          </g>
        )}
        {!inlet &&
          field &&
          solverSlice &&
          field.saturation.some((s) => s >= 0.5) &&
          cutAxis !== 'Z' && (
            <path
              d={Array.from({ length: field.nx }, (_, i) => {
                const across =
                    cutAxis === 'X' ? cutPosition : ((i + 0.5) / field.nx - 0.5) * field.width,
                  front = cutSample(config, frame, 'X', across).front ?? 0;
                return `${i ? 'L' : 'M'}${center - w / 2 + ((i + 0.5) / field.nx) * w} ${y + (d.mulchDepth + front) * scale}`;
              }).join(' ')}
              fill="none"
              stroke="#ede8d6"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          )}
        {cutAxis === 'Z' && (
          <g>
            <rect
              x="55"
              y="25"
              width="390"
              height="160"
              fill={
                inlet || !solverSlice
                  ? cutSample(config, frame, cutAxis, cutPosition).layer === 'Chamber water'
                    ? '#88afa5'
                    : cutSample(config, frame, cutAxis, cutPosition).layer === 'Sediment'
                      ? '#766048'
                      : '#ddd6c6'
                  : '#766048'
              }
            />
            {soilImage && solverSlice && (
              <image
                href={soilImage}
                transform="translate(55 185) rotate(-90)"
                x="0"
                y="0"
                width="160"
                height="390"
                preserveAspectRatio="none"
              />
            )}
            {horizontalContours.map((y, i) => (
              <path
                key={i}
                d={`M55 ${y}H445`}
                fill="none"
                stroke="#ede8d6"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            ))}
          </g>
        )}
        <text x="12" y="208" fill="#5e564b" fontSize="10">
          Typical design, not surveyed
        </text>
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
        Section / water {(water * 1000).toFixed(1)} mm. Cut {cutPosition.toFixed(2)} m on {cutAxis};
        S = 0.5 is the wetting-front contour.
        {cutAxis === 'Z' && (
          <>
            {' '}
            Horizontal slice: {sliceLayer}.{' '}
            {inlet
              ? 'No soil solver in the chamber.'
              : 'Soil field varies across the bed and is uniform along its length.'}
          </>
        )}
      </figcaption>
    </figure>
  );
}
