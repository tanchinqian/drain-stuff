# Round 8 implementation progress

The owner authorised continuing through the remaining stages without routine approval on 16 October 2026. Local-first remains the deployment requirement. Stage A is committed as `fc63e21`.

## Stage B — storm board

- Done: presets/custom peak and duration, worker job progress/errors, three calculated modes for five assets, confirmed/unconfirmed chips, assignment state, peak ponding, time above a surface limit, overflow bars, ranked map selection, reason-required logged override, sensitivity orders and relative-ranking labels.
- Done: R1 typical roadside inlet/channel configuration and location. T1/T2 are excluded from both board and observation maps. Observation history remains available separately.
- Done: scenario seed has one explicitly confirmed illustrative inlet blockage. Existing saved faults are not auto-confirmed. Heavy scenario inputs yield S1 fixable, S2 capacity-limited, R1 clear. This is a demonstration, not observed performance.
- Engine correction: board scenarios use an entered upstream spill level (S1 0.05 m; others 0.15 m) for property-drain, kerb-flow and gully nodes. Removed upstream volume is counted in overflow and water balance. Existing standalone models default to no upstream spill until a board replay is loaded. Summary peak/time covers the basin and upstream surface limits; these are not inundation predictions. The illustrative catchments are explicitly entered in shared configuration.
- Official warning data is optional, cached, and can select Heavy; it never supplies numeric rainfall.
- 3D mode replay, typical section and fidelity labels are integrated in Stage B2 next.
- Verification: 35 backend/shared tests pass, including all three demo conditions and water-balance error below 1e-5; app TypeScript build passes. Browser checks are recorded under Stage F.

## Stage B2 — 3D replay

- Done: board replay opens the asset with its saved input snapshot. As installed / If cleared toggle loads the exact saved mode config into the shared worker and clock. Later temporary parameter edits leave the saved run unchanged.
- Done: R1 reuses concrete inlet geometry and the existing 2D section. Typical-design fidelity appears on every feature; dimension edits record local operator/date metadata.
- Done: inlet restriction banks water on the roadside context using computed upstream node depth; restricted socks darken; existing pipe fill and gravel water levels follow engine outputs. Sensor-suspect/detected faults leave configs unchanged.
- Done: DrainDesign exposes the same part IDs as the feature list; unit checks cover the five assets, changed water for confirmed faults, and identical configs for sensor/detected-only faults. Registered sensor markers are completed alongside the Stage G registry.

## Stage C — work orders

- Done: fault drawer uses the six-state lifecycle, searchable/free-text crew names, required notes, and the recorded audit history. Existing status shortcuts are replaced by workflow controls.
- Done: verification offers trusted registered sensor/unit, saved storm re-run with before/after overflow, or a bounded uploaded photo. Photos are stored beside the configured database, require operator auth to retrieve, accept PNG/JPEG/WebP signatures only, and have a 5 MB limit. No photo upload is claimed in standalone mock mode.
- Done: capacity-limited assets open owner escalation with saved three-mode evidence, recipient, note, acknowledgement/resolution and immutable audit. This records a hand-off; it sends no email or message.
- Done: unconfirmed preview is explicit on the board; changes affect subsequent runs, not past snapshots. Re-run after workflow changes to refresh the board's calculated evidence.
- Verification: 38 backend/shared tests pass, covering photo rejection/storage, escalation persistence/status audit, lifecycle and rerun verification. App TypeScript passes.

## Subsequent stages

G, D, E and F follow in that order. This log is updated at each stage commit. No cloud deployment is claimed.
