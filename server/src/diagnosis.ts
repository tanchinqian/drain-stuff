import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  deterministicDiagnosis,
  stepLibrary,
} from "../../shared/src/diagnosis";
import type { Fault, Sensor } from "../../shared/src/api/types";
import type {
  CaseRecord,
  GuidanceRecord,
  Suggestion,
  DiagnosisContext,
} from "../../shared/src/contract";
export const outputSchema = z
  .object({
    diagnosis: z.string().min(1).max(1000),
    confidence: z.enum(["low", "medium", "high"]),
    rankedStepIds: z.array(z.string()).max(20),
    citedCaseIds: z.array(z.string()).max(3),
    citedGuidanceIds: z.array(z.string()).max(3),
    insufficientInformation: z.boolean(),
    notes: z.string().max(1000),
    analysis: z.object({
      possibleCauses: z.array(z.object({cause: z.string().min(1).max(200), reasoning: z.string().min(1).max(800)}).strict()).max(4),
      checks: z.array(z.string().min(1).max(400)).max(5),
      missingInformation: z.array(z.string().min(1).max(300)).max(5),
    }).strict().optional(),
  })
  .strict();
export interface ProviderConfig {
  provider: "none" | "anthropic" | "openai-compatible";
  key?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}
export function loadPrompt() {
  const text = readFileSync(
    new URL("../ai/prompts/diagnosis.system.md", import.meta.url),
    "utf8",
  );
  const version = text.match(/^version: (.+)$/m)?.[1];
  if (!version) throw new Error("Diagnosis system prompt needs a version");
  return { text, version };
}
const clean = (v: unknown) =>
  JSON.stringify(v, (_k, value) =>
    typeof value === "string"
      ? value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 4000)
      : value,
  )
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
export function assemblePrompt(
  fault: Fault,
  sensors: Sensor[],
  fallback: Suggestion,
  context?: DiagnosisContext,
) {
  return (
    "<fault_evidence_json>\n" +
    clean({
      fault: {
        id: fault.id,
        type: fault.type,
        part: fault.partId,
        description: fault.diagnosingInput,
      },
      sensors: sensors
        .filter((s) => fault.sensorIds.includes(s.sensorId) ||
          (!!context && s.ownerId === context.ownerId &&
            (s.partId === fault.partId || s.linkedPartIds.includes(fault.partId))))
        .map((s) => ({
          id: s.sensorId,
          value: s.lastValue,
          unit: s.unit,
          trust: s.status,
          at: s.lastAt,
          ...(context ? {text: s.lastText, role: s.role, metric: s.metric,
            source: s.deviceId ? 'Registered device reading' : 'Recorded reference or proxy'} : {}),
        })),
      ...(context ? { selectedPart: context, modelSource: 'Browser-supplied simulation snapshot, uncalibrated; not field measurements' } : {}),
      retrievedCases: fallback.sources.filter((s) => "cause" in s),
      retrievedGuidance: fallback.sources.filter((s) => "passage" in s),
      allowedSteps: stepLibrary,
    }) +
    "\n</fault_evidence_json>"
  );
}
export function createDiagnosisService(
  config: ProviderConfig,
  fetcher: typeof fetch = fetch,
) {
  const prompt = loadPrompt(),
    cache = new Map<string, Suggestion>();
  return {
    version: prompt.version,
    provider: config.provider,
    async diagnose(
      fault: Fault,
      assetType: string,
      cases: CaseRecord[],
      guidance: GuidanceRecord[],
      sensors: Sensor[],
      context?: DiagnosisContext,
    ): Promise<Suggestion> {
      const live = {
        ...fault,
        sensorStatusesAtAlert: {
          ...fault.sensorStatusesAtAlert,
          ...Object.fromEntries(
            sensors
              .filter((s) => fault.sensorIds.includes(s.sensorId))
              .map((s) => [s.sensorId, s.status]),
          ),
        },
      };
      const fallback = {
        ...deterministicDiagnosis(live, assetType, cases, guidance),
        promptVersion: prompt.version,
      };
      const fallbackResult = (reason: string) => {
        console.warn('[diagnosis] FALLBACK ' + JSON.stringify({
          faultId: fault.id, provider: config.provider, model: config.model ?? null, reason,
        }));
        return { ...fallback, provider: {model: config.model ?? null, fallback: true, reason},
          notes: fallback.notes + ' Model explanation unavailable (' + reason + '); case matching shown.' };
      };
      if (config.provider === 'none') return fallbackResult('provider_disabled');
      if (!config.key) return fallbackResult('missing_api_key');
      if (!config.model) return fallbackResult('missing_model');
      if (fallback.insufficientInformation && !context) return fallbackResult('insufficient_evidence');
      const payload = assemblePrompt(live, sensors, fallback, context),
        hash = createHash("sha256")
          .update(prompt.version + config.provider + config.model + payload)
          .digest("hex");
      if (cache.has(hash)) {
        console.info('[diagnosis] CACHE ' + JSON.stringify({faultId: fault.id, model: config.model}));
        return {
          ...structuredClone(cache.get(hash)!),
          id: crypto.randomUUID(),
        };
      }
      let failure = 'provider_network_error';
      let validationDetails: string[] = [];
      for (let attempt = 0; attempt < 2; attempt++)
        try {
          const wasTruncated = validationDetails.some(detail => detail.startsWith('response_truncated:'));
          const retryMessages = attempt && validationDetails.length
            ? [{role: 'user', content: 'The previous response failed validation: ' + validationDetails.join('; ') + '. Return a new complete JSON object following every output constraint. Do not add unsupported facts or repair steps to satisfy validation.'}]
            : [];
          validationDetails = [];
          const anthropic = config.provider === "anthropic";
          const url = anthropic
            ? "https://api.anthropic.com/v1/messages"
            : (config.baseUrl ?? "https://api.openai.com/v1").replace(
                /\/$/,
                "",
              ) + "/chat/completions";
          if (new URL(url).protocol !== "https:")
            throw new Error('provider_configuration_error');
          const openCode = !anthropic && new URL(url).hostname === 'opencode.ai';
          const deepSeek = openCode && config.model.startsWith('deepseek-');
          // DeepSeek's generation budget includes reasoning before the final JSON.
          const outputTokens = deepSeek ? (wasTruncated ? 16384 : 8192) : 2200;
          const signal = AbortSignal.timeout(config.timeoutMs ?? (deepSeek ? 45000 : 25000));
          const response = await fetcher(url, {
            method: "POST",
            signal,
            headers: anthropic
              ? {
                  "Content-Type": "application/json",
                  "x-api-key": config.key,
                  "anthropic-version": "2023-06-01",
                }
              : {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + config.key,
                },
            body: JSON.stringify(
              anthropic
                ? {
                    model: config.model,
                    max_tokens: outputTokens,
                    temperature: 0,
                    system: prompt.text,
                    messages: [{ role: "user", content: payload }, ...retryMessages],
                  }
                : {
                    model: config.model,
                    temperature: 0,
                    ...(openCode ? {max_tokens: outputTokens} : {max_completion_tokens: outputTokens}),
                    ...(deepSeek ? {reasoning_effort: 'low'} : {}),
                    response_format: { type: "json_object" },
                    messages: [
                      { role: "system", content: prompt.text },
                      { role: "user", content: payload },
                      ...retryMessages,
                    ],
                  },
            ),
          });
          if (!response.ok) throw new Error('provider_http_' + response.status);
          if (Number(response.headers.get("content-length") ?? 0) > 100000)
            throw new Error('provider_response_too_large');
          const body = await response.text();
          if (body.length > 100000)
            throw new Error('provider_response_too_large');
          let raw;
          try { raw = JSON.parse(body); } catch {
            validationDetails = ['response_envelope_invalid_json'];
            throw new Error('invalid_provider_output');
          }
          const content = anthropic
            ? raw.content
                ?.filter((c: { type: string }) => c.type === "text")
                .map((c: { text: string }) => c.text)
                .join("")
            : raw.choices?.[0]?.message?.content;
          if (anthropic ? raw.stop_reason === 'max_tokens' : raw.choices?.[0]?.finish_reason === 'length') {
            validationDetails = ['response_truncated: reached the ' + outputTokens + '-token budget; keep explanations concise and finish the JSON'];
            throw new Error('invalid_provider_output');
          }
          let value;
          try { value = JSON.parse(content); } catch {
            validationDetails = ['content_invalid_json: return only a complete JSON object, without Markdown'];
            throw new Error('invalid_provider_output');
          }
          const checked = outputSchema.safeParse(value);
          if (!checked.success) {
            // Only schema-owned field names and error codes; never log response text or unknown keys.
            const fields = new Set([...Object.keys(outputSchema.shape), 'possibleCauses', 'cause', 'reasoning', 'checks', 'missingInformation']);
            validationDetails = checked.error.issues.map(issue =>
              'schema:' + issue.path.map(key => typeof key === 'number' ? key : fields.has(String(key)) ? key : '*').join('.') + ':' + issue.code);
            throw new Error('invalid_provider_output');
          }
          const parsed = checked.data;
          if (parsed.rankedStepIds.some(id => !stepLibrary[id])) validationDetails.push('unknown_step_id: use only allowedSteps keys');
          if (parsed.citedCaseIds.some(id => !fallback.citedCaseIds.includes(id))) validationDetails.push('unknown_case_id: cite only retrievedCases IDs');
          if (parsed.citedGuidanceIds.some(id => !fallback.citedGuidanceIds.includes(id))) validationDetails.push('unknown_guidance_id: cite only retrievedGuidance IDs');
          if (parsed.insufficientInformation && parsed.rankedStepIds.length) validationDetails.push('insufficient_information_requires_empty_steps');
          if (!context && !parsed.insufficientInformation && !parsed.citedCaseIds.length && !parsed.citedGuidanceIds.length) validationDetails.push('explanation_requires_retrieved_citation');
          if (!context && /\d+\s*%/.test(parsed.diagnosis + ' ' + parsed.notes)) validationDetails.push('unsupported_percentage');
          if (/https?:\/\/|\b(I recommend|you should|guarantee|will prevent flooding)\b/i.test(parsed.diagnosis + ' ' + parsed.notes)) validationDetails.push('prohibited_claim_or_url: omit URLs, guarantees, I recommend, and you should');
          if (validationDetails.length) throw new Error('invalid_provider_output');
          if (context && !parsed.analysis) validationDetails = ['selected_part_requires_analysis_object'];
          if (context && !parsed.analysis) throw new Error('missing_part_analysis');
          const result: Suggestion = {
            ...fallback,
            ...parsed,
            mode: "Matched and explained",
            confidence: context && fallback.insufficientInformation ? 'low'
              : context && parsed.confidence === 'high' ? 'medium' : parsed.confidence,
            provider: {model: config.model, fallback: false},
          };
          if (cache.size >= 100) cache.delete(cache.keys().next().value!);
          cache.set(hash, result);
          console.info('[diagnosis] MODEL ' + JSON.stringify({faultId: fault.id, model: config.model, attempt: attempt + 1, outputTokenBudget: outputTokens}));
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          failure = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
            ? 'provider_timeout' : /^(provider_http_\d+|invalid_provider_output|missing_part_analysis|provider_response_too_large|provider_configuration_error)$/.test(message)
              ? message : message === 'timeout' ? 'provider_timeout' : 'provider_network_error';
          console.warn('[diagnosis] ATTEMPT FAILED ' + JSON.stringify({
            faultId: fault.id, model: config.model, attempt: attempt + 1, reason: failure,
            ...(validationDetails.length ? {validationDetails} : {}),
          }));
        }
      return fallbackResult(failure);
    },
  };
}
