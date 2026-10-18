# User-run live AI check

**Status: live verification passed in the user's terminal on 18 October 2026.** F-001, F-002 and F-003 each returned `Matched and explained`, `validated: yes` and no fallback on the first attempt with `deepseek-v4.1-flash`. Their latencies were 37,725 ms, 26,099 ms and 40,144 ms respectively. All three reported low confidence; F-001 and F-003 returned no ranked repair steps. This confirms validated provider responses, not diagnostic accuracy. Automated cleanup checks use mocked responses or provider `none`. The command below can make paid provider requests.

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

`invalid_provider_output` means the provider response failed parsing, schema validation or the evidence rules; it does not mean the API key is missing. The backend now logs safe `validationDetails` (field paths and rejection categories, never the response text or credential), and passes that feedback into its second attempt. The prompt includes the enforced citation counts and text restrictions. Rerun the live check after these changes; restart the app backend to use them in the UI.

An earlier live run identified `response_truncated`: the provider reported its generation limit before completing an answer. OpenCode DeepSeek requests now use `reasoning_effort: low` and an 8,192-token budget, increasing to 16,384 only on a truncation retry. Other providers retain the 2,200-token limit. This leaves room for reasoning as well as final JSON; it does not relax field limits or accept partial output. DeepSeek attempts time out after 45 seconds each; the browser waits up to 105 seconds for both attempts. A larger budget can consume more provider credits. The successful user-run check above used the 8,192-token budget for all three first attempts. See [DeepSeek's thinking and token controls](https://api-docs.deepseek.com/api/create-chat-completion/) and [OpenCode's compatible inference endpoint](https://opencode.ai/v2/docs/console/api/inference/).

For a key-free tooling check only:

```sh
npm run check:ai -- --self-test
```

That uses mocked responses and clearly identifies itself. It does not establish a live connection. Keep a redacted copy of the actual live command output if you want to document provider verification.
