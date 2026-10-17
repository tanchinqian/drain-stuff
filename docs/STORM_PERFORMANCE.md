# Storm calculation responsiveness — 16 October 2026

## Cause and changes

The API already used a Node worker, but only exposed queued/running/completed. A full heavy scenario with sensitivity took about 20 seconds and looked inactive. The browser fallback deferred a synchronous solver with `setTimeout`; the solver still blocked the browser main thread once that timer fired.

- Browser storm runs and verification reruns now use a dedicated Web Worker. Worker failures/timeouts surface as errors; they do not silently fall back to main-thread calculation.
- Both workers report actual completed comparisons, total, current asset, mode and sensitivity parameter/multiplier. The Overview shows these with an accessible progress bar. Five assets require 15 comparisons, or 45 with sensitivity. Identical configurations reuse their result within one run; they still count toward the requested comparisons.
- Board calculations retain scalar timelines but skip copying the soil contour arrays needed only for 3D replay. The solver equations, stepping and input values remain the same. Feature replay keeps full soil frames by default.
- Overview polls a small status-only response every 500 ms, then retrieves the ranking once. It no longer downloads the full result twice. Queue progress is transient; saved completed results remain in SQLite.
- The map props are stable and the map is memoized, so progress polling does not reconstruct 589 houses. Submission remains busy until results are ready; a request error releases that state so the operator can retry.
- Offline verification checks that the target fault has not changed while its worker ran, and merges only that fault into the latest state to preserve other record edits.

## Local performance profile

One before/after desktop profile using the local development server, Chromium with D3D11, heavy 63 mm/h × 45 min, five assets, six-hour recovery and sensitivity enabled:

| Path | Elapsed | Control interaction during calculation | Largest sampled browser timer gap |
|---|---:|---:|---:|
| API before | 19.95 s | Not measured | 172.8 ms |
| API after | 14.42 s | 39 ms | 55.3 ms |
| Offline after | 12.77 s | 38 ms | 150.4 ms |

The offline profile also resized to 390 px for its mobile capture. Timers sampled every 50 ms; these gaps are not INP measurements. Captures add some elapsed time. This is one local observation per path, not a cross-device benchmark or a guarantee. No offline baseline timing was recorded; its blocking call was identified from source.

Both after profiles observed changing real progress and five completed result rows, with no page errors. Captures and raw measurements are in `docs/screens/storm-progress/`. The production build passed. Unit and regression suites were not run for this change.

Storm comparison is still a calculation that takes seconds. To see the water move afterwards, use **Replay in 3D** on an asset and its storm playback controls. Relative ranking remains uncalibrated and is not a forecast.

The main map's rainfall overlay was initially restored with the existing radar palette, cloud rendering and opacity slider, as a static peak preview. Desktop 3D and mobile Plan captures of that checkpoint are in `docs/screens/rainfall-restored/`; mobile had no horizontal overflow. This was extended to a shared rainfall timeline on 17 October; see `STORM_PLAYBACK.md`. Samples and coverage remain cached during playback.

On 17 October, the storm bar's fill changed to a 600 ms eased transform transition. Completed counts and accessibility values still reflect the worker's actual progress; only movement between received values is smoothed. Waiting has an indeterminate sweep. Reduced-motion preferences disable movement. This uses CSS rather than per-frame React updates.
