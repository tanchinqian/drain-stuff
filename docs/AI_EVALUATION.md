# Diagnosis retrieval sanity check

Run `node --import tsx scripts/evaluate-retrieval.ts` from the repository root. This is **not diagnostic accuracy** or a field evaluation.

## Library and provenance

Nine cases: one reported incident from [Malay Mail/Bernama, 24 January 2022](https://www.malaymail.com/news/malaysia/2022/01/24/fire-dept-clogged-drains-cause-stagnant-water-in-taman-sri-muda/2037276), plus eight explicitly labelled **Guidance-based examples**. The incident describes obstructed drainage and receding water, not a verified maintenance outcome. No incident repair steps are invented.

The examples and three short guidance passages derive only from [EPA filter-sock guidance](https://www.epa.gov/system/files/documents/2021-11/bmp-compost-filter-socks.pdf), [Minnesota rain-garden maintenance](https://stormwater.pca.state.mn.us/rain_gardens_bioretention_101), and [Asheville pre-storm preparation](https://www.ashevillenc.gov/news/asheville-asks-how-does-stormwater-services-prepare-for-heavy-rain/). Asheville's indexed page text was available; direct retrieval returned an access error. These sources inform inspection themes; they do not validate the simulator, local procedures or this case collection. Source labels/URLs are retained in every case.

## Method and result — 16 October 2026

Leave each case out; retrieve the top three remaining cases using structured matches (asset, part, rule, sensor flags) plus TF-IDF-weighted text. Check whether any result has the held-out cause label. **8 of 9** held-out cases found their cause label in the top three. The singleton incident label had no second example to retrieve.

| Held-out case | Same cause in top 3 |
|---|---|
| CASE-MM-20220124 | No |
| CASE-INLET-1 / CASE-INLET-2 | Yes / Yes |
| CASE-SOCK-1 / CASE-SOCK-2 | Yes / Yes |
| CASE-SEDIMENT-1 / CASE-SEDIMENT-2 | Yes / Yes |
| CASE-POND-1 / CASE-POND-2 | Yes / Yes |

The small, mostly paired guidance examples make this an easy structural sanity check. Cause labels and example wording were authored together; they are not independent ground truth. No train/test generalisation or statistical performance claim follows. A larger independently reviewed local library is needed before operational reliance.

## Provider behavior and checks

`server/ai/prompts/diagnosis.system.md` is loaded at startup and versions every server suggestion, including deterministic fallback. The browser-only fallback has its own explicit version. Delimited JSON carries untrusted source text, current sensor trust, retrieved cases/passages and allowed draft step IDs. Providers can explain/rank that evidence; they cannot write work orders, change severities or create repair instructions.

Anthropic Messages and OpenAI-compatible Chat Completions adapters take the model from `LLM_MODEL`, low temperature, an 8-second per-attempt timeout, one retry, and an input-hash cache (100 entries, process-local). The compatible adapter uses JSON mode plus strict Zod validation; a model that rejects its parameters falls back rather than silently changing models. Invalid step/citation IDs, extra fields, inconsistent insufficient-information results, excessive size and prohibited numeric claims are rejected. Provider failures never expose keys or provider error bodies to the user.

Automated provider calls are mocked. Checks cover invalid JSON, unknown step, unknown citation, extra properties, forecast text, insufficient results with steps, case injection, timeout, missing key, suspect evidence, both response envelopes, cache behavior, prompt version loading and an assembled-prompt snapshot. **No live paid provider/model request has been verified.** `LLM_PROVIDER=none` is the current local configuration. The user-supplied key is the local operator token, not an inferred provider credential.

API references: [official OpenAI Chat Completions schema](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [Anthropic Messages schema](https://platform.claude.com/docs/en/api/messages/create). The UI displays mode, confidence, prompt version, sources, unchanged draft steps and logged Accept/Edit/Reject controls. Human review remains necessary; constrained JSON is not proof of factual correctness.
