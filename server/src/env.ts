import { z } from "zod";
export const serverEnv = z
  .object({
    OPERATOR_TOKEN: z.string().min(24),
    DB_PATH: z.string().default("data/drain.sqlite"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    HOST: z.string().default("127.0.0.1"),
    CORS_ORIGIN: z.string().default(""),
    SEED_DEMO: z.enum(["0", "1"]).default("0"),
    LLM_PROVIDER: z
      .enum(["none", "anthropic", "openai-compatible"])
      .default("none"),
    LLM_API_KEY: z.string().optional(),
    LLM_MODEL: z.string().optional(),
    LLM_BASE_URL:z.string().url().optional(),
    LORAWAN_INGEST_SECRET:z.string().min(24).optional(),
    LORAWAN_SIM_SECRET:z.string().min(24).optional(),
  })
  .passthrough();
