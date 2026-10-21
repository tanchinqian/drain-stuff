# Visible water interactions — Round 9C

All motion is a display of engine or constrained surface-grid values. No interaction below changes the hydraulic ledger. Dimensions, roughness and appearance remain illustrative.

| Material | Implemented response and input | Evidence |
|---|---|---|
| Asphalt, concrete, kerb | Engine surface wetness reduces albedo and roughness; actual surface collision gives rain splashes. Road crossfall and gutter slope are shared with the flow terrain. | `materialInteractions.test.ts` wet-finish test; `rainPhysics.test.ts`; scene captures |
| Roof and downpipe | Continuous roof/gutter/downpipe/lot-drain/crossing geometry; every step uses the engine roof-link discharge. Zero roof area gives zero roof flow. | `flowPhysics.test.ts` continuity and roof-source checks; S1/R1 browser flow test |
| Mulch | The engine's retained surface wetness drives the film-like gloss and darkening (its existing drying memory is 1,800 s). A small subset of chips lifts to the water surface above 60 mm ponding; others stay in the bed. No separate film volume is invented. | Material film/lift test; shader-error browser check; wet/dry captures |
| Amended soil/media | Saturation texture darkens the soil; amendment tint and S=0.5 contour use the Richards field; the constrained grid edge moves with storage and infiltration. | Existing moisture/front tests; surface reconciliation tests |
| Sand/transition | Samples the deeper Richards cells; its wetting response follows that layer rather than an invented animation delay. | Saturation-response test and section captures |
| Gravel | Saturation colour; seepage only in columns at S>=0.85 and only with positive underdrain flux. | `flowPhysics.test.ts` pore-streak gating |
| Geotextile | A 3 mm separator in the transition group darkens with sampled saturation; it has no independent flow emitter. | Material saturation response; section captures |
| Perforated pipe | Sloped internal circular-segment water at engine y/D; engine velocity drives texture travel; full-pipe state suppresses the free-surface ripple response. | Flow tests and existing rendered fill/speed agreement checks |
| Compost sock | Clog/wetness darkening; raised, rough obstacle in the surface grid gives upstream backwater; inlet-flux-driven seepage trace and recorded deposit meshes. | Material sock shading/head-difference test; fault cue presence/removal browser checks |
| Check dams/rock dissipator | Installed dam crests obstruct the grid. Spill requires head above crest and downstream water; local head difference sets the illustrative weir sheet/droplet rate. Rock roughness changes local velocity; Froude-derived foam marks turbulence. | Dry/overtopped dam tests; material spill gating; field screenshots |
| Vegetation | Existing wind sway plus grid-velocity bending; lower blades darken where grid water wets them. | Browser shader check; wet/peak captures |
| Leaves/litter | Folded leaf meshes rest on soil/water and advect at sampled grid velocity. Restriction rules stop leaves at inlet/sock; recorded obstruction meshes cover the inlet for a blockage finding. | Leaf advection/trap test; fault cue screenshots and verified-fault removal test |

## Limits

- The underlying Richards field is across-bed/depth, repeated along the asset length. The surface water varies in two horizontal dimensions; the soil solver has not been converted to a 3D model.
- Fine splash specks, foam, chip flotation and leaf count are representative visuals, not separately conserved water or sediment masses. The surface solver stores conserved water; rain impulses have zero net volume.
- Internal dam sheets use local display-grid head differences. Engine inlet/outlet/overflow quantities remain authoritative and are reported separately in the stage strip.
- Source-to-sink routing in the display grid is constrained to engine bed and kerb-node storage. It is not a calibrated street flood prediction.
