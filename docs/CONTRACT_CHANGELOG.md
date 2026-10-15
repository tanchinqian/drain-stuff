# API contract changelog

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
