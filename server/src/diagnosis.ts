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
        .filter((s) => fault.sensorIds.includes(s.sensorId))
        .map((s) => ({
          id: s.sensorId,
          value: s.lastValue,
          unit: s.unit,
          trust: s.status,
          at: s.lastAt,
        })),
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
      if (
        config.provider === "none" ||
        !config.key ||
        !config.model ||
        fallback.insufficientInformation
      )
        return fallback;
      const payload = assemblePrompt(live, sensors, fallback),
        hash = createHash("sha256")
          .update(prompt.version + config.provider + config.model + payload)
          .digest("hex");
      if (cache.has(hash))
        return {
          ...structuredClone(cache.get(hash)!),
          id: crypto.randomUUID(),
        };
      for (let attempt = 0; attempt < 2; attempt++)
        try {
          const signal = AbortSignal.timeout(config.timeoutMs ?? 8000);
          const anthropic = config.provider === "anthropic";
          const url = anthropic
            ? "https://api.anthropic.com/v1/messages"
            : (config.baseUrl ?? "https://api.openai.com/v1").replace(
                /\/$/,
                "",
              ) + "/chat/completions";
          if (new URL(url).protocol !== "https:")
            throw new Error("Provider URL must use HTTPS");
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
                    max_tokens: 1200,
                    temperature: 0,
                    system: prompt.text,
                    messages: [{ role: "user", content: payload }],
                  }
                : {
                    model: config.model,
                    temperature: 0,
                    max_completion_tokens: 1200,
                    response_format: { type: "json_object" },
                    messages: [
                      { role: "system", content: prompt.text },
                      { role: "user", content: payload },
                    ],
                  },
            ),
          });
          if (!response.ok) throw new Error("Provider request failed");
          if (Number(response.headers.get("content-length") ?? 0) > 100000)
            throw new Error("Provider response too large");
          const body = await response.text();
          if (body.length > 100000)
            throw new Error("Provider response too large");
          const raw = JSON.parse(body);
          const content = anthropic
            ? raw.content
                ?.filter((c: { type: string }) => c.type === "text")
                .map((c: { text: string }) => c.text)
                .join("")
            : raw.choices?.[0]?.message?.content;
          const parsed = outputSchema.parse(JSON.parse(content));
          if (
            parsed.rankedStepIds.some((id) => !stepLibrary[id]) ||
            parsed.citedCaseIds.some(
              (id) => !fallback.citedCaseIds.includes(id),
            ) ||
            parsed.citedGuidanceIds.some(
              (id) => !fallback.citedGuidanceIds.includes(id),
            ) ||
            (parsed.insufficientInformation && parsed.rankedStepIds.length) ||
            (!parsed.insufficientInformation &&
              !parsed.citedCaseIds.length &&
              !parsed.citedGuidanceIds.length) ||
            /\d+\s*%|https?:\/\/|\b(I recommend|you should|guarantee|will prevent flooding)\b/i.test(
              parsed.diagnosis + " " + parsed.notes,
            )
          )
            throw new Error("Unconstrained diagnosis");
          const result: Suggestion = {
            ...fallback,
            ...parsed,
            mode: "Matched and explained",
          };
          if (cache.size >= 100) cache.delete(cache.keys().next().value!);
          cache.set(hash, result);
          return result;
        } catch {
          /* Invalid, unavailable or slow providers never prevent a deterministic result. */
        }
      return {
        ...fallback,
        notes:
          fallback.notes +
          " Provider explanation unavailable or rejected; matched cases shown.",
      };
    },
  };
}
