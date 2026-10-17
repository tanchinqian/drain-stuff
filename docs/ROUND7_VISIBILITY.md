# Round 7 — visible drainage physics

## Scope

The hydraulic engine, Richards solver, calibration status and conductivity inputs are unchanged. This round changes rendering, framing, contextual geometry and interaction. The prior cross-section highlight fix is included. UI and radar colours remain unchanged; rain is neutral and soil/water retain their material-specific treatment.

## Requirement status

| Section | Status | Implementation and limits |
|---|---|---|
| 1. Rain | Partly done | Instanced neutral streaks and impacts, variable length/speed, depth fade, intensity opacity, zero instances at zero rain. Volume is five times the channel width and extends above/beyond it. Hits use schematic bed/water/road/footpath/roof surfaces. Wind retains the existing small fixed lean: there is no engine wind setting to follow. Exact kerb/roof ray intersections are approximated by their surface heights. |
| 2. Fault highlights | Done | Removed fault hatching and thick outlines. Part geometry edges are 1.5 px, visible only on the inspected flagged part or in Troubleshoot. Operator opens without any outline. The same cutting plane clips all outlines. Numbered fault annotations participate in the three-label budget. |
| 3. Framing | Done | Inlet-side camera at approximately 25 degrees elevation, 60vh canvas minimum, road/footpath context replaces the large slab. Separate inlet fit. Projected physical model bounds exclude stencil planes and meet the 60% width check. |
| 4. Cutaway and soil | Done | Cutaway is the named default; Assembled and Exploded remain. Warm dry to cooler dark wet shading and a thin S=0.5 shader contour use the cached solver field. A depth readout reports the interpolated crossing in the media. Mulch uses surface-wetness memory; the amended band has a separate visual tint/response at the recorded allocation depth, using the same local saturation field. Dose does not change conductivity. |
| 5. Water | Done | Stronger pond edge/tint, moving inlet sheets and gutter streaks, upstream banking, saturated gravel and clipped seepage, discharge-gated outfall jet/pool and overflow spill. Selected stages show L/min; Troubleshoot prioritises stage readings. The three-label budget means all five stage values are not shown simultaneously; select a stage to prioritise it. |
| 6. Catchment | Partly done | Low-poly road, gutter/kerb opening, footpath, wall/roof edge and downpipe; instanced gutter streaks, rain impacts and wet-road roughness. Roof and paved areas come directly from the hydraulic inputs. This depicts nearby edges, not the whole contributing area. Gutter slope uses the entered pipe slope as a documented schematic proxy; the engine has no independently surveyed gutter geometry. Context boxes are simple meshes rather than one merged asset. |
| 7. Labels | Partly done | Shared projected layout, margin placement, leaders, maximum three annotations, overlap checks, dimensions off initially. Selected/hovered items take priority; surplus annotations are suppressed. Sensor hover popups remain their existing separate interaction and are not part of this CAD annotation manager. |
| 8. Performance | Done | Debug FPS overlay and toolbar quality indicator. Two quality levels change DPR, rain density and water transmission; down after a two-second sample below 40 FPS, recovery after eight stable seconds at 55 FPS or higher. Rain, planting and gutter streaks are instanced. Hardware measurements and remaining draw calls are recorded below. |
| 9. Evidence | Done | Four feature checks, sixteen requested still captures, hardware captures/metrics, and a 36-frame, approximately 9.9-second S1 GIF captured during actual 600x playback. See `docs/screens/round7/`. |

## Tests

| Test | Status | Evidence |
|---|---|---|
| 1. Neutral rain, expanded volume, zero at zero rain | Done | Unit checks for colour channel spread and five-times width; browser rain-count checks across the timeline. |
| 2. Operator/selected outlines | Done | Default zero outlines in all four feature cases; selecting S1's flagged sock yields one outline. S2 Troubleshoot confirms clipping of the mulch/planting fault edges. |
| 3. Model width | Done | Physical geometry bounds projected through the default camera: S1/S3 about 86%, I1 about 65%, T1 about 85%. This is a projected bounds check, not a pixel segmentation measurement. |
| 4. Wetting | Done | At 100 mm, end-of-rain saturation exceeds the initial value in S1/S3/T1. Media contour depths are recorded across the rain period; all tested cases are non-decreasing within 1 mm. I1 has no soil field. |
| 5. Flow gates and speed | Done | Fixed cross-section visual flow speed is proportional to entered discharge, exactly zero at zero. Browser assertions check jet and overflow gates against each selected engine frame. |
| 6. Label overlaps | Done | S1/S3/I1/T1 at initial, mid-rise, peak and two hours after rain: at most three annotation rectangles, no pair overlaps. Narrow 720 px windows included. |
| 7. Captures and animation | Done | S1/I1 four times by two views, plus GPU examples. Animation is actual 600x shared-clock playback, not an independently recalculated simulation. |

## Performance evidence

Hardware: Windows, NVIDIA GeForce RTX 4060 Laptop GPU, ANGLE Direct3D11, Chromium 151 headless with hardware acceleration explicitly enabled. This is not a Firefox measurement. Final settled measurements: S1 at 1440 x 1000 = 60.0 renderer FPS / 60.15 RAF FPS; S1 at 720 x 1000 = 60.0 / 60.06; S2 at 720 x 1000 = 60.0 / 59.96. All three used High quality and 292 rain instances at minute 20. The measurements in `*-gpu.json` include rain rather than only the delayed ponding peak. The GPU suite waits through quality adaptation then measures a four-second RAF window and records the renderer's two-second sample. The quality readout is available for checking Firefox on the user's machine.

Earlier software fallback runs measured roughly 5–13 FPS with SwiftShader and are not the hardware design target. Current per-feature JSON files are correctness captures, not settled benchmarks; their incidental frame samples can include view-transition/idle gaps. Use the dedicated `*-gpu.json` files for performance evidence. Draw calls remain in the hundreds (456–463 in the measured High-quality views) in cutaway mode because the existing detailed parts and stencil caps are retained. Instancing the moving effects avoids a draw call per drop or blade, but this is not a full geometry-merging optimization.

## Model and representation limits

- Catchment area is a hydraulic input; the visible road/roof are cropped context edges, not a survey or a literal reconstruction of the entire area.
- Gutter slope is a schematic proxy. Wind is fixed visual lean; neither is a new hydraulic output.
- The contour is the actual local S=0.5 crossing, not a fabricated advancing line. Below-threshold media displays a zero contour depth. It may recede during drainage; this is not forced monotone outside the rain interval.
- Compost allocation identifies the amended band. It shares the current solver field and does not imply a measured treatment benefit or separately calibrated amended-soil properties.
- Upstream level comes from the kerb network node. Rain/impact density and stream cross-section are visual representations of the engine intensity/flow, not individual tracked water parcels.
- No hydraulic changes, forecast claims, backend writes or new measured field data are introduced.

## Local verification

Production build and 66 unit checks passed. The four feature browser cases passed against the final renderer, including non-decreasing contour assertions, and three dedicated hardware GPU cases passed. The final counter guard discards the first active frame after a demand-rendered idle gap so idle time is not mistaken for poor active FPS. The captured visuals remain valid. Round 7 is committed as `dfe0e0088e307662293ab70e686a6c81cf4c52a5`, pushed on `codex/round-7-visibility`, and proposed in [PR #3](https://github.com/tanchinqian/drain-stuff/pull/3). These counts describe the Round 7 checkpoint; current cleanup verification is recorded separately in `ROUND8B_CLEANUP.md`.
