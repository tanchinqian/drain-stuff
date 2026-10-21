# Round 9C — water and scene verification

22 October 2026. Branch: `codex/drain-trial-console`.

The hydraulic engine, Richards solver, API and AI are unchanged. Water motion is drawn from the model's calculated flows. It is not a fluid simulation of the real site.

## Stage status

| Stage | Status | Delivered and limits |
| --- | --- | --- |
| 0A: sections | Done | Assembly-only clipping, independent excavation, rebuilt caps when axes change, shared non-empty 2D slices. Automated scope and geometry assertions cover 30 switches and ten positions per axis on S1/R1. They are not a pixel-level proof of every possible cap. |
| 0B: ground and context | Done | Supported paving, fitted pit walls/floor, terrace row, street props, perspective default and optional orthographic view, overcast background. Context is typical, not surveyed. Facades retain a simplified model appearance. |
| 0C: opening rain | Done | Fresh feature views open at 40% of the rain period and play/loop, except reduced motion. Rain chip and event markers follow the engine; saved replay positions remain preserved. |
| 0D: faults | Done | Persistent badges, tint, outlines and obstruction cues for recorded active findings; Show fault and work-order links; verified/closed findings disappear. Badges use a margin column; unusually long fault lists may exceed that space. |
| 0E: annotations and leaves | Done | Bounded generic label placement, margin fault badges, folded leaf meshes advected by local surface velocity. Fault badges are additional to the maximum three generic readout labels. |
| 1: rain | Done | Conditional Marshall–Palmer diameter distribution, Atlas fall speed, real-time motion independent of playback, mesh impacts, splash/rings/mist and grid impulses. Representative droplets are magnified for visibility; not every real drop is rendered. |
| 2: surface solver | Partly done | WebGL2 float solver, worker fallback, terrain/obstacles, sources/sinks, engine volume/depth constraints, moving surface, shoreline, foam and transported leaves are implemented. Individual grass-stem wakes are below grid resolution. Transmission/refraction is approximate; projected caustic lighting is not implemented. No claim of photorealism or calibration. |
| 3: drain flow | Done | Engine-driven inlet, infiltration, pore seepage, pipe filling, ballistic outfall, overflow and cumulative flow strip. The headwall has a real port. Zero flow is shown honestly. Downstream receiving film is illustrative and is outside the engine storage ledger. |
| 3A: house connection | Done | Roof, eaves gutter, bracketed downpipe/shoe, 225 mm lot drain, sump, covered crossing and street inlet; path highlighting and engine roof flow. Tested segment continuity within 2 mm. R1's default roof area is zero. |
| 4: materials | Done within documented visual rules | Wetness/roughness, mulch wetness retention and chip flotation, soil saturation, geotextile, gravel seepage, sock/dam response, vegetation and litter. Mulch film uses wetness memory rather than another stored-water reservoir. The Richards cross-section is repeated along the asset length. See WATER_INTERACTIONS.md. |

## Performance

Measured sequentially on the user's laptop, default High quality, 1440 × 1000 browser viewport, six one-second samples after six seconds of warmup. S1 canvas is 790 × 600; R1 canvas is 790 × 403. Measurements hold the shared clock at mid-rain while rain and the local display solver continue moving in real time.

| Scene/browser | Mean FPS | Solver CPU + readback ms/frame | GPU solver ms/frame | Rain CPU ms/frame | Particle CPU ms/frame |
| --- | ---: | ---: | ---: | ---: | ---: |
| S1 Chromium | 59.3 | 3.60 | 0.274 | 0.27 | 0.017 |
| R1 Chromium | 60.0 | 6.25 | 0.246 | 0.15 | 0.017 |
| S1 Firefox | 153.0 | 2.00 | unavailable | <1 ms timer resolution | <1 ms timer resolution |
| R1 Firefox | 128.1 | 4.83 | unavailable | 0.17 | <1 ms timer resolution |

Chromium reports NVIDIA GeForce RTX 4060 Laptop GPU, ANGLE Direct3D11. Firefox masks its renderer as a generic NVIDIA device; its GPU timer is unavailable. Headless refresh limits differ, so these figures do not establish a Firefox speed advantage. CPU and GPU values overlap and must not be added as independent wall-clock costs. Particle timing covers ballistic flow and both leaf populations; rain timing includes impacts. Short measurements do not establish sustained thermal performance.

