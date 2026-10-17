# Five-minute demonstration

## Starting state

1. Install with `npm ci` and `npm --prefix app ci` from the repository root.
2. Stop any local API, run `npm run demo:reset`, then `npm run dev:all`. Reset preserves a timestamped SQLite backup. It does not remove uploaded evidence files.
3. Open the printed app URL, reload the tab, choose **Heavy**, and turn off the ±25% sensitivity check for a short recording. Keep **Preview unconfirmed faults** off. Run a fresh storm so an older saved run is replaced.
4. The seed has confirmed inlet upkeep at S1, capacity-limited S2 and clear S3. Geometry and catchments are illustrative. Existing operator decisions are never silently reset by startup.
5. For a live model, configure `server/.env` using `AI_LIVE_CHECK.md` and run `npm run check:ai` yourself first. Without a validated model connection, the video must say **case matching**, not claim a live LLM diagnosis. Terminal fallback reasons remain visible.

## Recording path

| Time | Click path | Expected result / narration |
|---|---|---|
| 0:00–0:35 | Overview → explain Bandar Bukit Raja Phase 1 | Local upkeep prioritisation, with entered rainfall and illustrative assets. This is not a weather forecast or a flood-reduction prediction. |
| 0:35–1:25 | Heavy → Run storm → Upkeep priority → Watch storm / Replay | Five assets finish calculation. Rainfall cloud and cursor share the clock. S1 shows a computed reduction when its confirmed obstruction is cleared; S2 still overflows when cleared; S3 has no overflow. Explain the three bar tones and relative ranking. |
| 1:25–1:55 | S1 → Replay in 3D → Parts → inlet; switch Assembled / Cutaway | Rain, storage and flow follow model outputs. Show compact L/min stages and the selected-part reading. Model details shows entered parameters. |
| 1:55–2:45 | Faults → F-001 → Suggested diagnosis → Cited evidence / How this was produced → Accept or Edit | Retrieval starts automatically. State the actual Mode and fallback reason. Sources distinguish guidance examples and reported incidents. The numbered steps remain draft guidance. Edit/Reject requires a reason; feedback appears in the audit trail. |
| 2:45–3:35 | Work order: add note and crew → Assign crew; add clearance note → Record cleared; add verification note → Verify clearance | S1 starts confirmed. The same saved storm supplies before/after verification; wait for Verified. Close only after reviewing that evidence. Confirmation and clearance are recorded human actions, separate from an AI suggestion. Do not describe the demonstration as field maintenance. |
| 3:35–4:15 | Sensors → select input → inspect trust and timestamp; Materials and trial → trial protocol | Distinguish physical device integrations from simulated and reference inputs. The device register says bench test pending. Trial arms share marked points and need real repeat tests; seed examples are archived instead of presented as measurements. |
| 4:15–5:00 | R1 → Fit channel / Inspect inlet close-up → About | Typical unsurveyed roadside geometry, uncalibrated hydraulic comparison and limited sourced case library. Ask for a surveyed pilot site, practitioner review and independent sensor/inspection measurements. Avoid accuracy, forecast or compost flood-reduction claims. |

## Recovery between takes

Pause playback before discussing a static result. Use **Reset storm** for the clock, **Fit channel** for R1 framing, or **View controls → Reset view** for other models. Close drawers with X, outside click, Escape or mobile Back. Unsaved text asks before dismissal.

For a complete restart, stop the launcher and use `npm run demo:reset`; do not delete the database by hand. Refresh the browser and run a new storm. If an older result remains visible, it is a saved scenario, not a live recalculation. Changes to fault confirmations require a new run.

## Recording evidence

Capture screenshots from the actual app, redact credentials, and record the exact model Mode shown. Three-viewport cleanup captures are in `docs/screens/round8b/`. Automated mock checks do not establish a live provider connection, hardware commissioning or real drainage accuracy.
