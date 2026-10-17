# Current Round 8

The local React/Hono/SQLite console now has a storm triage Overview for S1/S2/S3/I1/R1, three-mode calculations, ranked map selection, saved 3D replay, six-state work orders with verification, recorded owner escalations, registered device ingest and a simulator. Materials and trial is a secondary area; old illustrative test outcomes are archived separately from entered measurements. The accepted wire contract is **4.2.0**, with canonical logic in `shared/src`.

`npm run dev:all` starts the app and persistent backend. The demonstration opens without a login. Application reads/writes and photos are public to reachable visitors; new API audit entries use “Demo visitor”. No operator token is configured. Cloud deployment remains optional and has not occurred. Anthropic and OpenAI-compatible diagnosis adapters are implemented behind server-only configuration; the current local configuration uses sourced deterministic matching without an LLM key/model. Suggestions never confirm faults, assign work or invent repair steps.

The cream/brown Archivo Map desk identity and approved radar/water colours are preserved. Nodes, electrical figures and firmware remain designs awaiting bench tests; no hardware deployment, measured battery life, radio approval, forecast accuracy or field calibration is claimed. See `docs/ROUND8_PROGRESS.md`, `docs/AI_EVALUATION.md`, `docs/LIMITS.md` and `docs/iot/`. Earlier stage and deployment statements below are historical where superseded by this scope.

# Drain Trial Console

## Current Round 6 refinement

The accepted water-realism brief adds the missing shared DrainDesign, real depression/closed sections, peak-opening and compact playback prerequisites, then a mixed-form 2D Richards soil field in the existing worker. Cached theta/saturation drives soil shading and section views; engine depth/discharge drives water, rain, inlet, pipe and overflow effects. The new water-only appearance exception supersedes flat cyan; the approved radar/UI identity remains. This remains uncalibrated and does not add forecast accuracy, field evidence, hysteresis or macropores. Media Ks comes from the trial/entered value, never compost dose. See `docs/ROUND6_WATER_REALISM.md` for measured acceptance and limitations. Earlier scope notes below are historical where superseded.

## Purpose and users

An operator console for a small drainage and compost pilot. Operators inspect pilot houses, drainage parts, compost bays, sensor trust and faults, then record checks and compare untreated soil, loosened soil and soil loosened with compost at the same marked spots.

## Accepted scope

- Local React app in `app/`, using contract **4.2.0** through one API client. A configured, reachable backend is preferred; the browser-local mock is the fallback. A local backend is now bundled; standalone mock mode remains.
- Confirmed identity: **Map desk**, with cream and brown surfaces, Archivo typography, native controls and geometric schematics. The user explicitly retained the seven radar colours and cyan water when approving Round 3's other changes.
- Uncapped responsive work surface with 24px desktop and 12px mobile gutters, shared record tables, searchable grouped asset rails, non-modal drawers, plain display names, glossary popovers and dated save feedback. Record histories stay collapsed until opened; no universal page activity history.
- Overview uses fixed mapped geometry, **24 interactive pilot houses**, six feature destinations, a Plan alternative and optional sensor markers. Context houses are geometry only. House movement and layout editing are removed.
- The offline Gamelan / Rodat housing window uses mapped footprints; pilot assignments, heights and drainage geometry require field confirmation. Rainfall interpolates dated API zone samples and follows the selected history window and shared playback; it is not live radar or a forecast.
- Sixteen drainage parts and eight compost-bay parts retain selection, explode, section, isolate, hide and reset controls. Advanced part movement remains a model control, separate from fixed map houses. Optional parts show “Not installed”.
- S1/S2/S3/I1/T1/T2 share a worker-driven hydraulic timeline, cyan waterline, short rain strokes, soil moisture shading, partial pipe fill, flow-width arrows, flow strip, charts, CSV and grouped Model details. Compost amendment depth/dose/batch are recorded separately from conductivity.
- Five trial records support fixed-point baselines/re-tests, safety checks, guarded allocations in a drawer and dated record history. The three-arm comparison shows recorded before/latest means, three marked points per seeded trial and 24 re-tests per seeded arm. Readiness uses `config.minTests`; the effective due day is the earlier of the recorded due day and latest test plus seven days, compared against today in Singapore.
- Batch prompts derive from readings, checks and configurable thresholds. Segmented squeeze/smell controls, maturity reasons and check/reading histories preserve human decisions. Compost defaults to the model with small Model / Readings / Checks modes, a compact four-column part-sensor table and the latest bay summary beneath the model. The thermal engine is not a fully integrated thermal UI.
- Sensors shows saved API latest readings, trust and updated time; detail drawers hold positions, calibration/method checks, history and linked rules. Feature views overlay eligible virtual readings without writing them into sensor history.
- Faults / Rules tabs share the register pattern. Faults have sequential IDs, rule provenance, manual reporting, a status control in the status cell and collapsed audit history. Unresolved faults remain in Overview counts across date windows; temporary model alerts remain separate scenario outputs.

## Boundaries and evidence

The data-source notice belongs only on **About / Data and limits**, controlled by `VITE_DATA_SOURCE` and `VITE_SHOW_DATA_NOTICE`. Operational pages and exports use plain record names without persistent synthetic/demo badges. About and technical docs retain data provenance and model limits. Mock data is generated, not field evidence; new seeds anchor observations to the app load time, while persisted user writes and actual histories retain their saved timestamps. Seed values are deterministic; seed dates are load-relative.

Public map geometry is credited; the models are not surveys or design drawings. Dimensions, engineering coefficients, thresholds, dose caps and targets are provisional pending practitioner confirmation against MSMA and the local authority. Soil and compost moisture are indirect/relative proxies requiring reference checks. Manual infiltration tests, squeeze/smell logs and photo checklists remain human records. Oxygen and ammonia gas probes remain excluded.

The console supports local ponding and drain upkeep decisions. It makes no flood-reduction percentage or general compost efficacy claim. Conductivity follows the latest trial test mean/sample count unless manually overridden, never the compost dose. Trial histories, current model scenarios and human observations remain distinct. The model does not solve reverse river flow, full sediment transport, biological fault causes or a dynamic sewer network.

## Current authorization and records

Round 4 applies `CODEX_ROUND4_STABILISE_PROMPT.md` within the existing Map desk identity. The user-approved seven radar colours and cyan water are preserved, continuing the Round 3 colour override. Changes remain local; no push is authorized. Earlier addendum and physics stage records are historical where superseded by this scope.

See `docs/BACKEND_HANDOFF.md` for the current transport/record contract, `docs/PHYSICS_MODEL.md` for equations and limitations, `docs/MAP_MODEL.md` for mapping behavior, and `docs/ROUND4_STABILISATION.md` for current stabilisation evidence and `docs/round3-review.md` for historical Round 3 evidence. The current React app is published through a separate Sites source/hosting identity. Historical HTML previews remain separate artifacts.

## Round 7 visibility

Feature models now open in Cutaway with a closer inlet-side view, neutral rain around the catchment, a visible saturation contour, road/roof-edge context and a three-label annotation budget. Debug shows measured FPS; the toolbar shows current adaptive quality. The numerical engine and entered conductivity remain unchanged. See `docs/ROUND7_VISIBILITY.md` for requirement status and evidence.
