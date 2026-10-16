# Round 8 — Stage A delivery

## Accepted boundary

The user's local-first correction replaces mandatory cloud deployment with: **`npm run dev:all` starts the server and app together with a seeded database**. Complete and commit Stage A, then stop. Stages B, B2, C, G, D, E and F have not been started. The existing Overview and navigation remain; the board and work-order UI are later stages.

## Stage A item status

| Item | Status | Evidence / limitation |
|---|---|---|
| A1 shared code | Done | Canonical types, seed/pure record logic, rules, inspection rules, repair library, model catalogue, site geometry, hydraulic/Richards modules, fault mapping, retrieval and deterministic diagnosis live in `shared/src`. Existing app imports are compatibility exports. Browser mock and API reuse them. |
| A2 run and persist | Done | Hono under `/api/v1`, SQLite with migrations, idempotent seed, aggregate application state plus separate audit, run, override, case, guidance, suggestion and feedback tables. Built React assets are served by the same process. `dev:all` starts both services and seeds empty data. |
| A3 existing contract | Done | Existing reads and supported writes implemented; version 3 response fields retained. Version 4 adds auth/workOrder and intentionally guards legacy closing. Read transport falls back automatically on network failure; failed writes never replay to mock. Saved sensor values/times are preserved on server reads. |
| A4 new endpoints | Done for Stage A | Worker-thread storm jobs, ranked three modes, perturbation orders, logged overrides, cached official-warning proxy, lifecycle/evidence/rerun endpoints, cases/guidance, deterministic diagnosis and feedback. API and offline response shapes checked. Stage D's LLM adapters and sourced guidance/example seed are deliberately not built early. |
| A5 auth/safety | Done | Shared bearer token, first-use name/token form, exact-origin CORS, actor/time stamped by server, 128 KiB request cap, route validation, bounded worker queue and calculation timeout, AI/storm rate limits, immutable audit update/delete triggers. Names are self-asserted under a shared token, not identity-provider accounts. |
| A6 startup/deployment | Done for revised local outcome | One-command launcher verified, with persistent seeded SQLite and automatic free-port choice. Build/start/seed scripts and environment reference included. Optional Docker/Render templates included but not built/deployed; hosting was explicitly made optional. |
| A7 tests | Done | API and contract checks, worker calculations, six-state verification, audit integrity, restart persistence, warnings cache/fallback, auth/CORS/body/rate checks, client fallback and no-write-replay checks, plus browser first connection and fallback. See final test counts below. |

## Calculation and workflow decisions

Only confirmed/assigned faults affect the installed run; detected faults require an explicit preview option. Sensor suspect/offline faults never change physics. Config-defined upkeep changes are removed for If cleared; Capacity limit removes all mapped fault changes. Conductivity uses the same shared latest-test mean as the feature model, with its source/sample count, never compost dose. Temporary manual edits on the legacy feature page remain browser-only until Stage B2 wires board replays. Overflow sorting and time-above-crest tie-breaks are computed from runs; no outcome is hard-coded. R1 reserves a typical inlet/concrete-drain scenario using equivalent circular Manning capacity; its board/map registration and drawings belong to Stage B/B2.

Storm POST responds with a job ID/status rather than holding HTTP open. Results are durable; interrupted jobs become failed on restart. A one-worker queue limits contention and memory, with five admitted jobs and a 180-second calculation timeout. Cached result timelines omit large soil arrays; configs and summaries are retained. The original engine remains uncalibrated.

Verification requires a registered trusted sensor/unit, an existing local evidence-photo path, or a re-run of a completed storm containing the confirmed fault. The re-run uses the original storm, fault and trial-input snapshot with only the target fault removed, so other changing faults do not confound the comparison. Current-state optimistic checks prevent two overlapping verifications from overwriting one another. Photo upload/UI and escalation-record UI remain Stage C.

The legacy server status endpoint cannot close unverified work; `cleaned` cannot bypass the workflow; legacy demo batch creation is disabled. Offline legacy behavior remains compatible for the current UI. These are documented version-4 policy differences. The new offline run/case/suggestion/override preview caches are memory-only; existing record/work-order changes still use browser persistence. Durable operation uses the local API.

## AI in this stage

With or without an LLM key, Stage A uses deterministic structured/text retrieval and literal step IDs from the existing **draft, practitioner-review-required** library. No external provider is called. Missing cases or unreliable sensor evidence returns “Not enough information” and no ranked steps. The guidance table starts empty, and no public incident/guidance examples are fabricated. A verified, closed operator case records its source. Stage D will add the required sourced library, provider adapters, versioned prompt and evaluations. This is not a completed AI explanation system.

## Local verification

The local app/API connection was verified at `http://127.0.0.1:5174` / `http://127.0.0.1:8080/api/v1`. Database `data/drain.sqlite` survives launcher restarts. The token is in ignored `.env.local`, never printed. Evidence captures: `docs/screens/round8/stage-a-connection.png` and `stage-a-sensors.png`. These are Stage A evidence, not screenshots of the unbuilt Stage B board.

Final verification on 16 October 2026: **34 backend/shared tests, 67 frontend tests and 2 browser checks passed**. `npm run build:all` passed, including server and app TypeScript checks. Browser checks covered first connection through the real API proxy and automatic fallback when the API is unreachable. The Windows sandbox prevented the test runner's temporary-file renames; the same checks passed outside that sandbox. Optional cloud deployment and Docker build are not claimed.
