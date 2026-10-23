# Five-minute demonstration

## Two-minute button path

Open the local app with `?demo=1`. The docked panel stays hidden in normal use. Its number keys run the matching buttons while the panel is open. Start with **Reset demo**, then:

| Button | Result |
|---|---|
| 1 · Reset demo | Restores the seeded browser data and returns to Overview. The live API has no reset route; with the local server connected, stop it and use `npm run demo:reset`, then restart it. |
| 2 · Heavy storm, run | Runs the Heavy preset with seeded settings, plays the saved rainfall timeline from minute 0, and shows the ranked board. S1 is the fixable example and S2 is the capacity-limited example. |
| 3 · Open fixable row in 3D | Opens S1’s saved replay at minute 0, with the Drain camera, Cutaway view, default section position and inlet fault highlight. Playback starts automatically. |
| 4 · Open the fault and diagnosis | Opens F-001 at Suggested diagnosis. This button uses local deterministic matching and does not call the model endpoint or require a key. Accept, Edit and Reject stay available; their demo feedback is stored only for this browser session. |
| 5 · Advance work order | Advances F-001 one lifecycle step per press, adding a seeded note and the **Demo operator** audit actor. The seed already records F-001 as confirmed, so the first press assigns the demo crew. Verification uses the saved storm run. |
| 6 · Go to audit trail | Opens F-001 and expands the audit trail. |
| 7 · Back to board | Returns to Overview. |
| 8 · Show chatbot | Opens S1’s fault assistant with F-001 and inlet context. It does not send a message; the connection status reflects local Ollama availability. |

After any button, the footer shows **Demo scenario (seeded)** for the rest of the browser session. Use **Hide for recording** to remove the panel; it reappears on a reload with `?demo=1`. The recording panel is outside the 3D canvas capture and is hidden for print.

## Demo-control implementation status

| Item | Status | Notes |
|---|---|---|
| 1 · Demo panel | Done | Hidden by default; URL and Ctrl+Shift+D opening; session-only state; collapse, numeric shortcuts and hide-for-recording control. |
| 2 · Reset demo | Partly done | One-click reset restores the seeded browser mock. The existing local database reset is a stop-server CLI script, so no unauthenticated database-reset route was added. |
| 3 · Heavy storm, run | Done | One-click Heavy run, automatic replay from minute 0, and a side-by-side ranked board. |
| 4 · Open fixable row in 3D | Done | S1 replay opens with the specified camera, cutaway, initial cut and playback. If no saved run exists, the seeded default model opens. |
| 5 · Open fault and diagnosis | Done | Deterministic local diagnosis is shown without a model request. Demo feedback stays in session storage. |
| 6 · Advance work order | Done | One lifecycle transition per press; seeded notes and an explicit demo actor. The seed’s existing F-001 confirmation is retained. |
| 7 · Audit trail and board | Done | Buttons open the expanded audit trail and return to Overview. |
| 8 · Show chatbot | Done | Opens the S1 fault assistant with F-001 inlet context; it sends no message and reports the real Ollama connection state. |

The floating panel is not included in the renderer’s Record preset capture because that capture exports the 3D canvas only. No engine, solver, scoring, AI, or 3D rendering logic is changed by these controls.

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
