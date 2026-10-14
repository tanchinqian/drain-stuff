# Drain Trial Console

A local React operator console for a synthetic drainage and compost pilot. The existing Map desk interface includes selectable site houses, sixteen drainage parts, eight compost parts, a sensor register, fault provenance and guarded trial records.

## Run in PowerShell

Install a supported Node.js runtime with npm, then open PowerShell in this project folder:

```powershell
cd app
npm.cmd ci
npm.cmd run dev
```

`npm.cmd ci` is the fresh setup step. Open [Overview](http://127.0.0.1:5173/), [Sensors](http://127.0.0.1:5173/sensors), [S1 drainage model](http://127.0.0.1:5173/feature/S1) or [B-01 compost model](http://127.0.0.1:5173/batches/B-01). The default server binds to this computer only.

## Play a feature storm

Open [S1](http://127.0.0.1:5173/feature/S1), or replace S1 in `/feature/S1` with S2, S3, I1, T1 or T2. Select **Play storm** directly beneath the model. Pause, scrub the timeline, step by minute or reset; all six feature pages share the same clock. Changing model inputs recalculates the runs and resets playback. With reduced motion enabled, use the timeline and minute buttons.

Expand **Storm settings, charts and model parameters** for peak rain, duration, rain pattern, scenarios, tailwater and conductivity. The section includes response charts with tables, water balance, **Export run CSV**, and a searchable **How this is calculated · parameters and sources** table. Parameter edits apply when leaving the field. **2D section** provides a live flat alternative; **3D water depth x5** changes only the display and is off by default.

The feature geometry, water and eligible sensor readings now follow the same reduced-order run. S1/S2/S3 start with equal conductivity and weather; other parameter edits or scenario overrides can make the comparison unequal. Loading a trial re-test explicitly loads a **seeded synthetic** value, not a field calibration or treatment finding. Neighbourhood/Plan and compost views retain their earlier implementation. See [current equations and limits](docs/PHYSICS_MODEL.md); [STORM_SIMULATION.md](docs/STORM_SIMULATION.md) describes the earlier preview.

## Data and API

Without `VITE_API_BASE`, the app uses deterministic synthetic data. Its fixed clock is **12 October 2026, 09:40 Asia/Singapore** (`2026-10-12T01:40:00.000Z`), so age, due dates and new mock records do not advance with wall time. Records persist in this browser's local storage under `drain-trial-console-v1`; the current stored data version is 2. A browser with unavailable storage can still use the in-memory mock.

`VITE_API_BASE` selects an HTTP backend instead of the mock. Leave it unset for the browser-local demo. A future backend supplies its API origin/base prefix; set it before starting Vite. The client appends paths such as `/config`, `/sensors`, `/fault-rules` and `/batch-parts/:id` directly to that base. The backend must implement contract **2.0.0**, defined in `app/src/api/types.ts`, with endpoint functions in `app/src/api/client.ts`, sensor filters, part catalogs, trust snapshots and the existing POST allocation gates. There is no bundled backend. The interface retains its synthetic data labels; real deployment requires reviewed labeling and validated configuration.

## Checks

From `app/`:

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
```

The browser checks need a Playwright Chromium installation. If a compatible Chromium is already installed, set `$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path; otherwise install Playwright's browser with `npx.cmd playwright install chromium`. Playwright starts or reuses the local development server and writes refreshed captures to `docs/screens/`.

The browser checks cover the operator flow and allocation gates, every sensor row/site marker, register filters, sixteen/eight model parts and compost fault inputs. They also run axe WCAG A/AA checks on Overview, Detail, Compost, Sensors and Faults and check document overflow at 360px. The wheel-zoom regression checks the household, drainage and compost models at 1440px and 360px, including repeated scrolling to both zoom limits and Reset view. These automated checks do not establish complete accessibility or field validity. The stage record in `docs/ADDENDUM_STAGES.md` records the executed results and review scope.

## Limits and project records

The Overview uses an offline public map extract for 589 house footprints and 111 road ways in the Gamelan / Rodat housing window of Bandar Bukit Raja Phase 1. All 24 pilot assignments, readings, faults, trials and batches remain synthetic. Roof shapes, heights and drainage locations are illustrative. The map covers a window of Phase 1, not the full phase boundary or a complete building inventory. See [map sources and model limits](docs/MAP_MODEL.md).

S1/S2/S3 have large clickable pins and direct trial links. Mapped houses can be selected and moved locally; context houses have no invented pilot readings. Rainfall is a static, irregular radar-coloured cloud field with adjustable opacity in 3D and the same raster in desktop Plan. It interpolates synthetic zone values; it is not live radar or a forecast. Reset layout restores mapped placement. Map data is © OpenStreetMap contributors under ODbL 1.0; attribution is visible beside the map.

Models are schematics; layer dimensions and thresholds require confirmation against MSMA and the local authority. Soil moisture is an indirect infiltration proxy; inexpensive compost moisture is relative and needs a human reference check. Manual infiltration tests, squeeze/smell logs and photo checklists remain human records. No hardware calibration, surveyed geometry, treatment proof or Lighthouse score is claimed.

`PRODUCT.md` holds accepted scope. `DESIGN.md` and `.impeccable/design.json` record the incumbent system. `docs/addendum-review.md` records the independent finish review. The separately published Sites visualization is an exact uploaded attachment with its own source and hosting identity.

## Review round 1

Overview leads with faults; Detail opens on the part model; compost bays have Model, Readings and Checks tabs. Advanced model controls are in Debug. Repair prompts remain drafts. Current radar and cyan water colours are intentionally preserved at the user's request. See [the local fix-round record](docs/fix-round-1.md).
## Physics integration checkpoint

Stage B/B2 connects six feature models to a shared worker and timeline, config-derived geometry, live sensor overlays, temporary capacity alerts, charts and CSV. The thermal engine exists but compost UI integration and neighbourhood routing remain later work. [Equations and limits](docs/PHYSICS_MODEL.md), [parameter sources](docs/PHYSICS_PARAMETERS.md), [216-input inventory](docs/PHYSICS_SENSORS.md), and [implementation status and verification](docs/fix-round-2.md) document the boundary. Defaults are uncalibrated placeholders. Radar and cyan water colours are preserved; changes remain local with no push. Independent review cleared the four requested visual fixes; this is not completion of later physics stages.
