# Shared storm playback — 17 October 2026

## Operator flow

1. Choose rainfall on Overview and select **Run storm**. Actual calculation progress remains separate from playback.
2. When a newly requested run completes, Asset locations scrolls into view and its cloud starts playing. Initial speed is **60×**, or one simulated minute per real second. A 45-minute storm therefore takes 45 seconds to show. Later runs retain the chosen speed.
3. **Watch storm**, beside Run storm, rewinds and reveals the map. Playback controls beneath the canvas offer Play/Pause, Reset storm, Jump to peak rainfall, a timeline and searchable speed control. The timeline defaults to the rainfall duration (45 minutes for Heavy); **Include drainage recovery** expands it to the full 405-minute run. The thumb uses fractional minutes, and the current readout explicitly says Playing or Paused. Overview pauses exactly when rainfall ends; **Play recovery** explicitly continues through the saved drainage period.
4. Switch between 3D and Plan without resetting time. Open an asset's saved replay to inspect its water at that same minute. Returning to Overview preserves the clock. Asset model preparation pauses the clock until the requested model is ready.

Reduced-motion preferences suppress autoplay and hide moving playback controls; the timeline and peak/reset buttons remain available. Playback pauses while the document is hidden. Restoring an old saved board does not autoplay.

## Data and rendering

The cloud uses the saved run's canonical alternating-block rainfall curve, not independently invented weather. Its colour blends through the existing radar palette and its display opacity uses a square-root intensity scale with a 35% floor while rainfall is positive, keeping light rain visible. This changes visibility only; numeric rainfall and the physical model are unchanged. All zones receive the same scenario rainfall, matching the board inputs. Cloud coverage drifts across the fixed map footprint during playback. This is an illustrative motion cue, not a wind field or spatial rainfall model. Rainfall remains uniform across zones. The cloud clears when rain finishes; Overview pauses there to distinguish a finished storm from missing animation. Play recovery continues the clock through drainage, when an asset can still contain water.

Cloud geometry and coverage texture are cached. Playback changes the 3D material tint/opacity and texture offset, or the Plan overlay mask position. A single cached irregular field three times the map size is cropped inside the map footprint, with no wrapping or repeated tiles; no new 512×256 image is rasterized and houses are not reconstructed. Only the weather overlay interpolates between 10 Hz shared-clock updates for smooth movement. The demand-rendered 3D canvas is explicitly invalidated when that offset changes. Pause, seek and reset stop or reposition the overlay; reduced motion removes drift. The shared clock updates at 100 ms using elapsed wall time. This is visual playback of saved inputs, not a faster physical solver.

Asset pages request only their current model from the existing worker and reuse valid cached results. The same storm keeps its time across view/mode switches. A fresh direct link without an existing shared clock retains the asset's default opening at peak water. Parameters and new storms still invalidate affected cached runs. Original saved job results are unchanged by playback.

## Scoped inspection

The production build passed. A local browser inspection covered a new run autoplaying, peak rainfall around 63 mm/h, 3D/Plan switching at the same second, pause/scrub, asset navigation at minute 12 and return at second 720, then zero cloud opacity after rain. Reduced motion hid moving playback controls. There were no page errors and no mobile horizontal overflow at 390 px. A sampled ten-simulated-minute playback interval caused **zero additional weather rasterizations**.

Captures and measurements: `docs/screens/storm-playback/`. This is a bounded local inspection, not a full regression suite or a cross-device performance guarantee. Unit/regression suites were not run for this change. Physical geometry, hydrology and rainfall remain uncalibrated scenario inputs; no live radar or forecast is claimed.

## Independent debugging follow-up

A second agent reproduced the visibility problem: the previous 300× default completed 45 minutes of rainfall in nine seconds, while controls above the canvas pushed the map below the viewport. Light rainfall also produced almost transparent cloud rendering. The default is now 60×, controls are below the canvas, completion reveals the map, and Watch storm provides an explicit restart.

The agent independently checked autoplay, visible light rain, preservation of a manually selected 600× speed, the exact 2700-second end-of-rain pause, Play recovery advancing beyond that boundary, Watch storm restarting, reduced motion remaining paused, and no browser page errors. The production build passed after the controls were moved. An in-app browser capture is saved under `docs/screens/storm-playback-debug/`. These were targeted debugging checks; a full regression suite was not run.

