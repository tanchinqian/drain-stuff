import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { serve } from "@hono/node-server";
import { Repository } from "./db";
import { createApi } from "./api";
import { serverEnv } from "./env";
if (existsSync(".env.local")) loadEnvFile(".env.local");
const env = serverEnv.parse(process.env);
console.info('[diagnosis] CONFIG ' + JSON.stringify({
  provider: env.LLM_PROVIDER, model: env.LLM_MODEL ?? null,
  endpointHost: env.LLM_BASE_URL ? new URL(env.LLM_BASE_URL).hostname : 'default',
  configured: !!(env.LLM_PROVIDER !== 'none' && env.LLM_API_KEY && env.LLM_MODEL),
}));
if (env.LLM_PROVIDER === 'none' || !env.LLM_API_KEY || !env.LLM_MODEL)
  console.warn('[diagnosis] FALLBACK ' + JSON.stringify({
    reason: env.LLM_PROVIDER === 'none' ? 'provider_disabled' : !env.LLM_API_KEY ? 'missing_api_key' : 'missing_model',
  }));
const repo = new Repository(env.DB_PATH);
const api = createApi(repo, {
  llm:{provider:env.LLM_PROVIDER,key:env.LLM_API_KEY,model:env.LLM_MODEL,baseUrl:env.LLM_BASE_URL},
  deviceSecret:env.LORAWAN_INGEST_SECRET,simSecret:env.LORAWAN_SIM_SECRET,
  seed: env.SEED_DEMO === "1",
  corsOrigins: env.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
});
const server = serve(
  { fetch: api.app.fetch, port: env.PORT, hostname: env.HOST },
  () => console.log(`Drain API ready at http://${env.HOST}:${env.PORT}/api/v1`),
);
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await api.close();
  server.close(() => process.exit(0));
};
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
