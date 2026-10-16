# Local backend and optional deployment

## Required local path

Use Node **20.12 or newer** (Node 22 LTS is the Docker example). From the repository root, install once:

```sh
npm ci
npm --prefix app ci
npm run dev:all
```

`dev:all` builds the server, creates `.env.local` with a random operator token if the file does not exist, starts the API, seeds an **empty** SQLite database, waits for its health endpoint, and starts Vite with an API proxy. Existing database records are preserved. The terminal prints the app URL, never the token. Default ports are 8080 and 5173; occupied ports are skipped. `PORT` and `APP_PORT` choose starting ports. The verified local app is currently at `http://127.0.0.1:5174` because another preview occupies 5173.

First connection: enter your name and copy `OPERATOR_TOKEN` from the root `.env.local` into the password field. It stays in this tab's session storage. The server audits the entered name; the shared token does **not** independently verify a person's identity. Do not put this token in a `VITE_*` variable. Use Ctrl+C in the launcher terminal to stop both processes. Restart `dev:all` after server/shared-code edits; Vite handles frontend edits.

The seed contains illustrative records and no connected hardware. SQLite lives at `data/drain.sqlite` unless `DB_PATH` is set. The database and local environment file are ignored by Git. `npm run seed` fills an empty database and is a no-op when records already exist. It never resets or deletes existing records.

## Checks and built app

```sh
npm run check:server
npm run test:server
npm --prefix app test
npm run build:all
npm run start:server
```

`build:all` bundles the app with `/api/v1`, then bundles the server/worker/seed entry points. `start:server` serves the API and built React app on the same origin. Open its printed server URL. The local development launcher serves React separately through Vite, with an authenticated proxy to the API.

For API-only testing, `/health` is public; every `/api/v1` endpoint needs `Authorization: Bearer <operator token>`. Writes also need `X-Operator-Name`. No token is printed in examples or request logs. See `BACKEND_HANDOFF.md` for all paths.

## Environment

| Variable | Required / default | Meaning |
|---|---|---|
| `OPERATOR_TOKEN` | Required, at least 24 characters | One shared operator secret. `dev:all` generates a random one if `.env.local` is absent. |
| `DB_PATH` | `data/drain.sqlite` | SQLite file, including WAL sidecar files in its directory. |
| `PORT` | 8080 | API port; `dev:all` skips occupied ports. |
| `APP_PORT` | 5173 | Vite port; launcher-only. |
| `HOST` | `127.0.0.1` | API bind address; container template uses `0.0.0.0`. |
| `SEED_DEMO` | `0`; launcher sets `1` | Seed only if the database has no application state. |
| `CORS_ORIGIN` | Empty | Comma-separated exact allowed origins. Same-origin works without it. Launcher adds its own Vite origin. |
| `LLM_PROVIDER` | `none` | Reserved `none`, `anthropic`, `openai-compatible`. Stage A does not call an LLM. |
| `LLM_API_KEY` | Unset | Server-only, unused until Stage D. Never a Vite variable. |
| `LLM_MODEL` | Unset | Server-only provider model setting, implemented in Stage D. |
| `VITE_API_BASE` | Unset in standalone app; launcher/build use `/api/v1` | Public API address. Unset keeps the local mock working. |
| `VITE_DATA_SOURCE` | Unset | `mock` explicitly selects the mock. |
| `VITE_SHOW_DATA_NOTICE` | Unset | Existing About-page notice preference. |
| `DEV_API_TARGET` | Set by launcher | Vite proxy target; not bundled into React. |

## Optional hosting preparation

No cloud deployment is required or performed in Stage A, following the user's local-first instruction. `Dockerfile`, `.dockerignore` and `render.yaml` are preparation only; the Docker image has not been built on this Windows machine.

For Docker: build from the repository root, supply a new `OPERATOR_TOKEN` at runtime, mount a persistent directory at `/var/data`, and expose the configured port. Set `SEED_DEMO=1` to create an illustrative demo only when empty. The image runs as the Node user; the mounted directory must be writable by that user. The image builds frontend assets and serves them from the Node process.

For Render: connect the repository and this branch as a Docker web service using `render.yaml`; review any paid plan/disk cost before creating a service. Keep `DB_PATH=/var/data/drain.sqlite`, mount a persistent disk at `/var/data`, set an operator token, and use `/health`. `LLM_*` can remain unset/none in Stage A. For an empty persistent database, the container seed command is `node server/dist/seed.js`. Existing records are preserved.

An ephemeral filesystem loses SQLite data on redeploy. Back up the complete SQLite database consistently, including WAL handling; do not copy only a live main file while writes continue. The single-file database path supports one server process/instance, not replicas sharing a disk. A Render service with a disk has deployment/scaling restrictions. See [Render's disk documentation](https://render.com/docs/disks) and [Blueprint reference](https://render.com/docs/blueprint-spec) before enabling hosting.
