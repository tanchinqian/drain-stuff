import type { PhysicsConfig } from "./config";

/** SI dimensions shared by the ledger, solver, sections and WebGL geometry. */
export function drainDesign(config: PhysicsConfig) {
  const v = config.values;
  const media = v.mediaDepth.value,
    transition = v.transitionDepth.value,
    gravel = v.gravelDepth.value;
  const depth = media + transition + gravel;
  return {
    length: v.length.value,
    bedWidth: v.width.value,
    sideSlope: v.sideSlope.value,
    depressionDepth: v.crest.value,
    topWidth: v.width.value + 2 * v.sideSlope.value * v.crest.value,
    mulchDepth: 0.05,
    mediaDepth: media,
    transitionDepth: transition,
    gravelDepth: gravel,
    nativeDepth: config.kind === "inlet" || v.liner.value ? 0 : 0.3,
    soilDepth: depth,
    floorY: 0,
    bottomY: -0.05 - depth,
    pipeY:
      config.kind === "inlet"
        ? v.pipeDiameter.value / 2
        : -0.05 - media - transition - gravel / 2,
    pipeDiameter: v.pipeDiameter.value,
    catchment: {
      pavedArea: v.pavedArea.value,
      roofArea: v.roofArea.value,
      gutterLength: v.length.value + 1,
      // Schematic context edge only; catchment areas remain the full hydraulic inputs.
      roadWidth: Math.min(
        2.4,
        v.length.value * 0.5,
        v.pavedArea.value / Math.max(1, v.length.value),
      ),
      roofEdgeDepth: Math.min(
        1.2,
        v.roofArea.value / Math.max(1, v.length.value),
      ),
      gutterSlope: v.pipeSlope.value,
      footpathWidth: 0.65,
      kerbHeight: 0.12,
    },
  };
}
export type DrainDesign = ReturnType<typeof drainDesign>;

export function terrainHeight(d: DrainDesign, across: number) {
  return d.sideSlope > 0
    ? Math.max(0, (Math.abs(across) - d.bedWidth / 2) / d.sideSlope)
    : 0;
}
