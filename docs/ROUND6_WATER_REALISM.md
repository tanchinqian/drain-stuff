# Round 6 water realism — implementation and acceptance

This round replaces bulk media infiltration with a worker-based mixed-form Richards field. The missing Round 5 dimension/depression/peak-opening/compact-toolbar prerequisites were implemented first. Radar colours and the existing cream/brown interface remain; water uses a depth-dependent restrained tint rather than the former flat cyan slab.

## Tailwater finding

The code default is **0 m**. The High tailwater scenario sets **0.8 m**, not 0.5 m. The shared simulation store is in memory and does not persist a previous session's tailwater. The recorded **0.50 m** therefore matches an entered value through the slider or parameter editor, rather than the default or the High tailwater preset. No interaction audit exists for that recording, so which control was used cannot be proved. A toolbar chip now states “Tailwater 0.50 m: outfall submerged”, and the model draws the downstream level. It is a one-way boundary, not reverse river flow.

## Implemented scope

1. **Soil solver:** 48 × 32 bed-section finite volumes, layered van Genuchten–Mualem functions, mixed-form modified Picard iteration with diagonal mass, vertical Thomas line solves, lateral iteration, timestep bisection on nonconvergence, rain-boundary splitting in the coupled engine, supplied-water/ponded top boundary, underdrain sink, free-draining or lined bottom. Uniform transverse fields use an exact symmetry reduction; asymmetric fields use the full 2D stencil. Per-minute Float32 theta/S fields are cached and transferred from the worker. No WebGPU.
2. **Wet soil:** linearly filtered DataTexture; albedo falls to half dry reflectance at S=1, roughness falls from 0.9 to 0.35. Soil, mulch and stencil caps sample the same field; the 2D section displays the same samples. A cached surface wetness memory decays over 30 minutes after recession. This optical mapping is illustrative.
3. **Pond:** geometry follows the shared trapezoidal depression and engine depth, with physical-material transmission/attenuation, sky Fresnel contribution, subtle normal perturbations and impact rings. Shoreline opacity fades with local depth. Low quality omits transmission.
4. **Sections:** stencil-buffer back/front counting and layer-material caps, enabled for all cut axes. Soil layers are closed; the gravel solid has a pipe bore. Water and filled pipe volumes also have stencil caps, giving the appropriate band or circular segment at the cut. The 2D transverse pipe circle is clipped to engine y/D.
5. **Rain:** deterministic jittered instancing proportional to current rain, real-time fall rate about 7 m/s independent of playback, wind-consistent streaks, ray intersections against the shared terrain and water plane, impact rings/splashes, exactly zero instances at zero rain. Reduced motion leaves a static sample.
6. **Flow path:** inlet sheet/backwater from inlet discharge/upstream storage, clog-related sock darkening, seepage instances only when underdrain discharge is positive, pipe fill/velocity from engine quantities, outfall discharge sheet and downstream water, overflow only at positive overflow discharge.

### Explicit limits

- This is uncalibrated, 2D and isothermal; no hysteresis, macropores, preferential flow, sediment transport, reverse tailwater flow or longitudinal pipe profile is solved.
- The grid covers bed width; bank infiltration is not separately solved. Current uniform lateral boundary conditions produce a transversely symmetric field; the asymmetric-stencil test checks lateral transport, but no surveyed soil heterogeneity was supplied.
- Forebay/sock share the inlet routing state; they are not independently solved chambers. Pipe filling now comes from a finite pipe storage reservoir, with Manning/travel/tailwater-limited outfall. Q/A uses its circular segment; this is not a longitudinal/dynamic-wave sewer solution. This fixes the chamber case where an instantaneously passed flow previously left zero displayed depth.
- Soil storage in the event ledger is change from the initialized retention field. Tiny background native drainage can make this change negative in a zero-rain run; this is balanced by native outflow, not fabricated rain.
- Fresh solver snapshots replace old bulk-model regression numbers. Human trial records and compost doses remain separate; media Ks still comes from the trial or an explicit entered value.

## Results

