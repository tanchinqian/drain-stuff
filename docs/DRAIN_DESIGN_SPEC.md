# Shared DrainDesign

Round 6 first supplies the missing Round 5 prerequisites. `app/src/simulation/physics/design.ts` is the shared SI dimension adapter from `PhysicsConfig`; it never infers dimensions or conductivity from compost dose. Its `DrainDesign` contains bed width, length, depression depth and side slope, total top width, mulch/media/transition/gravel/native depths, floor/bottom elevation and pipe centre/diameter.

The swale floor is RL 0. Banks rise at the entered horizontal:vertical slope to the overflow crest. Closed bank prisms extend down to the layer base; the pond is the matching trapezoidal volume. Soil layers are closed solids below the floor, with native soil below unless lined. Tree pits use the same section with their smaller entered dimensions; the inlet is a vertical-sided chamber without soil.

The hydraulic ledger, soil domain, 3D geometry and overlays use this adapter. Readable parameter controls still edit PhysicsConfig. Opening a completed feature run selects its peak surface depth. A compact playback toolbar includes a direct Storm settings link and a tailwater chip. These prerequisites were absent before this round.

The soil grid covers the bed width, not separate bank infiltration. Its transverse field is extruded along the feature length. This is an illustrative uncalibrated design; geometry is not a survey or an engineering detail drawing.

## Round 7 catchment context

`DrainDesign.catchment` adds full hydraulic `pavedArea` and `roofArea`, schematic `gutterLength`, `gutterSlope`, `roadWidth`, `roofEdgeDepth`, `footpathWidth` and `kerbHeight`. The road and roof represent nearby edges only; the drawn patch is deliberately smaller than the full contributing catchment area. Road edge width is bounded by half the feature length, 2.4 m and area/feature length. Roof edge depth is bounded by 1.2 m and area/feature length. Footpath width 0.65 m and kerb height 0.12 m are visual placeholders. Gutter slope reuses entered pipe slope because independent gutter geometry is unavailable; it is not fed back into the hydraulic network.

Cutaway labels and contours read the cached field; amended depth comes from the allocation. The S=0.5 depth is an interpolation through grid cells, clamped to the media thickness. See `ROUND7_VISIBILITY.md` for the visibility and performance evidence.
