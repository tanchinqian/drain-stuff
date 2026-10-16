# Shared DrainDesign

Round 6 first supplies the missing Round 5 prerequisites. `app/src/simulation/physics/design.ts` is the shared SI dimension adapter from `PhysicsConfig`; it never infers dimensions or conductivity from compost dose. Its `DrainDesign` contains bed width, length, depression depth and side slope, total top width, mulch/media/transition/gravel/native depths, floor/bottom elevation and pipe centre/diameter.

The swale floor is RL 0. Banks rise at the entered horizontal:vertical slope to the overflow crest. Closed bank prisms extend down to the layer base; the pond is the matching trapezoidal volume. Soil layers are closed solids below the floor, with native soil below unless lined. Tree pits use the same section with their smaller entered dimensions; the inlet is a vertical-sided chamber without soil.

The hydraulic ledger, soil domain, 3D geometry and overlays use this adapter. Readable parameter controls still edit PhysicsConfig. Opening a completed feature run selects its peak surface depth. A compact playback toolbar includes a direct Storm settings link and a tailwater chip. These prerequisites were absent before this round.

The soil grid covers the bed width, not separate bank infiltration. Its transverse field is extruded along the feature length. This is an illustrative uncalibrated design; geometry is not a survey or an engineering detail drawing.
