# Round 8 implementation progress

The owner authorised continuing through the remaining stages without routine approval on 16 October 2026. Local-first remains the deployment requirement. Stage A is committed as `fc63e21`.

## Stage B — storm board

- Done: presets/custom peak and duration, worker job progress/errors, three calculated modes for five assets, confirmed/unconfirmed chips, assignment state, peak ponding, time above a surface limit, overflow bars, ranked map selection, reason-required logged override, sensitivity orders and relative-ranking labels.
- Done: R1 typical roadside inlet/channel configuration and location. T1/T2 are excluded from both board and observation maps. Observation history remains available separately.
- Done: scenario seed has one explicitly confirmed illustrative inlet blockage. Existing saved faults are not auto-confirmed. Heavy scenario inputs yield S1 fixable, S2 capacity-limited, R1 clear. This is a demonstration, not observed performance.
- Engine correction: board scenarios use an entered upstream spill level (S1 0.05 m; others 0.15 m) for property-drain, kerb-flow and gully nodes. Removed upstream volume is counted in overflow and water balance. Existing standalone models default to no upstream spill until a board replay is loaded. Summary peak/time covers the basin and upstream surface limits; these are not inundation predictions. The illustrative catchments are explicitly entered in shared configuration.
- Official warning data is optional and cached. Recognised English/Malay levels offer explicit preset selection; unknown levels ask the operator to choose. It never supplies numeric rainfall.
- 3D mode replay, typical section and fidelity labels are completed in Stage B2 below.
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

## Stage E — materials and trial

- Done: navigation is Overview, Faults, Sensors, Materials and trial, About. Batch and trial routes remain behind the materials page, with maturity gates, allocations, marked-point protocol and safety checks.
- Done: trial comparisons keep protocol arm order and show entered measurements only. No re-test produces “No re-tests recorded yet”. Old synthetic example tests are retained in `exampleTrialArchive`, removed from active trial results and inferred baseline readiness, and are not used as measured evidence. Entered tests are tagged `origin: operator`; legacy entries with matching Test saved history and non-synthetic imported measurements are preserved.
- Done: materials wording describes compost benefit as a hypothesis and says loosening may account for most of a measured change. No inoculant prompt exists in active source; none was added. No new compost feature or efficacy claim.
- Checks: 55 backend/shared tests pass, including idempotent archival and preservation of an entered test. The updated nine mock guardrail tests pass; app/server TypeScript passes. Full regression/browser checks follow in Stage F.

## Stage F — final verification and delivery

- F1 done: **57 backend/shared tests and 67 frontend tests pass**. Four browser checks pass against an isolated real API/SQLite database, covering first connection, unreachable-API fallback, board results and the full operator workflow. The full workflow was repeated after adding an explicit wait for the 3D calculation and advancing the saved replay to minute 20. `npm run build:all` passes server/app TypeScript and the production bundle. The final malformed-uplink check returns 422 for non-object JSON instead of a server error.
- F1 done: browser evidence covers three modes per asset, capacity escalation, confirmation changing overflow, all six work-order states, saved before/after verification, sourced deterministic diagnosis with logged accept/reject, device commissioning/TTN ingest, registered 3D markers, saved replay toggle and 2D section. T1/T2 and the old Batches navigation are absent from the board. Layouts were checked at 1440, 1920 and 390 px. Axe WCAG A/AA reports no violations on the checked board and materials screens; this is not an app-wide accessibility certification. No browser page errors occurred.
- F1 done: the Impeccable finish reviewer approved the scored fixes after the mobile Plan map and current product description were corrected. The documenter found no change to the established design system was needed. No DESIGN.md or sidecar edits were made. The existing palette, radar and water appearance remain.
- F2 done: backend handoff, deployment instructions, AI evaluation, physics ownership, contract changelog, README and current product scope are updated. Contract version is **4.1.0**. Earlier stage counts describe those checkpoints only.
- F3 done: screenshots in `docs/screens/round8/` include board before/after, desktop/mobile, verified work order, diagnosis, capacity escalation, device reading, materials and the typical roadside replay. The three editable sensor SVGs were rendered and visually inspected, with automated text-boundary checks; PNG evidence uses the `schematic-` prefix.
- F4 done: `docs/LIMITS.md` records the uncalibrated model, unsurveyed geometry, scenario rainfall, small sourced library, draft procedures, shared-token identity and hardware limits.

## Item-by-item completion

