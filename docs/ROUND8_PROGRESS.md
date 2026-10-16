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

## Stage G — sensor design and ingest

- G1 done: reference design, editable generated system/wiring/chamber SVGs, pin-level netlist, BOM with no prices, network/commissioning/maintenance plan. Every document labels design-level/bench-test-pending. Sources and unverified regulatory/coverage conditions are explicit.
- G2 done: 12-byte encoder/decoder, TTN and ChirpStack raw webhook shapes, separate network/simulator integration secrets, registry/commissioning UI, raw distance-to-depth conversion, counter idempotency, range/stuck/rate/battery/float/missed checks, stored provenance, sensor history and Detected-only faults. Board rows show registered sensor trust; 3D markers use commissioned registry sensors and matching mounted-part coordinates. Actual readings are never overwritten by virtual model overlays.
- G2 done: `npm run sim:device` registers a fresh R1 device and writes a ten-sample backdated event ramp and failure cases to the local API. Whole-path run completed. Physical hardware/radio is not tested. Optional moisture values need a later payload version.
- G2 firmware: reference Arduino sketch and host encoder test supplied. Host C++ test compiled/passed, vector `010000140320fd0ce4010203` matches canonical JavaScript decoder. Arduino toolchain compilation, OTAA/session persistence, actual temperature measurement and hardware testing are not claimed.
- G3 done: About and LIMITS describe source and hardware limits. Operational pages do not badge source. No measured battery life or coverage is claimed.
- All proposed/estimated figures: 0.3 m minimum clearance (larger sensor blind zone wins), 15/2 minute periods, 3.2 V/4000 mAh pack and 70% usable capacity, assumed 0.08/45/120 mA states and 893/2/5 second normal timings, estimated 138/20 day budgets, all resistor/capacitor values, 3.3/5 V rails, pin assignments, 3000 mV battery threshold, four identical reports, 0.15 m/min trust threshold and 1 mm float comparison tolerance. These are documented design inputs, not measurements. Exact module variant, procurement prices, coverage, radio band/power and approvals remain unverified.
- Checks: 44 backend/shared tests pass, including protocol parity, auth, idempotency, conversion, trust rules, marker registry links and no automatic confirmation. Whole-path simulator and host C++ check also passed. Mobile/browser evidence follows Stage F.

## Stage D — sourced diagnosis

- D1/D2 done: nine source-labelled cases (one reported incident, eight guidance examples), three sourced passages and deterministic structured/TF-IDF top-three retrieval shared with offline mode. No maintenance outcome is invented for the incident.
- D3/D4/D5 done: Anthropic Messages and OpenAI-compatible adapters; model from env, low temperature, timeout/retry/cache, strict schema/step/citation checks and delimited untrusted text. Missing configuration, unreliable evidence or rejected/provider-failed output uses deterministic matching. Provider calls are mocked; no paid/live model test is claimed.
- D6 done: fault suggestion panel with unchanged draft steps, confidence/mode/source disclosures and logged Accept/Edit/Reject; deterministic one-line board hints and About prompt information. No chatbot or automatic work-order action.
- D7/D8 done: reproducible leave-one-out sanity check, 8 of 9 cause labels found in top three; small paired example set, not accuracy. Adversarial/timeout/cache/provider-envelope tests and prompt snapshot included. Current backend/shared count is 54 passing.
- Prompt addendum done: versioned behavior file loaded at startup, required JSON/limits/safety rules and three format-only examples. Every server suggestion carries the loaded version; the offline template is explicitly identified separately.

## Subsequent stages

E and F follow in that order. This log is updated at each stage commit. No cloud deployment is claimed.