## Cloud movement follow-up

The previous follow-up fixed playback speed and map visibility, but the implementation still only changed intensity: cloud coverage never moved. Coverage now advects from the shared time in both views. The movement is illustrative, leaving the saved hyetograph, uniform rainfall inputs, drainage computation and shared model clock unchanged. No wind direction or travel speed is claimed as measured weather.

Local browser follow-up confirmed the 3D coverage changing position during playback and Plan drift increasing with the shared clock. Pausing held the Plan drift at 1.0333066666666721 across separate observations; Play advanced it to 1.048613333333342, and Jump to peak rainfall repositioned it to 0.7333333333333333. Captures are `cloud-motion-start.png`, `cloud-motion-later.png` and `cloud-motion-plan.png` under the debugging capture folder. These are scoped browser observations, not a full regression suite.

## Timeline visibility on port 5173

The user reported a Pause button with a zero-minute cursor at 600× on port 5173. A fresh local browser session on that port completed a new Run storm and advanced to minute 5.5. Both local ports serve the same workspace source; no stopped-clock cause was reproduced in the fresh session. The previous timeline placed 45 minutes of rain in a 405-minute range, compressing the visible rain section into 11% of the track. It now defaults to the 45-minute rainfall window, with an explicit optional full recovery range and Playing/Paused readout. The page also explains that Run storm recalculates, while Watch storm replays saved results.

A browser check at 600× on port 5173 showed the slider at 3.017 of 45 minutes immediately after Watch storm, rather than remaining at zero. Full regression suites were not run.

The subsequent Run storm at 600× reached the exact 45-minute rain boundary and paused with the slider at 45/45. At 60× the same page showed 9.60 then 23.5 minutes, and the final capture shows Playing at 22.3/45 after a peak seek and resume. Capture: `docs/screens/storm-playback-debug/timeline-5173.png`. The frontend production build passed.

## Root cause identified from the recording

The supplied 91-second recording shows the page at `http://127.0.0.1:5173//`, with two root slashes. React Router still renders the index page, but SimulationDriver previously required the pathname to equal `/` before starting its shared clock. Consequently the controls could set playing=true while no clock effect ran. This is the actual frozen-at-zero cause; earlier speed/opacity/timeline changes addressed visibility but did not fix it.

Reproduced before the patch at pathname `//`: data-model-second=0 and Playing / Pause storm. SimulationDriver now collapses repeated slashes and removes trailing slashes before all route checks. Without changing the browser URL, the same running page advanced to 960.03 seconds (minute 16) after the update and 1884.09 seconds (minute 31.4) on the next observation. Plan and 3D share this corrected clock. Capture: `docs/screens/storm-video-debug/double-slash-fixed.png`. The frontend production build passed; a full regression suite was not run. Raw recording frames are kept outside the repository.

## Continuous cloud and colour refinement

The drifting tile implementation repeated its transparent map-sized texture, exposing four copies and straight seams. Playback now generates a single larger deterministic cloud density field, with irregular soft detail and a feathered outer envelope. Both 3D and Plan crop the same field and translate through it once over the rainfall duration. Three.js uses clamped sampling, and Plan uses one image in its mask with no repeating SVG pattern. Reduced motion fixes the sampling window in place.

Display intensity eases between adjacent rainfall blocks and blends adjacent palette stops instead of switching colours at band thresholds. The final minute fades the cloud to clear. Actual numeric rainfall still comes from the canonical step curve; neither the solver nor its inputs are changed. Historical observation colours retain their discrete bands. Cached textures are created once per input set, not once per animation frame.

Scoped browser inspection on the double-slash 5173 route confirmed one mask image and zero SVG patterns. At peak, the blended colour was #d64442. Two successive sub-minute seeks kept the numeric rainfall at 63 mm/h while display colour progressed through #e2542d and #ef8228, confirming continuous appearance between the saved step values. The 3D view uses the same field and cropped sampling. The production build passed; no unit or full regression suites were run for this refinement. Capture: `docs/screens/storm-playback-debug/continuous-cloud-3d.png`.
