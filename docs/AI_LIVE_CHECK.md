# User-run live AI check

**Status: live provider verification has not been performed by this cleanup.** Automated checks use mocked responses or provider `none`. The command below can make paid provider requests. Run it yourself when ready.

## Configure the server

From the repository root, create `server/.env` (ignored by Git):

```dotenv
LLM_PROVIDER=openai-compatible
LLM_API_KEY=your_opencode_key
LLM_MODEL=deepseek-v4.1-flash
LLM_BASE_URL=https://opencode.ai/inference/openai/v1
```

Replace the placeholder with your own OpenCode Console key. Keep this file local. Explicit process variables take priority; `server/.env` is loaded before the older root `.env.local`. Restart `npm run dev:all` after changing model settings. No browser API key or visitor token is needed.

## One real diagnosis in the app

1. Run `npm run dev:all` and open the app URL printed in the terminal.
2. Open **Faults**, then **F-001**. Suggested diagnosis opens and retrieves automatically. A cached result can be requested again with **Refresh**.
3. Expect **Matched and explained** for a validated provider response. **How this was produced** identifies the model and prompt. A fallback stays **Matched from cases** and shows its reason; the backend terminal logs `MODEL`, `ATTEMPT FAILED`, `FALLBACK` or `CACHE` without the key.
4. Check the proposed causes, sources and draft steps yourself. A model explanation does not confirm a fault or authorize repair work.

## Three seeded faults

```sh
npm run check:ai
```

This runs F-001, F-002 and F-003 using the same diagnosis service, canonical part context and fresh illustrative seed records in memory. It does not change the working database. Each JSON line reports mode, confidence, validated yes/no, step IDs, citation IDs, latency and fallback reason. A rejected output, missing connection or unexpected fallback exits non-zero. An honest insufficient-information response can pass validation with no ranked steps; this is not proof of diagnostic accuracy.

For a key-free tooling check only:

```sh
npm run check:ai -- --self-test
```

That uses mocked responses and clearly identifies itself. It does not establish a live connection. Keep a redacted copy of the actual live command output if you want to document provider verification.
