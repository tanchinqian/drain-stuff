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

## Try a storm at S1

Open [S1](http://127.0.0.1:5173/feature/S1) and use **Try a storm at S1** above the detailed drainage assembly. Set rain intensity (0–120 mm/h), duration (5–120 minutes) and outlet blockage (0–100%), then select **Play storm** or scrub the timeline. Playback includes 180 minutes after rain; pause, reset and replay are available. Changing a setting resets the scenario. **Inspect drainage parts** jumps to the existing assembly below.

The scene follows runoff from houses through the inlet, soil layers and outlet. Numerical flows, surface ponding and cumulative overflow accompany the cyan water. This is an illustrative storage model with exaggerated visible depth, independent of sensor readings and trial records. See [storm assumptions, controls and evidence](docs/STORM_SIMULATION.md).

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
