# Drain Trial Console — local demonstration

From this folder, run `npm ci`, `npm --prefix app ci`, then **`npm run dev:all`**. It starts the local API and React app and seeds an empty SQLite database. The demonstration opens directly without a login or token. Anyone who can reach the server can read and change demo records; audit entries use “Demo visitor”. The terminal prints the app URL. Existing database records are preserved. Node 20.12+ is required.

Round 9 adds realistic drainage-scene materials, storm effects, camera/Record presets and a shared cross-section slider. See [requirement status and limits](docs/ROUND9_REALISM.md), [captures and storm GIFs](docs/screens/round9/README.md) and [procedural asset provenance](docs/ASSETS.md).

```sh
npm ci
npm --prefix app ci
npm run dev:all
```

Stop the launcher before `npm run demo:reset` to restore the illustrative seed (a timestamped database backup is retained). Restart and reload the app, then run a fresh storm. See [five-minute video runbook](docs/VIDEO_RUNBOOK.md), [Round 8B checks](docs/ROUND8B_CLEANUP.md) and [user-run live AI check](docs/AI_LIVE_CHECK.md). Model settings may be kept in ignored `server/.env`; existing root `.env.local` remains supported.

`npm run build:all` builds both; `npm run start:server` serves the built app/API together. Standalone `npm --prefix app run dev` still supports the original offline mock when no API base is configured.

Overview's Asset locations map includes the radar-coloured Rainfall toggle and opacity control in 3D and Plan. After a new storm calculation finishes, the saved rainfall curve plays at 60× by default (one simulated minute per second), and the map scrolls into view. Watch storm restarts it; playback controls sit beneath the map and share the clock with asset replay. Overview pauses at the end of rain; Play recovery continues drainage. The cloud follows simulated intensity uniformly across zones and clears after rain; it is not live radar. Observation history retains the dated rainfall layer. See [storm playback](docs/STORM_PLAYBACK.md).

See [local setup](docs/DEPLOY.md), [stage progress and checks](docs/ROUND8_PROGRESS.md), [contract 4.3.0](docs/BACKEND_HANDOFF.md), [AI evaluation](docs/AI_EVALUATION.md), and [honest limits](docs/LIMITS.md). Run storms from Overview; inspect a row to replay its saved 3D scenario. Faults provides verification and cited diagnosis. Register nodes on Sensors or run `npm run sim:device` for an explicitly simulated feed. The selected-part panel includes AI diagnosis for recorded findings. Local configuration can use OpenCode DeepSeek V4.1 Flash; model errors fall back to case matching and log the reason in the backend terminal. See [part diagnosis](docs/PART_AI_DIAGNOSIS.md).

---

# Drain Trial Console

A local React console for drainage and compost pilot operations. The cream/brown Archivo Map desk includes fixed pilot-house selection, six hydraulic feature models, trial and batch records, sensors, faults and audited local saves. Generated local records use the same client as an optional backend.

## Run in PowerShell

Install a supported Node.js runtime with npm, then open PowerShell in this project folder:

```powershell
cd app
npm.cmd ci
npm.cmd run dev
```

