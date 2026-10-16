import { z } from "zod";
const short = z.string().trim().min(1).max(160);
const photo = z
  .string()
  .max(100000)
  .refine(
    (s) =>
      /^https:\/\//.test(s) || /^data:image\/(png|jpeg|webp);base64,/.test(s),
    "Use an image URL or supported image",
  );
const flags = {
  ambientReached: z.boolean(),
  didNotReheat: z.boolean(),
  manualMaturity: z.boolean(),
  intakeChecked: z.boolean(),
  plasticsFound: z.boolean(),
  glassFound: z.boolean(),
  bayCovered: z.boolean(),
  sumpChecked: z.boolean(),
  rainExpected: z.boolean(),
  puddles: z.boolean(),
  pests: z.boolean(),
};
export const faultTypes = [
  "blockage",
  "sediment",
  "sensor_offline",
  "sensor_suspect",
  "standing_water",
  "scour",
  "mulch_loss",
  "sparse_planting",
  "joint_leak",
  "missing_cap",
  "not_heating",
  "putrid_smell",
  "ammonia_smell",
  "too_wet",
  "pests",
  "leachate",
] as const;
export function writeSchema(path: string) {
  if (/^\/faults\/[^/]+\/status$/.test(path))
    return z
      .object({
        status: z.enum(["open", "inspected", "closed"]),
        note: z.string().max(2000).optional(),
        user: short.optional(),
      })
      .strict();
  if (/^\/faults\/[^/]+\/actions$/.test(path))
    return z
      .object({ action: z.enum(["inspected", "cleaned", "work_order"]) })
      .strict();
  if (path === "/faults")
    return z
      .object({
        featureId: short,
        partId: short,
        type: z.enum(faultTypes),
        severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        note: z.string().trim().min(1).max(2000),
        user: short.optional(),
      })
      .strict();
  if (/^\/trials\/[^/]+\/tests$/.test(path))
    return z
      .object({
        phase: z.enum(["baseline", "retest"]),
        metric: z.enum(["infiltration_mm_hr", "drain_down_h", "sediment_mm"]),
        value: z.number().finite().min(0).max(1000),
        pointId: short,
        n: z.number().int().min(1).max(20),
        soilTexture: short.optional(),
      })
      .strict();
  if (/^\/trials\/[^/]+\/(checks|guardrails)$/.test(path))
    return z
      .object({
        nutrientExport: z.enum(["not_tested", "pass", "fail"]),
        noOpenDrainContact: z.boolean(),
        postStormCheck: z.enum(["pending", "ok", "issue"]),
        washoutChecked: z.boolean(),
        cloggingChecked: z.boolean(),
        drainDownFlag: z.boolean(),
        outletSample: z
          .object({
            t: z.iso.datetime(),
            value: z.number().finite().min(0),
            unit: short,
          })
          .strict()
          .optional(),
        postStormPhoto: photo.optional(),
      })
      .strict();
  if (/^\/batches\/[^/]+\/readings$/.test(path))
    return z
      .object({
        tempC: z.number().finite().min(0).max(100),
        moisturePct: z.number().finite().min(0).max(100),
        photoUrl: photo.optional(),
      })
      .strict();
  if (/^\/batches\/[^/]+\/checks$/.test(path))
    return z
      .object({
        ...flags,
        ambientTempC: z.number().finite().min(0).max(60),
        sumpLevelCm: z.number().finite().min(0).max(200),
        squeeze: z.enum(["wet", "ok", "dry"]),
        smell: z.enum(["normal", "putrid", "ammonia", "sour"]),
        photoUrl: photo.optional(),
      })
      .strict();
  if (/^\/batches\/[^/]+\/allocate$/.test(path))
    return z
      .object({
        featureId: short,
        doseLabel: short,
        lPerM2: z.number().finite().min(0).max(25),
        amendedDepthM: z.number().finite().gt(0).max(1).optional(),
        appliedBy: short.optional(),
      })
      .strict();
}
export const legacyReads = [
  /^\/(config|zones|houses|features|sensors|fault-rules|faults|trials|batches)$/,
  /^\/(features|sensors|fault-rules|trials|batches|batch-parts)\/[^/]+$/,
  /^\/sensors\/[^/]+\/readings$/,
  /^\/rainfall(?:\/zones)?$/,
  /^\/readings$/,
];
