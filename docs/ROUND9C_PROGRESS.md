# Round 9C — visible water physics

Approved 21 October 2026; deadline 22 October 2026 12:00 Asia/Singapore.
Branch: `codex/drain-trial-console`. Stage commits are pushed after checks.

The hydraulic engine remains authoritative. Water motion is drawn from the model's calculated flows. It is not a fluid simulation of the real site.

## Stage 0A — section scope and axis switching

Terrain no longer receives a clipping plane. Assembly clipping updates before paint; changing axes rebuilds cap passes. Each solid clears its stencil before counting and draws its cap in the same render queue. Horizontal sections include layer, inlet/outlet and obstacle outlines. Reset and both slider endpoints restore the assembly.

Checks: TypeScript passed; both browser cases passed (30 random switches and 10 positions per axis for each asset). Captures saved under docs/screens/round9c. These assert actual material clipping scope and non-empty SVG geometry; they do not prove every cap is watertight at pixel level.

Excavation/ground continuity is being handled with Stage 0B because both use the same street surface.

## Remaining stages

0C rain opening; 0B street continuity; 0D faults; 1 rain distribution; 3/3A flow path; 2 surface solver; remaining surroundings/material interactions and evidence.

## Stage 0C — visible opening rain
Fresh feature calculations open at 40% of rain duration, playing unless reduced motion is requested. Feature playback loops the full event including recovery; explicit seeking pauses. Saved replay clocks remain preserved. Rain status and four event markers are visible. TypeScript and the focused browser check passed.


## Stage 0B — ground continuity, first two items
Replaced the separate deep ground slab and oversized rectangular hole with a continuous surface and fitted excavation including inlet and outfall corridors, closed walls and a floor. Soil only appears within the pit; paving retains a supporting base. Two numerical geometry checks cover 10 radial directions and 89 distances each; both S1/R1 section browser checks pass again. The later surroundings/perspective work remains pending.


## Stage 0D — persistent fault cues
- Added anchored badges, material tint, matching obstruction cues, a numbered fault list and a focused explanation with work-order link. Show fault focuses the part from the scene, register and storm results.
- Verified/closed findings are excluded. Recorded cues describe an inspection finding; they do not change simulated hydraulics.
- Validation: TypeScript passed; S1 and R1 browser fixtures both verified badge/tint/obstruction presence and removal after verification (2 passed). Captures saved in this directory's screens/round9c folder.
- Limitation: badges use a fixed margin column; exceptionally long lists may need scrolling.

## Stage 1 — rain distribution and impacts
- Added conditional Marshall–Palmer sampling, Atlas terminal speeds, motion-stretched streaks, actual-mesh collision rays, rings, hard-surface splashes and intensity-driven mist. Rain moved outside the drain part visibility/clipping hierarchy.
- TypeScript and statistical distribution/fall-speed checks passed. Rain is a representative population in the published speed-fit range; not every physical droplet is drawn.
- Roof conveyance is completed with Stage 3A; impulse coupling depends on Stage 2. Those dependencies are not claimed complete here.

## Stages 3 / 3A — connected flow
- Added gravity/velocity outfall jets and droplets, dry/submerged gating, inlet lip falls, slope-following pipe water, full-pipe state and saturation-gated pore streaks. The strip states when soil is still absorbing and no underdrain flow exists.
- Added a connected roof/gutter/downpipe/lot-drain/sump/covered-crossing route with a highlight and exact engine roof-discharge readout. R1's default roof area is zero and its UI says so.
- Thirteen focused flow/ground/metric tests passed, including 2 mm segment continuity, ballistic trajectory, zero/submerged jets and saturation gating. TypeScript passed. Browser flow/section checks capture S1/R1 and inspect WebGL errors.
- Surface distribution, obstacle head differences and rain impulse propagation remain Stage 2 work. Material-specific sock/dam behavior remains Stage 4 work. The pipe/roof route does not alter the engine.

## Stage 2 — constrained surface water
- Implemented WebGL2 float ping-pong Saint–Venant display solver with hydrostatic reconstruction, Manning drag, CFL bounds, terrain/obstacles, engine sources/sinks, zero-net rain impulses and region storage/reference reconciliation. Added a smaller CPU-worker fallback.
- Surface rendering now uses the grid depth, slope and velocity; folded leaves advect with the field. Debug exposes backend, resolution, volume/depth agreement and measured costs. Road top and flow terrain share the crossfall function.
- Thirteen focused CPU tests passed (solver, leaf motion, ground and flow); real-GPU still-lake and wet/dry conservation passed. GPU and fallback live timeline checks passed at 0/18/45/165 minutes; section regressions passed after integration.
- This is a real-time local display solver. Reconciliation is explicit engine forcing and can be large during seeks. It does not replace the hydraulic engine or claim site prediction. Final frame-review acceptance, comparative browser FPS and evidence recordings remain to be done.

## Remaining Stage 0B — street and camera
- Added five terrace units (three at Low), shared instanced facade/roof/window/gate/porch kits, back lane, frontage junction, parked vehicles, bins, trees/shrubs and distant silhouettes. Existing lamps, utility pole and covers remain, with additional frontage lamps.
- Perspective 35° is the default; an orthographic toggle preserves the drawing option. Both camera types have bounded wheel zoom and fit transitions. Overcast gradient/fog and lighter asphalt/concrete/grass support the street context.
- TypeScript passed, 11 ground/path/rain-bound tests passed, four S1/R1 flow/section browser checks passed, and the perspective/orthographic wheel-limit test passed. Final image review remains part of the evidence pass.
- Context is typical and illustrative, not a surveyed neighbourhood model. No catchment area or engine values were changed to match the facade kit.

## Stage 4 — material responses
- Connected wet finish, retained mulch wetness/film appearance, selected chip flotation, depth-sampled soil/sand/gravel/geotextile, clog/wet sock shading, head-gated dam spill and grid-driven vegetation bending/wetting. Removed the old floating green ellipses; folded leaves use the velocity field.
- Added the material interaction table and explicit limits in WATER_INTERACTIONS.md. The Richards cross-bed field is still repeated along the asset length; this is stated in Model details instead of inventing a 3D soil field.
- Eleven focused material/surface tests passed; four browser flow/fault tests passed without shader errors. Final screenshot acceptance and the full regression/performance pass remain.
