# Backend handoff — contract 4.0.0

## Stage A local production path

The implemented API is `server/src/api.ts` (Hono + better-sqlite3). Canonical types, schemas, record/rule logic and engine modules are in `shared/src`; `app/src/api/types.ts` and the original engine paths are compatibility exports. `npm run dev:all` starts the local app and server with an idempotently seeded database. This is the required outcome under the user's local-first instruction; cloud deployment is optional and has not occurred. See [DEPLOY.md](DEPLOY.md) and [ROUND8_STAGE_A.md](ROUND8_STAGE_A.md).

All `/api/v1` routes require `Authorization: Bearer <OPERATOR_TOKEN>`; POST also requires `X-Operator-Name`. The server stamps audit actor/time and ignores body user/appliedBy as identity. The entered name is self-asserted under a shared token. Bodies are capped at 128 KiB; unknown/invalid fields fail validation. CORS allows the same host or configured exact origins. SQLite uses one writer process, WAL and numbered transactional migrations. An append-only audit table rejects update/delete; this is not protection against an administrator replacing the database file.

### New endpoints

| Method/path | Request / response |
|---|---|
| POST `/storm-runs` | `{preset:"moderate|heavy|extreme",assets:["S1",...],options?}` OR `custom:{peakMmHr,durationMinutes}`; returns 202 job `{id,status,input,result,error,createdAt,actor}`. Assets S1/S2/S3/I1/R1 only. |
| GET `/storm-runs/:id` | Same job; poll until completed/failed. Jobs and fault/config snapshots persist. Soil arrays are not stored in JSON; light timelines/configs/summaries are. |
| GET `/triage?stormRunId=` | Ranked three-mode results, capacity flag, fault IDs, perturbation orders, recorded overrides, and `Relative ranking, not a prediction`. |
| POST `/triage/overrides` | `{stormRunId,asset,position,reason,user?}`; reason required; server actor wins; immutable audit. |
| GET `/weather/warnings` | Cached [data.gov.my weather warnings](https://developer.data.gov.my/realtime-api/weather), five-minute positive / 30-second unavailable cache. Failure: `{available:false}`. No rainfall forecast conversion is made. |
| POST `/faults/:id/confirm`, `/assign`, `/clear`, `/verify`, `/close`, `/reopen` | `{note,assignee?,evidence?}`; returns saved Fault with optional `workOrder`. State sequence detected→confirmed→assigned→cleared→verified→closed. Reopen returns detected. Named assignee required. Capacity-limited latest runs block clearance assignment. |
| GET `/faults/:id/audit` | Server audit rows for this fault. Legacy record history remains on Fault. |
| GET `/cases`, GET `/cases/:id` | Source-labelled operator cases. No fabricated public incident seed. |
| POST `/cases` | `{faultId,cause,outcome,stepsTaken[]}`; only a verified closed fault, known draft step IDs; one case per fault. |
| GET `/guidance` | Source-bearing guidance records; empty until Stage D seeds the reviewed public-source library. |
| POST `/ai/diagnose` | `{faultId}`; deterministic retrieval suggestion, sources, draft banner, mode and `stage-a-deterministic-v1`. Missing/untrusted evidence gives insufficientInformation and no steps. No LLM call in Stage A, regardless of key. |
| POST `/ai/feedback` | `{suggestionId,choice:"accept|edit|reject",note,rankedStepIds?}`; validates draft step IDs; persists feedback/audit. |

Verification evidence is one of `{type:"sensor",sensorId,value,unit}`, `{type:"photo",path:"/uploads/name.jpg"}`, or `{type:"storm-rerun",stormRunId}`. Sensor must be registered on the asset, trusted, and use its unit. A photo must already exist under local `data/uploads`; upload UI belongs to Stage C. Re-runs compare the original job's installed summary with the same storm/fault snapshot after removing only this confirmed fault. A concurrent lifecycle change fails with 409. Stage C's attachment/escalation UI and Stage D's provider adapters are not delivered early.

Six storm requests/minute and twenty AI requests/minute share token-level process buckets. The single-worker queue admits up to five jobs and enforces a 180-second calculation timeout. Interrupted jobs become failed on restart. Only confirmed/assigned faults count; explicit preview may include detected faults; sensor trust faults never alter the physics. The If cleared run removes mapped upkeep faults, while Capacity limit removes all mapped fault effects. See `shared/src/physics/faults.ts` and `triage.ts`.

Legacy compatibility policies: `/faults/:id/status` cannot close unverified work; `/actions` with `cleaned` cannot bypass verification; legacy `POST /batches {}` is rejected with 403. Other existing response fields are retained. The following reference tables describe those existing data shapes; version-4 policies above supersede older workflow notes.


## Round 6 worker result extension

The hydraulic worker output is version-local, not a saved observation endpoint. `PhysicsRun` adds `computeMs`; frames are cached at minute boundaries. `PhysicsFrame` adds `soilResidual`, `pipeFill` (y/D), `pipeVelocity` (m/s), optional `cell.native` (m3 storage change), and optional `soil` for swales/tree pits. `soil` contains `nx,nz,width,depth,dx,dz`, `theta:Float32Array`, `saturation:Float32Array`, optional `surfaceWetness:Float32Array` and `wetBandHeight` (m). Arrays are row-major `[depthRow*nx+acrossColumn]`, top first. All buffers transfer from the worker; inlet chambers omit soil. Persisting this output needs binary storage or explicit array serialization, not numeric-key JSON objects.

`cell.pipe` stores the finite downstream conduit volume. `flux.drain` is soil/chamber discharge entering that pipe; new `flux.outfall` is its actual discharge leaving the feature. `cumulative.outlet` integrates outfall, not underdrain inflow. Pipe y/D comes from stored circular-segment area, and velocity is outfall Q divided by that area. CSV adds pipe storage as well as outfall discharge; consumers must not conflate these two flows.

Grid storage is change relative to the initial retention field; native storage participates in the ledger. Direct bed rain is now included in input. CSV adds native storage change, pipe fill/velocity and soil residual columns. Saved sensor/trial/batch APIs and schema v2 persistence are unchanged. Moisture overlays sample installation depth without overwriting observations. See PHYSICS_MODEL.md and ROUND6_WATER_REALISM.md for uncalibrated-model limits.

This is the current local React application's contract, superseding endpoint and UI statements in earlier stage records. Authoritative shapes: `shared/src/api/types.ts`; callers: `app/src/api/client.ts`; executable local behavior: `app/src/api/mock/`. [Concrete response examples](contract-examples.v3.json) were generated from that implementation. Each top-level list example contains its first item only; nested objects retain their fields. Optional properties can be omitted. A local persistent backend is implemented. No field probes or cloud deployment are claimed.

## Connection, environment and authentication

Vite reads these values at startup/build. Restart the development server after changing `.env.local`.

```dotenv
VITE_API_BASE=http://127.0.0.1:8080/api/v1
VITE_DATA_SOURCE=api
# Optional; unset uses the selected source's default.
VITE_SHOW_DATA_NOTICE=
```

- An empty base selects the browser-local mock. `VITE_DATA_SOURCE=mock` explicitly forces it even with a base. `api` or an unset source prefers a configured base.
- API discovery probes `GET {base}/config` once per page load with a 2.5-second timeout. Network/timeout/5xx failure selects mock for the session. A 4xx response stays in API mode so authentication/authorization errors remain visible. Every screen then uses the same `api.*` client functions.
- After discovery, a network failure on a GET opens the mock with a visible connection notice. A failed write is never retried against mock. Ordinary requests time out after 15 seconds; verification can wait up to 180 seconds. Reload to rediscover the source. Discovery can issue an extra config request; no continuous health polling occurs.
- Requests use bearer headers and `credentials: omit`. The first-use connection form keeps the token/name in tab session storage. A 401 returns to that form. Never put the operator token in Vite configuration or a public bundle.
- `VITE_SHOW_DATA_NOTICE=true` shows one small source notice on About; `false` hides it; unset shows it only for mock. Operational pages have no source badge. Vite variables are public build configuration, never secrets.

To switch: implement the contract and errors below, configure the base and `api` source, restart, check `/config`, and exercise reads plus a permitted write against a disposable backend environment. Browser transport tests cover discovery, fallback and failed writes with intercepted responses, not a live backend.

## Wire conventions

All bodies and responses are JSON, no envelope around successful lists. POST sends `Content-Type: application/json`. GET has no body. IDs in client paths are URL encoded where needed. Timestamps are ISO 8601 UTC; UI shows Asia/Singapore absolute dates plus relative age. Date-only due dates use `YYYY-MM-DD`. Coordinates are local schematic metres, not latitude/longitude. Missing values are `null` or absent, never zero as a stand-in. `synthetic?: true` is optional legacy mock metadata; API records do not need it.

Successful non-record writes return `{"ok":true}`. Fault creation/status return the saved `Fault`. Use 200 for updates and 200/201 with JSON for creation; do not send an empty 204 response. Proposed production error shape, already understood by the client:

```json
{"error":{"code":"VALIDATION_ERROR","message":"Complete the baseline first.","fields":{"phase":"Baseline required"}}}
```

Use 400 malformed request, 401 unauthenticated, 403 forbidden, 404 missing record, 409 conflicting state, 422 invalid field/gate, 500 unexpected failure. Only `error.message` is currently displayed; `code` and `fields` are for server diagnostics/future field errors. The in-process mock throws `Error(message)` instead of HTTP statuses. Validate all IDs, finite numeric bounds, enums, transitions and permissions on the server; TypeScript is not wire validation.

## Read endpoints

Every response shape below has a JSON example in `contract-examples.v3.json`; `GET /fault-rules/:id` uses `RULE-INLET-DEBRIS-001` there. Other representative IDs are S1, S1-INLET and B-01. Shapes with `[]` are unpaginated arrays.

| Method and path | Query parameters | Response / behavior |
| --- | --- | --- |
| GET `/config` | None | `Config`; contractVersion `4.0.0`, thresholds and observation horizon |
| GET `/zones` | None | `Zone[]`: id, name, peakMmPerHr, housesHoldingWater6h, housesTotal |
| GET `/houses` | Optional `zone` in mock | `House[]`: 24 pilot records, fixed x/y, drainId, zone, nearestFeature, ownerOfRecord, lastReadingAt, holdsWater6h |
| GET `/features` | None | `Feature[]`: six feature records |
| GET `/features/:id` | None | `FeatureDetail`: feature plus parts, ownerOfRecord, installedAt; pilot house drain IDs also resolve |
| GET `/sensors` | Optional `ownerId`, `zone`, `partId`, `status` | `Sensor[]`, filters ANDed; part matches primary/linked parts |
| GET `/sensors/:id` | None | `Sensor`: latest value/text, trust, calibration, local/site position and usedByRules |
| GET `/sensors/:id/readings` | None | Reading history array. Numeric points have t, metric, value, unit, sensorId and optional n. No numeric history for text-only manual inputs. Mock returns its actual stored series or a single current numeric reading |
| GET `/faults` | Optional `status`, `from`, `to` | `Fault[]`. **All unresolved carry-over faults**, plus closed faults opened within the inclusive date window. Status filter ANDs this set. Thus current open counts stay correct even when a fault predates Last storm. `inspected` remains unresolved. With no window, all records |
| GET `/fault-rules` | None | `FaultRule[]`, typed registry |
| GET `/fault-rules/:id` | None | One `FaultRule` |
| GET `/rainfall` | `from`, `to`, `step=10m` | `RainPoint[]`: t, mmPerHr, cumulativeMm, sorted ascending, inclusive range. Mock has 10-minute points and ignores other step values; production must supply this cadence or reject unsupported steps |
| GET `/rainfall/zones` | `from`, `to` | `ZoneRain[]`: zone, t, mmPerHr, totalMm, peakMmPerHr. Time series per zone; latest point at/before playback time drives drawing |
| GET `/readings` | Required `featureId`; optional `metric`, `from`, `to` | `Reading[]`, inclusive range, chronological order; supported field metrics below |
| GET `/trials` | None | Five `TrialDetail[]`, including tests and safety checks |
| GET `/trials/:id` | None | Trial by feature ID, e.g. S1 or T1 |
| GET `/batches` | None | `BatchDetail[]`, latest checks/readings, computed prompts, maturity reason and history |
| GET `/batches/:id` | None | One `BatchDetail` |
| GET `/batch-parts/:id` | None | `Part[]` for the compost assembly |

`GET /rainfall/grid` is **not implemented or requested by this client**; the brief made it optional. The drawing uses zone samples instead.

All list search, multi-select filters, sorting, 10/20/25-row pagination (10 by default), density and CSV are currently client-side. Tables have no row-selection checkboxes; CSV follows the filtered/sorted visible columns. Column visibility is local preference. Return the complete authorized collection; do not silently server-paginate. A future pagination envelope needs a coordinated contract/client update. Timestamp filtering belongs to the server. Lists must not leak unauthorized assets.

## Write endpoints and JSON requests

### Faults

`POST /faults/:id/status` → saved Fault, including appended history. Open, inspected, closed and reopening closed → open are supported. Optional note; actor and timestamp must be server owned in production.

```json
{"status":"inspected","note":"Checked sediment sock from the surface.","user":"Operator A"}
```

`POST /faults` → saved Fault with sequential F-001-style ID, `raisedBy: "manual"`, `ruleId: "MANUAL"`, note as diagnosingInput, zone from asset, audit entry. The current report form supports the six modeled drainage features; house/bay manual reporting is not exposed.

```json
{"featureId":"S1","partId":"inlet","type":"blockage","severity":3,"note":"Debris at inlet.","user":"Operator A"}
```

`POST /faults/:id/actions` → `{"ok":true}`; compatibility action used by selected-part buttons. `inspected` and `work_order` set inspected; `cleaned` closes. Appends fault history and legacy action record. A work-order entry is a log, not an external ticket integration.

```json
{"action":"cleaned"}
```

### Trial tests and safety

`POST /trials/:id/tests` → `{"ok":true}`; appends a dated re-test, refreshes field reading series and safety drain-down flag, records trial audit. Baseline points can be corrected while incomplete; a completed baseline is locked. Require valid existing marked point, positive integer repeats 1–20, finite nonnegative value ≤1000; baseline must be infiltration and requires soil texture. Re-test requires completed baseline. Repeats do not inflate the fixed baseline sample count. Each save is a new observation time, not a claim of a new independent site.

```json
{"phase":"retest","metric":"infiltration_mm_hr","value":23.4,"pointId":"S1-P1","n":2,"soilTexture":"Clay loam"}
```

`POST /trials/:id/checks` → `{"ok":true}`; saves full checklist snapshot and trial audit. Legacy `/trials/:id/guardrails` is an alias. Nutrient pass/fail requires an outlet sample; completed post-storm results require both washout and clogging checks. drainDownFlag is derived from tests rather than trusted from this body.

```json
{"nutrientExport":"not_tested","noOpenDrainContact":true,"postStormCheck":"pending","washoutChecked":false,"cloggingChecked":false,"drainDownFlag":false}
```

Optional `outletSample`: `{"t":"2026-10-15T02:00:00.000Z","value":1.2,"unit":"mg/L"}`. Optional `postStormPhoto` is an image URL/data URL in local mode; the server must supply approved upload/storage limits. The UI does not infer nutrient pass/fail from that number.

### Batch readings, checks and allocation

`POST /batches/:id/readings` → `{"ok":true}`; appends wall-clock reading and its computed prompt snapshot. Temperature and moisture must be finite, 0–100. Optional photoUrl.

```json
{"tempC":47,"moisturePct":68,"photoUrl":"https://example.invalid/inspection.jpg"}
```

`POST /batches/:id/checks` → `{"ok":true}`; validates the complete checklist, appends time/user/check snapshot, recomputes maturity. Sump 0–200 cm; ambient 0–60°C; all checklist booleans required. Optional photoUrl.

```json
{"ambientTempC":30,"ambientReached":false,"didNotReheat":false,"manualMaturity":false,"intakeChecked":true,"plasticsFound":false,"glassFound":false,"bayCovered":true,"sumpChecked":true,"rainExpected":false,"squeeze":"ok","smell":"normal","sumpLevelCm":4,"puddles":false,"pests":false}
```

`POST /batches/:id/allocate` → `{"ok":true}`; records batch lineage, dose, mixing depth, actor/date and audit on the trial; marks batch released. Requires passed maturity, complete baseline, compost arm, configured dose within cap, no open-drain contact and appliedBy. Optional mixing depth is >0 and ≤1 m; UI always supplies it. **Dose never sets hydraulic conductivity**. A production service must also implement inventory, quantities and duplicate allocation policy; the local mock does not deduct volume.

```json
{"featureId":"S1","doseLabel":"Pilot dose B","lPerM2":15,"amendedDepthM":0.15,"appliedBy":"Trial crew"}
```

Legacy `POST /batches` with `{}` → `{"ok":true}` remains for the unmounted old walkthrough; it creates fixed B-DEMO and is not an operational creation API. Do not expose it in production. There is no batch creation form in this round.

## Enums, identities and rules

| Field | Values |
| --- | --- |
| Zone | A, B, C, D |
| Feature kind | swale, tree_pit, inlet |
| Treatment arm | control, decompaction, compost; null for non-trial inlet |
| Part status | ok, watch, fault, offline |
| Sensor status / role / drift | ok, suspect, offline / proxy, reference / none, possible, confirmed |
| Sensor scope | drainage, compost, site |
| Field metric | infiltration_mm_hr, drain_down_h, sediment_mm, water_level_cm; test form accepts first three |
| Phase | baseline, retest |
| Fault status / severity | open, inspected, closed / 1 Low, 2 Medium, 3 High |
| Fault type | blockage, sediment, sensor_offline, sensor_suspect, standing_water, scour, mulch_loss, sparse_planting, joint_leak, missing_cap, not_heating, putrid_smell, ammonia_smell, too_wet, pests, leachate |
| Batch status / gate | active, curing, matured, released, rejected / blocked, passed |
| Squeeze / smell | dry, ok, wet / normal, ammonia, putrid, sour |
| Safety | nutrientExport: not_tested, pass, fail; postStormCheck: pending, ok, issue |
| Input kind | food_bokashi, trimmings |
| Compatibility fault action | inspected, cleaned, work_order |

Drain part IDs: inlet, energy, pretreat, sock, checkdam, ponding, mulch, planting, media, transition, drainage, underdrain, cleanout, liner, overflow, outfall. Bay part IDs: intake, bay, bulking, cover, base, sump, curing, weather. `Sensor.type`, sensor-history metric and human description are open strings. Stable IDs remain visible where they identify real records; internal enums use `displayName` in the UI.

Fault rules have `id`, `title`, `appliesTo: PartId[]`, `diagnosingInputs: string[]`, `sensorTypes: string[]`, `triggerCondition`, `thresholdKeys: string[]`, `severity`, `steps: string[]`, `source`, `version`, plus compatibility `label`, `check`, `diagnosingInput`, `scope`. Examples include RULE-INLET-DEBRIS-001. Mock registry derives from modelCatalog + linked sensor registrations, not arbitrary UI text. Store production registry as versioned immutable rule definitions and fault events with the applied version/input snapshot; the current Fault stores ruleId and sensor-status-at-alert, but not rule version yet. Retain `ruleKey` for legacy migration. Sensor `usedByRules` may contain legacy rule keys; migrate them to canonical IDs on the server. The client supports both.

Rule-sourced fault creation/evaluation, sequential ID allocation, deduplication and immutable audit are **server responsibilities in production**. Mock refresh generates inspection alerts, retaining existing records/status; a closed matching condition is not automatically reopened. Explicit reopen is available. SIM-* capacity alerts exist only in the feature visualization and cannot be saved through part actions.

Audit shape: `{"id":"uuid","t":"2026-10-15T02:00:00.000Z","user":"Operator A","action":"Open → Inspected","note":"Checked inlet"}`. Fault status/manual reports, trial tests/checks/allocation and batch checks append record histories. Batch readings preserve t and prompts; no authenticated reader identity exists in this local shape yet. UI saves also append page-local activity and show a dated toast; these are convenience feedback, not a replacement for server audit. Local default actor is “Local operator”; allocation uses appliedBy. A production backend must stamp every write with authenticated actor, receivedAt and immutable event ID, including readings and legacy actions.

## Configuration and current status

None of these numerical defaults have been confirmed against field calibration or signed off by a practitioner. **All are provisional placeholders**. They are plainly labelled targets in the operator UI; status lives here and in model docs. Contract/schema versions are software values, not engineering validation.

| Keys | Current value | Status / meaning |
| --- | --- | --- |
| contractVersion, dataThrough | 4.0.0; seeded observation horizon | Software version; fixed mock observation horizon, not a live station timestamp |
| doseCapLPerM2 | 25 | Provisional guardrail, not application target |
| pilotDoses | A 10, B 15, C 20 L/m² | Provisional labelled trial doses |
| drainDownLimitH | 6 | Provisional comparison target |
| minTests / legacy minimumN | 12 / 12 | Provisional minimum re-test record count, not proof of independence/statistical power |
| heavyRainMmHr | 50 | Provisional heavy-rain prompt |
| temperature.goodMin / goodMax / days | 55 / 65°C / 3 d | Provisional recorded-band prompt; observations do not prove continuous pathogen treatment |
| temperature.turnBelow / coolAbove | 50 / 77°C | Provisional action thresholds |
| temperature.ambientToleranceC | 2°C | Provisional manual maturity comparison |
| moisture.min / max | 40 / 60% | Provisional proxy thresholds; sensor calibration required |
| inspection.standingWaterH / compostNotHeatingC / sumpWatchCm | 48 h / 40°C / 20 cm | Provisional inspection triggers, distinct from six-hour drain-down target |
| schematic length / width / media / transition / drainage / mulch / ponding / pipe | 4.9 / 3.55 / 0.55 / 0.15 / 0.3 / 0.1 / 0.25 / 0.15 m | Legacy schematic defaults, not drawings or a surveyed design |
| placeholderLabel / schematic.label | Metadata strings | Compatibility/source documentation; never printed next to operator thresholds |

The physics engine's separate typed parameter register is [PHYSICS_PARAMETERS.md](PHYSICS_PARAMETERS.md). `/config.schematic` still serves legacy part geometry; drainage physics uses `PhysicsConfig` in the client and Model details, so these are not automatically interchangeable configuration sources.

## Screen and computation ownership

| Screen | Reads | Writes |
| --- | --- | --- |
| Overview / map / house drawer | /config, /zones, /houses, /features, /faults?from&to, /rainfall?from&to&step, /rainfall/zones?from&to, /sensors, /readings?featureId&metric&from&to, /features/:drainId | No record writes; view preferences and playback are client state |
| Faults / rule drawer | /faults, /fault-rules, /features | /faults, /faults/:id/status |
| Trials | /config, /trials, /batches, /features | /trials/:id/tests, /trials/:id/checks, /batches/:id/allocate |
| Batches / bay | /config, /batches, /batch-parts/:id, /sensors, /faults | /batches/:id/readings, /batches/:id/checks, /faults/:id/actions from part panel |
| Sensors / sensor drawer | /sensors, /sensors/:id, /sensors/:id/readings, /fault-rules | None; calibration editing is not implemented |
| Feature | /config, /features/:id, /sensors, /faults, /fault-rules, /trials | /faults/:id/actions; storm/model edits are local scenario state |
| About | /config to resolve selected source | None |
| Global simulation driver | /trials | No record writes |

**Server responsibility in production:** ingest and quality-check readings, compute aggregates and n, record rainfall times/cadence/cumulative totals, authoritative batch prompts/gates and fault evaluation, due dates, allocation rules, actor/audit, durable histories. Mock currently invents rainfall and zone scaling, proxy readings, faults, tests, owners, doses, checks and schedules. It is not a real sensor feed.

**Client computation:** rainfall interpolation (inverse-distance between API zone points, extent coverage only, no sine noise), range/zone filtering of displayed records, chart presentation, table state, shared playback and deterministic scenario worker. The selected history window is mapped across the shared playback duration; historical weather and entered scenario hyetograph are separate inputs, not asserted identical. Radar palette and cyan water were retained by the user's colour exception.

**Client scenario model:** shared rainfall/runoff/network, surface and pipe storage, Richards media/transition/gravel/native field, discharge and overflow. SI units internally; display L/min, mm/h, mm, %. Soil shading/contour comes from the cached saturation field. Pipe fill comes from stored circular-segment volume, not a longitudinal dynamic-wave profile. Inlet/forebay/sock share one upstream path level; they are not separately routed chambers. Water streak speed and effect density follow engine discharge. Pink amendment depth/dose comes from allocation. Conductivity follows the latest field test mean/n unless manually overridden, never dose. Feature virtual readings are not written into sensor records. The Sensors register shows saved API readings; manual observations are never replaced by model values. See [PHYSICS_MODEL.md](PHYSICS_MODEL.md) for equations and limits.

## Mock persistence and migration

Deterministic seed 2026 supplies values; newly generated observation dates, sensor times, rainfall and dataThrough anchor to app load time. The historical reference 12 Oct 2026 09:40 Singapore is a seed construction reference, not the current observation clock. Persisted writes and actual audit/check histories retain their saved timestamps. New user writes/audits use wall clock; next re-test is seven days after a new test. Client due status uses the earlier of the recorded due day and latest test plus seven days, compared as a Singapore calendar day. Mock zone rainfall scales a common ten-minute storm by zone peaks 52/68/34/18 relative to 63 mm/h. Pilot assignments, owners and trial outcomes are invented; OSM buildings supply context geometry only.

Browser storage key `drain-trial-console-v1` holds schema version 2. Migration preserves tests, checks, allocations, trust and calibration while refreshing fixed map coordinates, filling missing checklist fields, normalizing fault IDs/rule IDs, adding histories and setting contract version 4.0.0. Old Batches with missing prompt snapshots are backfilled once using available current checks; these are not genuine historical check snapshots. New readings store their prompt snapshot at save time. Existing allocations without a mixing depth display “not recorded” until an operator records one. The static default S1 allocation includes 150 mm depth.

Reload retains saved mock data; source switching does not upload or merge it into an API. Corrupt/incompatible storage starts a seed; unavailable/full storage leaves the in-memory mock usable but cannot guarantee reload persistence. No multi-user synchronization, concurrency control, durable photo service or production audit security exists in local mode. Back up required records before clearing browser data. Reset helpers are test utilities, not operational reset controls.

## Contract changes

See [CONTRACT_CHANGELOG.md](CONTRACT_CHANGELOG.md). Version 3 adds sensor detail/history, fault registry/status/manual reporting, dated audits, range-driven zone rainfall, trial checks alias, compost check history/prompt snapshots, minTests/dataThrough and recorded amendment depth. Existing response arrays and legacy compatibility fields remain. Future authenticated write identities, rule-version snapshots, batch inventory and server pagination require coordinated changes rather than inferred support.
