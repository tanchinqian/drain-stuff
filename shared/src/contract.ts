import { z } from "zod";
export const CONTRACT_VERSION = "4.1.0";
export const assets = ["S1", "S2", "S3", "I1", "R1"] as const;
export const assetId = z.enum(assets);
const text = z.string().trim().min(1).max(2000);
const actor = z.string().trim().min(1).max(80);
export const stormPresets = {
  moderate: { peakMmHr: 30, durationMinutes: 45 },
  heavy: { peakMmHr: 63, durationMinutes: 45 },
  extreme: { peakMmHr: 120, durationMinutes: 60 },
} as const;
export const stormInput = z
  .object({
    preset: z.enum(["moderate", "heavy", "extreme"]).optional(),
    custom: z
      .object({
        peakMmHr: z.number().finite().min(0).max(300),
        durationMinutes: z.number().int().min(1).max(180),
      })
      .strict()
      .optional(),
    assets: z
      .array(assetId)
      .min(1)
      .max(5)
      .refine((a) => new Set(a).size === a.length, "Choose each asset once"),
    options: z
      .object({
        robustness: z.boolean().default(true),
        previewUnconfirmed: z.boolean().default(false),
        recoveryMinutes: z.number().int().min(0).max(360).default(360),
      })
      .strict()
      .default({
        robustness: true,
        previewUnconfirmed: false,
        recoveryMinutes: 360,
      }),
  })
  .strict()
  .refine(
    (v) => Number(!!v.preset) + Number(!!v.custom) === 1,
    "Choose a preset or custom rainfall, not both",
  );
export type StormRequest = z.input<typeof stormInput>;
export type StormInput = z.infer<typeof stormInput>;
export const lifecycleInput = z
  .object({
    note: text,
    actor: actor.optional(),
    assignee: actor.optional(),
    evidence: z
      .discriminatedUnion("type", [
        z
          .object({
            type: z.literal("photo"),
            path: z
              .string()
              .regex(/^\/uploads\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp)$/i),
          })
          .strict(),
        z
          .object({
            type: z.literal("sensor"),
            sensorId: text,
            value: z.number().finite(),
            unit: z.string().max(30),
          })
          .strict(),
        z
          .object({
            type: z.literal("storm-rerun"),
            stormRunId: z.string().uuid(),
          })
          .strict(),
      ])
      .optional(),
  })
  .strict();
export const overrideInput = z
  .object({
    stormRunId: z.string().uuid(),
    asset: assetId,
    position: z.number().int().min(1).max(5),
    reason: text,
    user: actor.optional(),
  })
  .strict();
export const caseInput = z
  .object({
    faultId: text,
    cause: text,
    outcome: text,
    stepsTaken: z.array(z.string()).max(20),
  })
  .strict();
export const feedbackInput = z
  .object({
    suggestionId: z.string().uuid(),
    choice: z.enum(["accept", "edit", "reject"]),
    note: z.string().max(2000).default(""),
    rankedStepIds: z.array(z.string()).max(20).optional(),
  })
  .strict();
export const diagnosisInput = z.object({ faultId: text }).strict();
export const escalationInput = z
  .object({
    stormRunId: z.string().uuid(),
    asset: assetId,
    recipient: actor,
    note: text,
  })
  .strict();
export interface Escalation {
  id: string;
  asset: string;
  recipient: string;
  note: string;
  status: "recorded" | "acknowledged" | "resolved";
  stormRunId: string;
  evidence: TriageRow;
  actor: string;
  at: string;
  history: { status: string; note: string; actor: string; at: string }[];
}
export interface RunSummary {
  peakPondingM: number;
  hoursAboveLimit: number;
  overflowM3: number;
  maxRelativeError: number;
}
export interface ModeResult {
  config: import("./physics/config").PhysicsConfig;
  summary: RunSummary;
  timeline: {
    second: number;
    ponding: number;
    inlet: number;
    outfall: number;
    overflow: number;
    pipeFill: number;
    gravelHead: number;
  }[];
}
export interface TriageRow {
  asset: string;
  rank: number;
  asInstalled: ModeResult;
  ifCleared: ModeResult;
  capacityLimit: ModeResult;
  capacityLimited: boolean;
  faultIds: string[];
  unconfirmedFaultIds: string[];
  label: "Relative ranking, not a prediction";
}
export interface StormResult {
  rows: TriageRow[];
  robustness: {
    evaluated: boolean;
    stable: boolean | null;
    orders: { parameter: string; multiplier: number; assets: string[] }[];
  };
}
export interface CaseRecord {
  id: string;
  assetType: string;
  part: string;
  ruleId: string;
  symptoms: string;
  sensorFlags: string[];
  cause: string;
  stepsTaken: string[];
  outcome: string;
  sourceLabel: string;
  sourceUrl: string;
  createdBy: string;
}
export interface GuidanceRecord {
  id: string;
  title: string;
  passage: string;
  sourceUrl: string;
  appliesTo: string[];
}
export interface Suggestion {
  id: string;
  faultId: string;
  diagnosis: string;
  confidence: "low" | "medium" | "high";
  rankedStepIds: string[];
  citedCaseIds: string[];
  citedGuidanceIds: string[];
  insufficientInformation: boolean;
  notes: string;
  mode: "Matched from cases" | "Matched and explained";
  promptVersion: string;
  sources: (CaseRecord | GuidanceRecord)[];
  draftBanner: string;
}
