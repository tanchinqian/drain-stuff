# Round 9 — drainage scene realism

Implemented against the existing Round 8B branch base (`35fc2f1`). The user approved realistic scene colours on 18 October 2026. Remote `main` has not yet merged Round 8B; no merge, push or deployment is part of this pass.

## Scope and entry points

Open `/feature/S1` or `/feature/R1`. Camera presets are **Overview**, **Drain** and **Inlet**; **Return to default** restores the prior framing. The cross-section slider and X Across / Y Along / Z Depth switches sit directly under the canvas. Focus the slider to reveal the draggable cut plane. Arrow keys use 1 cm steps, Shift+Arrow uses 10 cm, and Home/End select the limits. Axis and position persist per asset in session storage, and both existing 2D section views share the same cut.

**View controls → Render quality → Record** uses DPR 2, up to 4,096 rain instances and a softer 2,048-pixel shadow map. Adaptive defaults retain the existing quality reduction path with a shader warmup period and two consecutive slow samples before stepping down. FPS and renderer detail remain in Debug.

The numerical engine, Richards solver, saved scenarios, board, API and AI are unchanged. Shared scene components are inherited by S2, S3, I1 and the existing tree-pit scene. Compost keeps its prior axis and highlight behaviour. The Map desk chrome and radar colours are retained.

## Requirement status

| Section | Status | Result / limit |
|---|---|---|
| 1 Ground and surroundings | Partly done | Textured terrain around the excavation, road/kerb/gutter/opening, paving, grounded terrace fronts, windows/doors, roof/gutter/downpipe, a three-colour context atlas and sparse instanced props. Overcast sky and distance fog are present, but the preserved orthographic framing does not present a full natural horizon. Context remains a stylised, low-poly typical place rather than a surveyed or photoreal location. |
| 2 Rain and atmosphere | Done | Near/far instanced rain, stronger intensity-dependent streaks, hard-surface impacts and pond rings, rain-gated mist, overcast light, soft shadows and engine-derived wet/drying materials. All rain and mist disappear at zero rain. |
| 3 Water | Done | Retained physical refraction, sky Fresnel/depth tint, softer shoreline and varied rain-ring phases. Inlet sheets and foam/flow traces follow inlet discharge; soil/gravel follow saturation; pipe fill/velocity follow the frame; an outlet trajectory connects the pipe to its pool. Spill appears only for nonzero engine overflow, with upstream spill distinguished from a pond overtopping its crest. |
| 3B Continuous path | Partly done | Roof/road network discharge, gutter/opening, forebay/sock, pond, media, gravel, underdrain and outfall have connected, gated visuals. Width and speed are derived from stage discharge/velocity. The strip uses exact frame rates and ledger storage/outfall/overflow/treated totals; **inlet cumulative volume is explicitly marked ~ because it is integrated from saved frame samples**. The exact conservation cue uses the catchment ledger including upstream storage, seepage and ET. No new substep delivered-inlet accumulator was added to the frozen engine. |
| 7B Cross-section interaction | Done, with verification limits below | Prominent accessible slider, axis switch/reset, direct plane drag, shared 2D cuts including horizontal slices, live water/pipe/saturation/layer/front readouts, solver-domain limits, hatching/stencil caps, camera stability, session memory and preset starting cuts. Soil is the existing 2D across-bed/depth field, uniform along length; the UI does not invent longitudinal solver detail. |
| 4 Soil, mulch, planting | Done | Original multi-scale procedural albedo/normal maps, clean hatched wet section faces, instanced mulch/gravel, tapered tropical grasses with restrained sway and broadleaf clumps, banks and the filter-fabric sock. Confirmed sparse planting reduces density. |
| 5 Fault visuals | Partly done | Physical deposits require a confirmed non-sensor fault and a matching configured restriction; saved replays retain their recorded confirmed-fault IDs. Cleared replay suppresses upkeep deposits. Water/road banking and pipe/gravel responses remain engine outputs. The existing inspection outline can still identify an unconfirmed finding or sensor-trust issue; it does not create a physical obstruction. There is no separate gravel-head waterline beyond the saturation field. The sediment pieces are condition cues, not a sediment-transport solver. |
| 6 I1 chamber | Done | The orange block was the sediment mesh, coloured with the heat palette and forced to at least **15 mm even when sediment was zero**. Removed that artificial minimum. Zero sediment creates no slab; positive entered depth creates a soil-textured layer at exactly that depth with an entered-level label. |
| 7 Camera/framing | Done | Three compact presets with a short, reduced-motion-aware transition; one-click default restoration. Cut movement does not refit the camera. Existing R1 fit remains. |
| 8 Review loop | Done at third-pass ceiling | Passes 1–3 and their grouped corrections are recorded in `visual-iterations.md`; no fourth polish pass. Each full matrix is 2 assets × 4 moments × 3 presets × 2 assembly modes. |
| 9 Verification and recordings | Done | Final build/lint, 73 frontend + 59 backend/shared unit checks, and **70/70 browser checks** pass. Final GPU/capture metrics and both short Record GIFs are saved. |

