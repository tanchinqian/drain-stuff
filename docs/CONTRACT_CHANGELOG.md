# API contract changelog

## 4.2.0 — 16 October 2026, public demonstration

- Removed the visitor sign-in screen, bearer token checks, required operator names and `OPERATOR_TOKEN` configuration. Existing routes and response fields are unchanged.
- Application reads, writes and evidence photos are public to reachable demo visitors. New audit actors are fixed to “Demo visitor”; previous audit entries remain intact.
- Startup opens directly; offline fallback, request validation, CORS, rate limits and lifecycle gates remain. Device integration credentials and external model API credentials remain separate from visitor access.
- Storm jobs add optional `progress` (completed/total, asset, mode, phase and optional sensitivity parameter/multiplier). `GET /storm-runs/:id?statusOnly=1` omits the result payload; the existing default endpoint still returns it. Browser fallback calculations use a dedicated worker. See `STORM_PERFORMANCE.md` for scoped timings.
- Existing checks were updated for anonymous access but were not rerun for this change.

## 4.1.0 — 16 October 2026, remaining Round 8 stages

- Added photo evidence storage/retrieval, recorded owner escalations, commissioned devices, authenticated TTN/ChirpStack ingest and explicit reading provenance.
- Added constrained provider diagnosis adapters, sourced case/guidance seed, prompt-version/config/hint endpoints and safe deterministic fallback.
- Added optional device/source fields and operator test origin. Old illustrative trial outcomes move to a preserved archive; active measured comparisons/baseline readiness exclude them.
- Board and 3D share exact saved configs. Upstream spills in entered board scenarios contribute to overflow and water balance. Sensor trust faults never alter physics.
- Existing endpoint shapes remain compatible, with documented auth/workflow policies. Cloud and hardware deployment are not claimed.


## 4.0.0 — 16 October 2026, Stage A

- Added local Hono/SQLite server, shared contract/rule/engine package, migrations, durable audit and seeded `dev:all` startup.
- Bearer authentication and entered-name audit replace the unimplemented cookie-session proposal; no independent person identity is claimed.
- Added storm jobs, triage/overrides/robustness, warnings proxy, six-state fault lifecycle/verification, cases/guidance and deterministic diagnosis/feedback endpoints.
- Fault adds optional `workOrder`; existing fields remain. Legacy close/cleaned cannot bypass verification on the server. Legacy demo batch creation is disabled there.
- API GET transport can fall back with a notice after connection loss; failed writes never replay locally. Browser mock remains available, including offline previews of the new API shapes.
- No Stage B board, Stage C lifecycle UI, Stage D LLM adapter or Stage G ingest implementation is claimed. Local-first delivery makes hosting optional.


## 3.0.0 — 15 October 2026

- Typed sensor detail and numeric reading history: GET `/sensors/:id`, `/sensors/:id/readings`.
- Versioned fault registry: GET `/fault-rules`, `/fault-rules/:id`; typed trigger inputs, parts, thresholds and steps.
- Sequential fault IDs, preserved legacy ruleKey, manual reports and audited status updates: POST `/faults`, `/faults/:id/status`.
- Range-aware `/rainfall/zones` time series and `/readings` filtering. `/faults` carries unresolved records forward, and date-filters closed records.
- POST `/trials/:id/checks` replaces the operator-facing guardrail name; old alias remains. Dated new re-tests add points and record audit history.
- POST `/batches/:id/checks` supports Sour smell and audited snapshots; batch readings retain their computed prompts.
- Optional trial `amendedDepthM` and allocation depth; dose still cannot set conductivity.
- Config `minTests`, `dataThrough`; contractVersion 3.0.0. Optional legacy synthetic metadata is not required from a real API.
- Startup API discovery with session-local mock fallback, explicit data-source/notice flags, credentialed requests and structured write errors.

See [BACKEND_HANDOFF.md](BACKEND_HANDOFF.md) for examples, query semantics, compatibility endpoints and production responsibilities. No live backend compatibility certification is claimed.

## 2.0.0 — earlier sensor/assembly stage

Introduced stable sensor placement, trust/calibration metadata, part links and fault diagnosing-input provenance. Earlier stage documents describe the interface at that time; version 3 supersedes conflicting data badges, house editing and control patterns.

## 4.3.0 — part-level AI analysis

- Optional validated asset/part and bounded model snapshot on diagnosis requests.
- Optional structured hypotheses, high-level checks, missing information and provider/fallback metadata on suggestions.
- AI configuration reads expose model and configured status, never credentials.
- Original fault-only clients remain compatible.