| Items | Status | Evidence / limit |
|---|---|---|
| A1 shared package; A2 persistence; A3 old contract; A4 new endpoints | Done | Canonical shared logic, migrations, worker calculations and API/mock contract checks. Stage A report retains the initial checkpoint details. |
| A5 authentication and limits | Done | Local token, self-entered operator name, CORS, bounded requests/jobs, rate limits and audited changes. Shared token is not individual identity authentication. |
| A6 local launch and optional deployment files | Done for revised scope | `dev:all` seeds/starts the persistent local API and React app. Docker/Render files and persistent-disk instructions supplied. Cloud hosting was explicitly made optional. |
| A7 tests | Done | Endpoint, contract, persistence and automatic fallback checks pass. |
| B1 board; B2 ranked map; B3 typical inlet | Done | Five assets, three calculated modes, selectable ranked map, R1 section/config and fidelity label. |
| B4 representative seed; B5 robustness; B6 labels | Done | Calculated fixable/capacity/clear cases, parameter perturbations and relative-ranking labels. No outcomes hard-coded. |
| B2 addendum 1 replay; 2 fault effects; 3 fidelity | Done | Original mode snapshots, shared solver/clock, selected flagged part, parameter-driven water/restriction and entered-dimension metadata. |
| B2 addendum 4 sensors; 5 roadside view; 6 checks | Done | Commissioned markers use mounted-part coordinates and trust; R1 reuses inlet geometry; shared/unit/browser checks pass. |
| C1 lifecycle; C2 verification; C3 confirmation | Done | Six states, notes/crew/audit, guarded photo/sensor/rerun evidence, before/after, explicit unconfirmed preview. Saved runs stay immutable; a new run refreshes calculated ranking. |
| C4 escalation; C5 draft safety | Done | Recorded owner recipient/status/evidence and audited changes; no outbound message. Draft procedure banner retained. |
| D1 sourced data; D2 retrieval | Done | Nine labelled cases, three guidance passages, deterministic top-three matching. |
| D3 adapters; D4 constrained output; D5 fallback | Done | Both provider adapters, schema/ID validation, bounded requests/cache, injection constraints and deterministic fallback. Provider responses are mocked in tests. |
| D6 panel; D7 evaluation; D8 tests | Done | Cited suggestion and logged feedback, 8/9 leave-one-out cause sanity check, adversarial/timeout/cache tests. No accuracy claim. |
| AI prompt addendum 1–7 | Done | Versioned startup-loaded behavior file, rules/schema/examples, stamped suggestions, snapshot/adversarial checks and UI version disclosure. |
| E1 navigation; E2 materials; E3 no inoculant; E4 hypothesis copy | Done | Secondary materials/trial area, maturity gates/protocol, archived illustrative outcomes, entered measurements preserved, no efficacy claim. |
| F1 checks; F2 documents; F3 screenshots; F4 limits | Done | Final counts and scoped evidence above. |
| G1.1 node design; G1.2 schematic; G1.3 BOM; G1.4 deployment | Done as design documents | Editable SVGs, netlist, assumed power budget, unverified procurement/coverage/regulation and commissioning plan. No hardware fabricated. |
| G2 payload/decoder; ingest/trust; simulator; registry | Done | Canonical 12-byte protocol, raw provenance, duplicate/counter handling, Detected-only faults and working local whole-path simulator. |
| G2 reference firmware | Done as reference only | Sketch and host encoder supplied; C++ encoder compiled/passed. Arduino compilation, flashing, session persistence and electrical/radio bench tests remain unverified. |
| G3 honest source/hardware limits | Done | About, LIMITS and IoT documentation retain design/estimate/source disclosures; operational pages avoid persistent source badges. |

## Local operation, configuration and remaining limits

- Local app: **http://127.0.0.1:5174**; API: **http://127.0.0.1:8080/api/v1**. The launcher chooses the next free port if necessary. The older preview occupying 5173 is separate. Start with `npm run dev:all` from the repository root; persistent working data is `data/drain.sqlite`.
- The supplied key is saved as `OPERATOR_TOKEN` only in ignored `.env.local`. The launcher also maintains a separate simulator integration secret. Secrets, databases, build output and dependency folders are excluded from Git. The first connection asks for operator name and token.
- Required local settings: `OPERATOR_TOKEN` (at least 24 characters), `DB_PATH`, and `LLM_PROVIDER=none`. The launcher supplies local host/ports and seeds an empty DB. `.env.example` documents `PORT`, `APP_PORT`, `HOST`, `SEED_DEMO` and optional exact `CORS_ORIGIN` values. No CORS setting is needed for same-origin production serving.
- Optional explanations require `LLM_PROVIDER=anthropic` or `openai-compatible`, plus separate server-only `LLM_API_KEY` and `LLM_MODEL`; compatible endpoints may set `LLM_BASE_URL`. Without them, or on rejected/failed provider output, diagnosis remains sourced deterministic matching. No live paid provider request was made.
- Optional physical ingest requires `LORAWAN_INGEST_SECRET`; the simulator uses distinct `LORAWAN_SIM_SECRET`. Either integration secret must be at least 24 characters. Commission a device before ingest. The simulated integration never claims physical-device provenance.
- No new deployed URL: the owner explicitly replaced deployment with the local-first outcome. Optional hosting templates have not been built or deployed. No changes are pushed by this delivery.
- No settled-decision conflict remains. All geometry/calibration inputs are illustrative; no surveyed township network, rainfall prediction, flood reduction, compost efficacy, field-tested hardware or measured battery life is claimed. Estimated/unverified IoT figures are enumerated under Stage G and in its source documents.