Production build passed. **62 unit checks** passed across eleven files. All **four requested feature browser cases passed against the final source**, across the S1/S3 run and the final I1/T1 run; the latter also captures the inlet's extra cut axes. The failed intermediate attempts were test harness issues (development module identity, hidden Debug controls and a range-value literal), rather than waived physical assertions. Final metrics are the individual `S1/S3/I1/T1-metrics.json` files under `docs/screens/round6/`; `preliminary-browser-metrics.json` is an earlier archive.

| Brief item | Status | Result / reason |
| --- | --- | --- |
| Round 5 prerequisites | Done | Shared dimensions, closed depression, peak opening and compact playback/settings link supplied first. |
| 1 Richards solver | Done | Mixed-form field, van Genuchten–Mualem layers, adaptive modified Picard, conservative coupling, native/liner/drain boundaries and cached minute arrays. Bed-only domain and uniform transverse forcing are explicit limits. |
| 2 Wet soil | Done | Same S field on soil/mulch/caps/2D; monotone darkening, roughness and decaying surface memory. Optical mapping remains illustrative. |
| 3 Pond | Done | Matching depression/stage, clear transmission/depth tint, Fresnel/normal response, shoreline fade and rain impacts. Low quality uses an inexpensive translucent approximation. |
| 4 Cross-section | Done | Closed layer solids and stencil caps, plus solid fluid caps and pipe circular segments. |
| 5 Rain | Done | Jittered intensity-scaled instancing, real-time fall, terrain/water ray intersections and short impact effects; no instances at zero rainfall. |
| 6 Drain flow | Done | Engine-driven inlet/backwater, wet/clogged sock, seepage, finite pipe storage, Q/A motion, outfall and overflow; explicit submerged tailwater. Forebay/sock routing is still shared. |
| 7 Tests | Partly done | Numerical/build and requested capture checks pass. Detailed visual/CI/performance limits are listed below. |
| 8 Docs/honesty | Done | Model/parameter/backend documents updated, placeholder tables cited, and Model details labels the soil model uncalibrated. No new accuracy claim. |

### Test-by-test acceptance

| Test | Status | Measured result / reason |
| --- | --- | --- |
| 7.1 Mass balance | Done | Ponded grid check: absolute accumulated residual about 2.36e-10 m3 for 0.399 m3 input. Captured S1 combined maximum relative residual 2.13e-8; S3 6.01e-8. All six high-rainfall feature checks satisfy the existing 1e-6 combined tolerance, including pipe storage. |
| 7.2 Grid convergence | Done | Refining 24×32 to 48×64 changes cumulative infiltration from 33.201 to 32.895 mm: **0.93%**, below 5%. |
| 7.3 Physical sanity | Done | S=0.5 front advances monotonically in the ponded check; 32.895 mm infiltration lies between Ks·t=7.368 mm and the Green–Ampt comparator 38.431 mm. The comparator uses the same texture with suction=1/alpha and 0.1 m ponding. Doubling Ks increases infiltration to 49.258 mm on the coarse grid. An asymmetric field also exercises lateral transport. |
| 7.4 Visual agreement | Partly done | Actual rendered surface bounds agree within 1 mm; pipe geometry/engine fill within 0.01. Zero-rain and zero-underdrain instance gates, overflow presence, circular-area Q/A and zero-flow source gates are checked. Shader flow motion follows v in source, but positive-flow pixel displacement has not been independently measured. |
| 7.5 Darkening | Done | Sampled albedo mapping decreases monotonically with S and reaches half dry albedo at S=1; shader/2D mapping follows that function. |
| 7.6 Performance | Partly done | Full S1 browser worker: **684.6 ms**, below the locally enforced **5000 ms** budget. Current 1440px headless window: **7.97 requestAnimationFrame fps**, renderer counter **7.3 fps**, automatic low quality. **The ≥50 fps acceptance target and 60 fps aspiration are not achieved in this headless environment.** No integrated-GPU hardware or CI runner was measured; the run-time assertion is ready for CI but no CI result is claimed. |
| 7.7 Captures | Done | S1/S3/I1/T1 at minute 0, mid-rise, peak and two hours after rain in assembled 3D and section, plus peak 2D and extra inlet cut-axis views. Screens under `docs/screens/round6/`. |

The code and tests are committed to the existing repository branch; the matching production app is published to the existing Drain Trial Console site. No field calibration, survey or hardware validation is implied by these checks.