All four measured cases exceed the requested 45 FPS. The earlier scene regression also sampled peak rain (minute 22, 63 mm/h) in Chromium: S1 High/Record 60.0/60.0 FPS and R1 High/Record 60.0/59.9 FPS, drawing 1,764/3,780 streaks respectively. Those are single-window checks, not the six-sample averages above; raw values are in screens/round9c/legacy-regression/*-metrics.json. Adaptive quality reduces grid resolution, rain count and refraction when its FPS window falls below 48, and restores after sustained recovery. Raw samples: [S1 Chromium](screens/round9c/S1-chromium-metrics.json), [R1 Chromium](screens/round9c/R1-chromium-metrics.json), [S1 Firefox](screens/round9c/S1-firefox-metrics.json), [R1 Firefox](screens/round9c/R1-firefox-metrics.json).

## Volume agreement and physics limits

Across the final browser captures and performance samples, corrected bed/gutter storage error was below **0.001%**, and corrected reference-depth error below **0.001 mm** (required: 3% and 1 mm). These are **post-reconciliation** measurements. They demonstrate agreement with the engine, not unforced conservation or accuracy against a real drain.

The local solver uses real-time CFL-limited steps. It is not accelerated 300×/600× with the storm clock. Engine states provide sources, sinks and target storage; reconciliation occurs each engine frame and at a real-time interval. A seek can require a large correction. Separate closed-domain checks exercise conservation within 0.1%, positivity and lake-at-rest behavior without that correction.

The bed and road are separate numerical regions. Engine inlet transfer connects their water accounting; this is not a single continuously resolved street-to-soil fluid domain. Roof flow, outfall and infiltration follow their engine values. Display debris and splash particles do not carry ledger mass. Shallow water cannot resolve three-dimensional jets, per-stem wakes or subsurface pore paths; those are separate illustrative elements.

## Evidence

The [round9c evidence folder](screens/round9c) contains 32 final scene PNGs: S1/R1 × start/mid/peak/two hours after rain × assembled/cutaway × Chromium/Firefox.

- [S1 peak cutaway](screens/round9c/S1-peak-cutaway-chromium.png): approximately 64 mm peak ponding in this seeded scenario.
- [R1 mid-rain cutaway](screens/round9c/R1-mid-cutaway-chromium.png): flowing channel/pipe; the engine reports no surface ponding.
- [S1 storm recording](screens/round9c/S1-storm-chromium.webm): 26.39 seconds, Record quality, 300× shared-clock playback, pond rises and begins recovering.
- [R1 storm recording](screens/round9c/R1-storm-chromium.webm): 25.69 seconds, Record quality, 300×, pipe flow and outfall jet followed by drainage.

Recordings capture the WebGL canvas, **not DOM overlays or playback controls**. Record-quality video resolution is 1580 × 1200 for S1 and 1580 × 806 for R1. Their decoded midpoint frames and per-second progression are saved alongside them. S1's underdrain remains zero for this storm, so no underdrain jet was invented. R1's zero surface ponding is not a missing visual. Screenshots provide labels and controls omitted from the videos. No real-drain reference video was supplied for Round 9C, so review used the brief's criteria.

## Verification

- **82 distinct browser regressions pass across the full run and targeted correction reruns.** Initial full run: 76 passed, six failed. Responsive rerun: 12/13 passed, leaving I1 fit; final camera/visibility rerun: 9/9 passed after fixing the stale control limit. The initial errors and correction outcomes are retained in [verification.json](screens/round9c/verification.json). This is not a claim of a single final 82/82 run.
- Chromium and Firefox final evidence checks pass for S1/R1, including workspace accessibility, no shader errors and storage/depth agreement. The two 20–30 second Record-quality video checks pass, including browser decode, clock progression, S1 ponding and R1 pipe/jet presence.
- Frontend unit suite: **93 tests / 18 files passed**. Final TypeScript and lint checks pass.
- Backend/shared unit suite: **59 tests / 8 files passed**. Total unit checks: **152**. Production build passes (upstream Zod comment-annotation warnings only). Browser suites use isolated ports and a temporary seeded database; they do not edit the demonstration database or call the live AI provider.

## Remaining visual limits

The frame review confirms visible rain, advancing/receding ponding, pipe flow and jets, persistent fault cues, uncut surroundings and unobscured default model views. Fine refraction, caustics and grass-scale obstacle wakes remain below the requested realism target. Generic label layout and active-fault badges are verified in the default views; an arbitrary exploded assembly or exceptionally long fault list is not exhaustively covered. Soil is still a cross-section repeated along length. These limits are disclosed rather than changing engine values to make a more dramatic storm.