## Performance evidence

The final third pass measured **NVIDIA GeForce RTX 4060 Laptop GPU / ANGLE Direct3D11 / WebGL2**, 1440 × 1000 viewport, minute 22 / 63 mm/h. Animated rain/water effects were active with the shared model clock paused at peak rainfall; this is a render benchmark, not a continuous-playback FPS guarantee.

| Asset | Adaptive High | Record | Draw calls (both) | Rain instances High / Record |
|---|---:|---:|---:|---:|
| S1 | 60.0 FPS | 60.0 FPS | 205 | 1,764 / 3,780 |
| R1 | 60.0 FPS | 60.0 FPS | 129 | 1,764 / 3,780 |

The default measurements exceed 45 FPS and are below the approximately 460-call Round 7 allowance. This hardware result does not establish performance on other GPUs or all entered dimensions/storm settings. See the final-pass metrics in the [screen index](screens/round9/README.md).

## Verification notes

- Build and lint pass. Upstream Rollup comment-annotation notices do not fail the build.
- Frontend: **73/73** tests, including six new scene checks for zero/scaled flows, rain quality, cut bounds/sampling, ledger totals and confirmed restrictions.
- Backend/shared: **59/59** tests. During concurrent capture the heavy board test narrowly exceeded its existing 5-second limit; the suite passed with a 15-second per-test allowance. No engine or backend source was changed.
- First capture pass: both asset matrices passed engine agreement, while three cut tests stopped on test input syntax. Second complete browser run: 59/69 passed; repeated failures traced to the stage strip's missing keyboard focus, stale wording/provenance selectors and duplicate section locators. Those causes were corrected together for the final pass.
- Browser fixtures use the isolated mock and temporary test API, with AI disabled. The working database, operator records and credentials are not used or reset.
- Final complete browser run: **70 passed, 0 failed, 0 skipped, 0 retries**, 8.4 minutes. This comprises the existing 62 checks and eight Round 9 checks. It includes the actual saved-run API/work-order/device workflow, 390/1440/1920 section controls and axe checks, direct plane dragging, shared SVG cuts, numerical agreement, I1 sediment geometry and advancing 600× Record sequences.
- All 49 final PNGs (the 48-frame S1/R1 matrix plus I1 sediment) and both recording contact sheets were inspected in one final batch. No fourth visual pass was performed. Automated capture rewrites of the earlier Round 8B images are restored to keep those historical checkpoints intact.
- Numerical assertions cover 1 mm water-surface agreement, 0.01 pipe-fill agreement, zero rain/mist/jet/spill gating, stage frame rates, ledger residuals, plane/slider positions, readout values, keyboard increments and unchanged camera zoom. Section synchronization compares the shared numerical cut; it is not a pixel-level segmentation proof for every possible geometry.

## Assets, recordings and remaining limits

All assets are original procedural project geometry/textures/shaders; no external model or texture licences are required. [Asset inventory and provenance](ASSETS.md). [Bounded review log](visual-iterations.md). [Final captures and recording details](screens/round9/README.md).

- [S1 storm at the 600× playback setting](screens/round9/S1-storm-600x.gif): 24 sampled frames, 946 × 720, about 6.85 seconds, Record quality.
- [R1 storm in Record quality](screens/round9/R1-storm-record.gif): 24 sampled frames, 960 × 491, about 5.92 seconds, 600× playback setting.

GIFs preserve the screenshot timing and are sampled recordings, not 60 FPS video exports. Per-frame model times are retained beside them. Every frame includes the typical-design disclosure.

Remaining limits are intentional or explicitly incomplete: a stylised context without a fully visible natural horizon at the preserved camera angle; approximate sampled inlet cumulative litres; existing across/depth soil solver with uniform along-length representation; no separate gravel-head waterline; diagnostic outlines that can still identify unconfirmed/sensor findings; condition cues without sediment transport; no universal pixel-level proof of every cap/contour; and no field calibration or CFD. Flow is drawn from the model's calculated discharge; it is not a fluid simulation.
