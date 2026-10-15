# Drain Trial Console

## Purpose and users

An operator console for a small drainage and compost pilot. Operators inspect pilot houses, drainage parts, compost bays, sensor trust and faults, then record checks and compare untreated soil, loosened soil and soil loosened with compost at the same marked spots.

## Accepted scope

- Local React app in `app/`, using contract **3.0.0** through one API client. A configured, reachable backend is preferred; the browser-local mock is the fallback. No backend is bundled.
- Confirmed identity: **Map desk**, with cream and brown surfaces, Archivo typography, native controls and geometric schematics. The user explicitly retained the seven radar colours and cyan water when approving Round 3's other changes.
- Wide responsive work surface, shared record tables, master-detail registers, non-modal drawers, plain display names, glossary popovers and dated save feedback/history.
- Overview uses fixed mapped geometry, **24 interactive pilot houses**, six feature destinations, a Plan alternative and optional sensor markers. Context houses are geometry only. House movement and layout editing are removed.
- The offline Gamelan / Rodat housing window uses mapped footprints; pilot assignments, heights and drainage geometry require field confirmation. Rainfall interpolates dated API zone samples and follows the selected history window and shared playback; it is not live radar or a forecast.
- Sixteen drainage parts and eight compost-bay parts retain selection, explode, section, isolate, hide and reset controls. Advanced part movement remains a model control, separate from fixed map houses. Optional parts show “Not installed”.
- S1/S2/S3/I1/T1/T2 share a worker-driven hydraulic timeline, cyan waterline, short rain strokes, soil moisture shading, partial pipe fill, flow-width arrows, flow strip, charts, CSV and grouped Model details. Compost amendment depth/dose/batch are recorded separately from conductivity.
- Five trial records support fixed-point baselines/re-tests, safety checks, guarded allocations and dated history. Readiness uses `config.minTests`; due status compares today's Singapore calendar day.
- Batch prompts derive from readings, checks and configurable thresholds. Segmented squeeze/smell controls, maturity reasons and check/reading histories preserve human decisions. The compost model presents batch records/checks; the thermal engine is not a fully integrated thermal UI.
- Sensors shows saved API latest readings, trust and updated time; detail drawers hold positions, calibration/method checks, history and linked rules. Feature views overlay eligible virtual readings without writing them into sensor history.
- Faults have sequential IDs, rule provenance, manual reporting, changeable status and audit history. Unresolved faults remain in Overview counts across date windows; temporary model alerts remain separate scenario outputs.

## Boundaries and evidence

The data-source notice belongs only on **About / Data and limits**, controlled by `VITE_DATA_SOURCE` and `VITE_SHOW_DATA_NOTICE`. Operational pages and exports use plain record names without persistent synthetic/demo badges. About and technical docs retain data provenance and model limits. Mock data is generated, not field evidence; new saves use wall-clock time while seeded observations end at 12 October 2026, 09:40 Singapore.

Public map geometry is credited; the models are not surveys or design drawings. Dimensions, engineering coefficients, thresholds, dose caps and targets are provisional pending practitioner confirmation against MSMA and the local authority. Soil and compost moisture are indirect/relative proxies requiring reference checks. Manual infiltration tests, squeeze/smell logs and photo checklists remain human records. Oxygen and ammonia gas probes remain excluded.

The console supports local ponding and drain upkeep decisions. It makes no flood-reduction percentage or general compost efficacy claim. Conductivity follows the latest trial test mean/sample count unless manually overridden, never the compost dose. Trial histories, current model scenarios and human observations remain distinct. The model does not solve reverse river flow, full sediment transport, biological fault causes or a dynamic sewer network.

## Current authorization and records

Round 3 applies `CODEX_ROUND3_PROMPT.md` **except all colour changes**, as approved by the user, within the existing Map desk identity. Changes remain local; no push is authorized. Earlier addendum and physics stage records are historical where superseded by this scope.

See `docs/BACKEND_HANDOFF.md` for the current transport/record contract, `docs/PHYSICS_MODEL.md` for equations and limitations, `docs/MAP_MODEL.md` for mapping behavior, and `docs/round3-review.md` for the bounded review evidence. The separately published Sites visualization remains an exact copy of its supplied attachment with separate source and hosting identity.
