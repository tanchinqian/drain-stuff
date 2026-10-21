# Round 9 visual iterations

Scope: S1 and R1, with shared scene pieces inherited by S2/S3/I1. The user approved realistic scene materials and water on 18 October 2026; the interface and radar palette remain unchanged. Maximum three review passes. Each pass includes one batched capture/review and a single grouped correction, not ongoing screenshot polishing.

The existing Round 8B screenshots and source were inspected as baseline evidence. Round 8B is present on `codex/drain-trial-console`; remote `main` has not yet merged that branch. Work proceeds locally on the existing Round 8B base; no merge or deployment is performed.

## Pass 1

Captured all 48 PNGs in `screens/round9/pass1/`: 2 assets × 4 moments × 3 presets × 2 assembly views. Inspected both complete contact sheets together. No rendering errors. Water height, pipe fill, rain gating and jet/spill visibility matched the engine frames across the capture matrix.

Problems found: the ground still looked like a presentation base with raised slabs; the grass albedo/normal pattern made broad stripes; blade tips were rectangular; pond shading was too pale; initial render/shader work could prematurely lower adaptive quality. The cut controls' browser checks stopped on a malformed test range value (`.24` instead of `0.24`), before exercising the keyboard path. The first S1 performance sample was after rain and therefore did not measure storm load.

Measured RTX 4060 Laptop / Direct3D11 / WebGL2 at 1440 px: S1 adaptive had fallen to Low, 60.0 FPS / 118 calls; Record 60.0 FPS / 199 calls (both at a dry-rain frame). R1 High 60.0 FPS / 129 calls; Record 60.0 FPS / 129 calls. Exact frame and rainfall values are in the per-asset metrics files. These are checkpoint measurements, not the final storm-load acceptance.

Grouped corrections: add a clipped terrain surface around the excavation and quieter grass mapping; taper and bend blades and populate the banks; use a shared three-colour built-context atlas; reduce the pale pond wash; allow shader warmup and require two slow samples before reducing quality; join the pipe outlet to the pool with a continuous jet; remove the invented 15 mm minimum sediment slab in empty inlet chambers; correct test input syntax and measure peak-rain FPS. Extend section and confirmed-deposit checks.

## Pass 2

Captured and reviewed the second complete 48-frame matrix together. The tiled/embossed ground is quieter; water is less pale, blades taper and bend, the built context uses its three-colour atlas, and the inlet chamber no longer contains an invented minimum sediment slab. S1 and R1 have no rendering errors and retain numerical water/pipe/rain/flow agreement.

Peak-rain RTX 4060 measurements at 1440 px, minute 22, 63 mm/h: S1 Adaptive High **60.0 FPS / 205 calls**, Record **60.0 FPS / 205 calls**; R1 Adaptive High **60.0 FPS / 129 calls**, Record **60.0 FPS / 129 calls**. High rendered 1,764 streaks; Record rendered 3,780. Both Record sequences advanced the shared clock at 600×.

Full regression run: **59/69 browser checks passed**. Five failures identified the same missing keyboard focus on the horizontally scrolling stage list; two legacy selectors assumed old wording or a single provenance label; three section tests used a locator that matched both existing SVG section views. Direct cut-plane dragging and keyboard steps reached the SVG assertions successfully. Inspection also found that the lower existing section still used its own default cut, so the final correction shares cut state with both views, rather than merely narrowing the selector.

Final correction batch: keyboard-focusable stage strip; precise legacy selectors; shared cut state; layer-aware chamber/air/soil readouts and no solver extrapolation; keep saved-run confirmed fault provenance; retain compost scene highlighting/axes; quieter asphalt with a road extending beyond the frame. Preserve the remaining stylisation instead of further cosmetic iteration.

## Pass 3 — final

The final bounded confirmation collects the scene matrix, responsive/keyboard/axe checks, I1 sediment evidence, peak-rain GPU measurements and short storm sequences. Stop after this pass; any remaining weaknesses are reported rather than entering another polish loop.

Completed: **70/70 browser checks, no failures/skips/retries**, 8.4 minutes. All prior regression failures were resolved. Direct plane dragging, keyboard increments/extremes, unchanged camera zoom, shared SVG cuts and 390/1440/1920 axe checks pass. I1's zero-depth geometry has no sediment slab; an 80 mm entry produces an 80 mm layer and the visible entered-level label. Final build/lint and **132 unit checks** pass.

Final GPU results match pass 2: S1 High and Record **60.0 FPS / 205 calls**; R1 High and Record **60.0 FPS / 129 calls** at minute 22 / 63 mm/h on the RTX 4060 Laptop / Direct3D11 / WebGL2. High has 1,764 rain streaks and Record 3,780. The 49 final PNGs and the two recording contact sheets were reviewed together. The short GIFs preserve the sampled Record timing, with an advancing 600× shared clock and the disclosure visible in every frame.

Remaining weaknesses: the context remains low-poly and the preserved orthographic view does not show a natural horizon; sampled inlet accumulation is marked approximate; the soil field is uniform along length; inspection outlines retain diagnostic findings even when unconfirmed; gravel head is conveyed by wetting rather than a separate line; and source/geometry agreement is not a universal pixel proof of every cut. These are recorded in `ROUND9_REALISM.md`. **Stopped after pass 3. No fourth polish pass.**
