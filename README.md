# Saluran

Saluran is a local-first drainage and soil-treatment demonstration for Bandar Bukit Raja Phase 1. It brings rainfall context, storm scenarios, 3D drainage models, sensor records, faults, trials and maintenance actions into one console.

> **Demonstration data:** Seeded records and storm results are illustrative. The map is not a survey, the hydraulic model is not calibrated to a real drainage network, and AI suggestions are drafts for operator review.

## What you can explore

- **Overview:** Open-Meteo weather forecast, rainfall shading, interactive neighbourhood map and storm triage. The forecast and the operator-run storm scenario are separate views.
- **Storm replay:** Run a rainfall scenario, then play or scrub through the shared timeline in the overview and asset models. The 3D scenes show rain, surface water, soil moisture and drainage flows from the model outputs. A 2D cross-section and model parameters are available on feature pages.
- **Sensors:** Browse commissioned-device records and reading history. Seeded storm histories can be played or scrubbed; synthetic readings are labelled and are not live telemetry.
- **Faults and AI:** Review findings, evidence, work-order history and cited diagnosis drafts. The chatbot uses local Ollama with retrieved site records and guidance when the local backend is running.
- **Trials and materials:** Compare treatment records, infiltration tests, compost batches and maintenance checks.
- **Demo controls:** Open `/?demo=1` for the seeded walkthrough and keyboard shortcuts shown in the panel.

## Run the full local demonstration

Use Node.js **20.12 or newer**. From the repository root in PowerShell:

```powershell
npm ci
npm --prefix app ci
npm run dev:all
```

Open the URL printed in the terminal (usually `http://127.0.0.1:5173`; the launcher selects another nearby port if needed). `dev:all` starts the API and React app and seeds an empty local SQLite database. Existing records are preserved. Press **Ctrl+C** in that terminal to stop both services.

The app opens without a visitor login or token. The API binds to this computer by default. The database is stored at `data/drain.sqlite`; local environment files and database files are ignored by Git.

For a frontend-only mock without the API, run `npm --prefix app run dev` and open the URL it prints. That mode uses browser-local demonstration data; backend features such as Ollama chat are unavailable.

## Local AI setup

The fault chatbot uses **Ollama on the same computer as the backend**. Ollama is a separate app; `npm run dev:all` does not start it. Start Ollama, make sure a model is installed, then start or restart the project:

```powershell
ollama pull llama3.2:latest
npm run dev:all
```

The backend defaults to `http://127.0.0.1:11434` and `llama3.2:latest`. Override these in the ignored `server/.env` file with `OLLAMA_BASE_URL` and `OLLAMA_MODEL` if needed. The chatbot draws on local records and its case/guidance library; responses are advisory and cannot confirm faults or change work orders.

Part-level diagnosis can use a separate compatible model provider. For the OpenCode DeepSeek setup, add these values to `server/.env` and restart the backend:

```dotenv
LLM_PROVIDER=openai-compatible
LLM_MODEL=deepseek-v4.1-flash
LLM_BASE_URL=https://opencode.ai/inference/openai/v1
LLM_API_KEY=your_key_here
```

Keep API keys server-side; do not put them in `app/.env` or a `VITE_*` variable. The backend terminal reports the selected provider and any fallback reason. See [part-level AI diagnosis](docs/PART_AI_DIAGNOSIS.md) and [live AI check instructions](docs/AI_LIVE_CHECK.md).

## Build and checks

```powershell
npm run build:all
npm run test:all
npm run check:ai -- --self-test
```

`npm run check:ai` without `-- --self-test` contacts the configured live model and may use provider credits. Use it only when you want to verify the live connection. For a repeatable seeded walkthrough, stop the launcher, run `npm run demo:reset`, restart `npm run dev:all`, then reload the app. Reset backs up the current SQLite database before restoring the illustrative seed.

## Project notes

- Current API contract: **4.3.0**.
- The neighbourhood map is based on OpenStreetMap data for a limited part of Bandar Bukit Raja Phase 1; pilot houses, levels and drainage locations need field confirmation. See [map model and data notes](docs/MAP_MODEL.md).
- The 3D drainage scenes and storm calculations are schematic and uncalibrated. See [water physics](docs/PHYSICS_MODEL.md), [Round 9 realism results](docs/ROUND9C_RESULTS.md) and [known limits](docs/LIMITS.md).
- Sensor hardware is design-level and bench testing is pending. The device simulator is explicitly simulated; no field deployment is claimed. See [IoT design notes](docs/iot/DEPLOYMENT.md).
- The full local demonstration has no visitor authentication. Do not expose it to an untrusted network without adding appropriate access controls.

More setup and project history: [local deployment](docs/DEPLOY.md), [Round 8 progress](docs/ROUND8_PROGRESS.md), [Round 8B cleanup](docs/ROUND8B_CLEANUP.md), [Round 9 scene realism](docs/ROUND9_REALISM.md), and [Round 9C verification](docs/ROUND9C_RESULTS.md).
