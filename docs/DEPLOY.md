# Local backend and optional deployment

## Required local path

Use Node **20.12 or newer** (Node 22 LTS is the Docker example). From the repository root, install once:

```sh
npm ci
npm --prefix app ci
npm run dev:all
```

Use the same Node installation when installing dependencies and starting the app. If startup reports that `better_sqlite3.node` was compiled against a different `NODE_MODULE_VERSION`, stop the launcher and run `npm rebuild better-sqlite3` from the repository root in the same terminal, then start `npm run dev:all` again. The rebuild replaces the native dependency for that terminal's Node version; it does not reset the database or environment settings.

`dev:all` builds the server, creates local configuration if absent, starts the API, seeds an **empty** SQLite database, and starts Vite with an API proxy. Existing records are preserved. The terminal prints the app URL. Default ports are 8080 and 5173; occupied ports are skipped. `PORT` and `APP_PORT` choose starting ports. The current app uses `http://127.0.0.1:5174` because another preview occupies 5173.

The demonstration opens directly with no name, login, token or account. Application reads, writes and evidence photos are public to anyone who can reach the server. Audit entries use **Demo visitor**, not a verified identity. Use Ctrl+C in the launcher terminal to stop both processes. Restart `dev:all` after server/shared-code edits; Vite handles frontend edits.

The seed contains illustrative records and no connected hardware. SQLite lives at `data/drain.sqlite` unless `DB_PATH` is set. The database and local environment file are ignored by Git. `npm run seed` fills an empty database, adds missing sourced reference cases/guidance, and applies idempotent record upgrades. Old illustrative trial results are retained in an example archive; entered tests and other records are preserved. It never resets the database.

## Checks and built app

```sh
npm run check:server
npm run test:server
npm --prefix app test
npm run build:all
npm run start:server
```

`build:all` bundles the app with `/api/v1`, then bundles the server/worker/seed entry points. `start:server` serves the API and built React app on the same origin. Open its printed server URL. The local development launcher serves React separately through Vite, through a proxy to the API.

Application `/api/v1` routes and `/health` require no authentication headers. The device ingest webhook still uses its separate `X-Ingest-Key` to distinguish simulated and physical integrations; this is not a visitor login. Photo uploads allow up to 5 MB decoded images; ordinary JSON is capped at 128 KiB. CORS, validation, rate limits and lifecycle gates remain. See `BACKEND_HANDOFF.md`.

## Environment

| Variable | Required / default | Meaning |
|---|---|---|

| `DB_PATH` | `data/drain.sqlite` | SQLite file, including WAL sidecar files in its directory. |
| `PORT` | 8080 | API port; `dev:all` skips occupied ports. |
| `APP_PORT` | 5173 | Vite port; launcher-only. |
| `HOST` | `127.0.0.1` | API bind address; container template uses `0.0.0.0`. |
| `SEED_DEMO` | `0`; launcher sets `1` | Seed only if the database has no application state. |
| `CORS_ORIGIN` | Empty | Comma-separated exact allowed origins. Same-origin works without it. Launcher adds its own Vite origin. |
| `LLM_PROVIDER` | `none` | `none`, `anthropic`, `openai-compatible`. None/missing key/model gives deterministic matching. |
| `LLM_API_KEY` | Unset | Optional provider credential, server-only. Never a Vite variable. |
| `LLM_MODEL` | Unset | Provider model name; no model is hard-coded. |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | HTTPS base URL for a compatible provider; server-only. |
| `LORAWAN_INGEST_SECRET` | Unset | Distinct real network integration key, at least 24 characters. |
| `LORAWAN_SIM_SECRET` | Launcher generates if absent | Separate simulator key, at least 24 characters; fixes source provenance. |
| `VITE_API_BASE` | Unset in standalone app; launcher/build use `/api/v1` | Public API address. Unset keeps the local mock working. |
| `VITE_DATA_SOURCE` | Unset | `mock` explicitly selects the mock. |
| `VITE_SHOW_DATA_NOTICE` | Unset | Existing About-page notice preference. |
| `DEV_API_TARGET` | Set by launcher | Vite proxy target; not bundled into React. |

## Optional hosting preparation

No cloud deployment is required or performed in Stage A, following the user's local-first instruction. `Dockerfile`, `.dockerignore` and `render.yaml` are preparation only; the Docker image has not been built on this Windows machine.

For Docker: build from the repository root, mount a persistent directory at `/var/data`, and expose the configured port. Set `SEED_DEMO=1` to create an illustrative demo only when empty. The image runs as the Node user; the mounted directory must be writable by that user. The image builds frontend assets and serves them from the Node process.

For Render: connect the repository and this branch as a Docker web service using `render.yaml`; review any paid plan/disk cost before creating a service. Keep `DB_PATH=/var/data/drain.sqlite`, mount a persistent disk at `/var/data`, and use `/health`. `LLM_*` can remain unset/none in Stage A. For an empty persistent database, the container seed command is `node server/dist/seed.js`. Existing records are preserved.

An ephemeral filesystem loses SQLite data on redeploy. Back up the complete SQLite database consistently, including WAL handling; do not copy only a live main file while writes continue. The single-file database path supports one server process/instance, not replicas sharing a disk. A Render service with a disk has deployment/scaling restrictions. See [Render's disk documentation](https://render.com/docs/disks) and [Blueprint reference](https://render.com/docs/blueprint-spec) before enabling hosting.

## Provider and device demonstration

Set `LLM_PROVIDER`, `LLM_API_KEY` and `LLM_MODEL` in ignored `server/.env` (or the existing root `.env.local`), then restart. Both provider envelopes are checked with mocks; a live paid provider call is not verified. Twenty-five-second timeouts and one retry fall back to sourced matching. Prompt rules/version live in `server/ai/prompts/diagnosis.system.md`.

Run `npm run sim:device` after `dev:all`. It registers a fresh R1 node and sends a backdated ramp plus fault cases. Set `SIM_API_BASE` if the API port differs from 8080. Real TTN/ChirpStack installations need their own integration credential and commissioned device; no hardware is assumed. See `docs/iot/` for payload, electrical design and unverified conditions.

## Repeatable demonstration

Stop the local launcher, run `npm run demo:reset`, restart `npm run dev:all`, and reload the app. Reset backs up the current SQLite database and creates fresh illustrative records; it preserves uploaded files. It refuses to run while a local API is detected on the configured port range. Close other development servers first. Run a new storm to replace an old tab's saved run. Use `npm run demo:reset -- --self-test` to check the reset tool with an isolated temporary fixture. See `VIDEO_RUNBOOK.md` and `AI_LIVE_CHECK.md`.
