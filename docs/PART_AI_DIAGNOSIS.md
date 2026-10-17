# Part-level diagnosis

Open a drainage asset, select a part with a recorded open finding (for example S2 / Mulch layer), then choose **AI diagnosis → Analyse this part**. The existing fault drawer also retains diagnosis. A temporary model alert alone requires a recorded inspection before diagnosis.

The request includes the saved finding, canonical part information, relevant stored readings and their trust, matched cases/guidance, and the displayed simulation snapshot when available. The model can add general-knowledge hypotheses and high-level checks. Site observations are not invented; simulated results remain separate. Results show confidence, requested model or fallback, possible causes/reasoning, missing information, checks and retrieved sources. Feedback is audited.

Local server configuration:

```
LLM_PROVIDER=openai-compatible
LLM_MODEL=deepseek-v4.1-flash
LLM_BASE_URL=https://opencode.ai/inference/openai/v1
LLM_API_KEY=<your OpenCode key>
```

Use ignored local server settings and restart `npm run dev:all`. The browser uses `/api/v1`, never the model key. Model ID and current endpoint are listed in the [official OpenCode model documentation](https://opencode.ai/v2/docs/console/models/).

The backend terminal reports `[diagnosis] CONFIG`, then `[diagnosis] MODEL` or `[diagnosis] CACHE` when the provider supplies a validated result. Any failure is explicit: `[diagnosis] ATTEMPT FAILED` followed by `[diagnosis] FALLBACK` with reasons such as `missing_api_key`, `provider_http_401`, `provider_timeout` or `invalid_provider_output`. Missing configuration is also logged at startup. An unavailable backend cannot write to a server terminal: browser-only fallback is explicitly labelled and logs to the browser console instead.

Contract 4.3.0 adds optional partContext input and optional analysis/provider result metadata. The existing fault-only request remains compatible. Suggestions are stored as JSON; no database migration is needed.

The production build passed. The model connection is configured locally; no live provider verification has been performed. Hypotheses are unconfirmed and the physical model is uncalibrated.