`npm.cmd ci` is the fresh setup step. Open [Overview](http://127.0.0.1:5173/), [Trials](http://127.0.0.1:5173/trials), [Sensors](http://127.0.0.1:5173/sensors), [S1](http://127.0.0.1:5173/feature/S1) or [B-01](http://127.0.0.1:5173/batches/B-01). The default server binds to this computer only.

## Current operator flow

Overview provides the calculated storm triage board, saved rainfall replay and ranked map. Observation history at `/observations` retains zone filters, dated rainfall and drain-down charts. Only the 24 pilot houses and six feature destinations are interactive; context houses provide geometry. Pilot-house records open in the shared detail drawer. Last storm, 7 days and 8 weeks drive history requests and chart titles. Radar colours remain approved; rainfall is interpolated from dated zone records, not live radar.

Registers share a compact search/filter toolbar, sortable columns, saved column visibility, 10/20/25-row pagination (10 by default), density and CSV export. Native filter/Columns menus open one at a time; IDs use plain monospace text and there are no row-selection checkboxes. Tables have panel-contained horizontal scrolling without internal vertical clipping. Long lists use a single combobox; fewer than eight options use a plain select or segmented controls. Technical terms use glossary popovers. Writes show the saved destination/time; collapsed record histories show the latest five distinct entries with Show all. Faults / Rules tabs organise the register; status changes in the status cell refresh Overview counts.

Trials compares recorded before/latest means at the same marked points across three treatment arms; each seeded arm shows three marked points and 24 re-tests. Effective due dates use the earlier of the recorded day and latest test plus seven days. S1/S2/S3/T1/T2 each has a record, readiness progress, safety checklist and baseline/re-test drawer. Batches and compost bays show reading/check histories and computed prompts with reasons; human squeeze/smell checks and maturity gates remain explicit. Sensors shows **saved API readings**, with installation positions, calibration/method checks, rules and history in its drawer. Eligible feature virtual readings remain scenario outputs and do not overwrite the register/history.

## Play a feature storm

Open `/feature/S1`, S2, S3, I1, T1 or T2. Playback beneath the model supports Play, pause, scrubbing, minute steps, reset and jump to peak water. All six share the clock. Input changes recalculate runs and reset playback. Reduced motion supports manual timeline/minute controls.

Round 6 uses a shared depression design and cached 48 × 32 mixed-form Richards moisture fields. Wet soil darkening follows saturation; jittered rain impacts the terrain/water, clear water follows engine depth, and pipe flow motion follows Q/A. Low quality and reduced motion are supported. Pages open at peak water; **Storm settings** is linked beside playback, and nonzero tailwater is explicit. Amendment depth/dose remains separate: conductivity uses trial-record/entered values, never compost allocation. See [Round 6 implementation and results](docs/ROUND6_WATER_REALISM.md).

**Model details** opens a non-modal drawer with six collapsed parameter groups (Rainfall, Catchment, Surface, Soil, Drain, Overflow), equations and a provenance footer. The expandable storm section contains scenario controls, charts/tables, water balance and **Export run CSV**. A live **2D section** is available. No water-depth exaggeration control is used in the current view. Uncalibrated scenarios are not treatment findings. The compost thermal engine is a foundation, not a fully integrated thermal UI.

## Data and API

Contract **4.1.0** is defined in `app/src/api/types.ts`, with transport in `app/src/api/client.ts`. Set `VITE_API_BASE` before starting/building Vite to prefer a backend; `VITE_DATA_SOURCE=mock` forces local mode. Startup probes `/config`; network, timeout or server failure falls back to mock for that page session. Authentication errors remain visible. Later read connection failures fall back with a visible notice; failed writes are never replayed into local storage.

`VITE_SHOW_DATA_NOTICE` controls one small notice on About; unset shows it only in mock mode. Operational screens have no persistent data badge. No backend, authenticated identity provider or real probe integration is bundled. Read [BACKEND_HANDOFF.md](docs/BACKEND_HANDOFF.md), [contract changelog](docs/CONTRACT_CHANGELOG.md) and [JSON examples](docs/contract-examples.v3.json) for endpoints, flags, errors, gates, audits and production responsibilities.

Mock values use deterministic seed 2026; newly generated observation dates and `dataThrough` anchor to app load time. Persisted user writes and actual histories retain saved timestamps. New writes/audits use wall-clock time; new tests schedule the next re-test seven days later. Overdue status uses today's Singapore calendar day. Storage key `drain-trial-console-v1` retains schema version 2 while the wire contract is 4.1.0; migration preserves records and refreshes fixed house placement. Unavailable storage allows in-memory use without reload persistence. Source switching does not upload local data.

## Checks and review

From `app/`:

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
```

Browser checks need Playwright Chromium. Use `$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE` for an installed browser, or install it with `npx.cmd playwright install chromium`. Playwright starts/reuses the local server and refreshes `docs/screens/`.

Completed Round 3 verification reported build/lint passed, **50 unit tests in 9 files**, all **23 browser checks**, then all **8 targeted Round 3 checks** after the final assertion/guidance capture update. Coverage includes axe on eight pages at 1440/1920/360px, zoom for three models at two sizes, record changes and shared worker/clock/water behavior. Independent finish verdict: **SHIP for two scored fixes**, following 24 refreshed captures and expanded guidance evidence; this is not a fresh whole-app audit. The Impeccable launcher failed with `cache_directory_failed`; the detector did not run. See [Round 3 review](docs/round3-review.md).

## Limits and project records

The offline map contains 589 house footprints and 111 road ways in the Phase 1 Gamelan / Rodat window, not a complete phase inventory. Pilot assignments, records, heights and drainage locations require field confirmation. Map data is © OpenStreetMap contributors under ODbL 1.0. See [MAP_MODEL.md](docs/MAP_MODEL.md).

Models are schematics with provisional coefficients/thresholds requiring local confirmation. Moisture proxies need reference checks; human tests/checks remain necessary. No survey, hardware calibration, actual backend compatibility, flood-reduction percentage, universal compost efficacy or Lighthouse score is claimed. The optional rainfall-grid endpoint is not implemented; zone time series drive the layer.

[PRODUCT.md](PRODUCT.md) records accepted scope; [DESIGN.md](DESIGN.md) and `.impeccable/design.json` record the system. [PHYSICS_MODEL.md](docs/PHYSICS_MODEL.md), [PHYSICS_PARAMETERS.md](docs/PHYSICS_PARAMETERS.md) and [PHYSICS_SENSORS.md](docs/PHYSICS_SENSORS.md) describe equations, coefficients and input boundaries. [ADDENDUM_STAGES.md](docs/ADDENDUM_STAGES.md) preserves earlier stages as history. User-approved radar and cyan water colours remain; changes are local with no push. The current React app is published through a separate Sites source/hosting identity; see docs/ROUND6_WATER_REALISM.md.
