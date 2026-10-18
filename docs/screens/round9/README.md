# Round 9 captures and storm recordings

Final evidence: **pass3**. The complete suite passed 70 browser checks; 132 unit checks and the production build/lint passed. All final frames were reviewed within the three-pass ceiling. The working database was not reset.

## Recordings

- [S1 storm, 600x playback setting](S1-storm-600x.gif) — Record quality, 24 sampled frames, 946 x 720, about 6.85 seconds.
- [R1 storm, Record quality](R1-storm-record.gif) — 600x playback setting, 24 sampled frames, 960 x 491, about 5.92 seconds.
- [S1 frame/model timings](S1-record-timing.json), [R1 frame/model timings](R1-record-timing.json). GIF sampling is not a 60 FPS video recording.

## GPU evidence

RTX 4060 Laptop / ANGLE Direct3D11 / WebGL2, 1440 x 1000 viewport. Peak rain at minute 22 is 63 mm/h. Animated effects are benchmarked with the shared model clock paused; this is not a guarantee for all inputs or continuous playback.

| Asset | Adaptive High FPS / calls | Record FPS / calls | Rain High / Record |
|---|---|---|---|
| S1 | 60.0 / 205 | 60.0 / 205 | 1764 / 3780 |
| R1 | 60.0 / 129 | 60.0 / 129 | 1764 / 3780 |

[S1 full metrics](pass3/S1-metrics.json), [R1 full metrics](pass3/R1-metrics.json), [verification summary](verification.json).

## Final 48-frame matrix

Each cell links Cutaway / Assembled at the selected moment and preset. Every exported frame keeps the typical-design disclosure.

| Asset / moment | Overview | Drain | Inlet |
|---|---|---|---|
| S1 / zero | [Cutaway](pass3/S1-zero-overview-cutaway.png) / [Assembled](pass3/S1-zero-overview-assembled.png) | [Cutaway](pass3/S1-zero-drain-cutaway.png) / [Assembled](pass3/S1-zero-drain-assembled.png) | [Cutaway](pass3/S1-zero-inlet-cutaway.png) / [Assembled](pass3/S1-zero-inlet-assembled.png) |
| S1 / mid-rise | [Cutaway](pass3/S1-mid-rise-overview-cutaway.png) / [Assembled](pass3/S1-mid-rise-overview-assembled.png) | [Cutaway](pass3/S1-mid-rise-drain-cutaway.png) / [Assembled](pass3/S1-mid-rise-drain-assembled.png) | [Cutaway](pass3/S1-mid-rise-inlet-cutaway.png) / [Assembled](pass3/S1-mid-rise-inlet-assembled.png) |
| S1 / peak | [Cutaway](pass3/S1-peak-overview-cutaway.png) / [Assembled](pass3/S1-peak-overview-assembled.png) | [Cutaway](pass3/S1-peak-drain-cutaway.png) / [Assembled](pass3/S1-peak-drain-assembled.png) | [Cutaway](pass3/S1-peak-inlet-cutaway.png) / [Assembled](pass3/S1-peak-inlet-assembled.png) |
| S1 / after-two-hours | [Cutaway](pass3/S1-after-two-hours-overview-cutaway.png) / [Assembled](pass3/S1-after-two-hours-overview-assembled.png) | [Cutaway](pass3/S1-after-two-hours-drain-cutaway.png) / [Assembled](pass3/S1-after-two-hours-drain-assembled.png) | [Cutaway](pass3/S1-after-two-hours-inlet-cutaway.png) / [Assembled](pass3/S1-after-two-hours-inlet-assembled.png) |
| R1 / zero | [Cutaway](pass3/R1-zero-overview-cutaway.png) / [Assembled](pass3/R1-zero-overview-assembled.png) | [Cutaway](pass3/R1-zero-drain-cutaway.png) / [Assembled](pass3/R1-zero-drain-assembled.png) | [Cutaway](pass3/R1-zero-inlet-cutaway.png) / [Assembled](pass3/R1-zero-inlet-assembled.png) |
| R1 / mid-rise | [Cutaway](pass3/R1-mid-rise-overview-cutaway.png) / [Assembled](pass3/R1-mid-rise-overview-assembled.png) | [Cutaway](pass3/R1-mid-rise-drain-cutaway.png) / [Assembled](pass3/R1-mid-rise-drain-assembled.png) | [Cutaway](pass3/R1-mid-rise-inlet-cutaway.png) / [Assembled](pass3/R1-mid-rise-inlet-assembled.png) |
| R1 / peak | [Cutaway](pass3/R1-peak-overview-cutaway.png) / [Assembled](pass3/R1-peak-overview-assembled.png) | [Cutaway](pass3/R1-peak-drain-cutaway.png) / [Assembled](pass3/R1-peak-drain-assembled.png) | [Cutaway](pass3/R1-peak-inlet-cutaway.png) / [Assembled](pass3/R1-peak-inlet-assembled.png) |
| R1 / after-two-hours | [Cutaway](pass3/R1-after-two-hours-overview-cutaway.png) / [Assembled](pass3/R1-after-two-hours-overview-assembled.png) | [Cutaway](pass3/R1-after-two-hours-drain-cutaway.png) / [Assembled](pass3/R1-after-two-hours-drain-assembled.png) | [Cutaway](pass3/R1-after-two-hours-inlet-cutaway.png) / [Assembled](pass3/R1-after-two-hours-inlet-assembled.png) |

[I1 entered 80 mm sediment](pass3/I1-entered-sediment.png). The orange block was an incorrectly coloured sediment mesh with an artificial 15 mm minimum; the empty chamber now contains no slab.

## Earlier passes

[Pass 1 metrics](pass1/S1-metrics.json) and [Pass 2 metrics](pass2/S1-metrics.json) remain checkpoint evidence. Each folder contains its full 48-frame matrix. See [visual iteration log](../../visual-iterations.md), [requirement status and limits](../../ROUND9_REALISM.md) and [asset provenance](../../ASSETS.md).
