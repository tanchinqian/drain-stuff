import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { serve } from "@hono/node-server";
import { Repository } from "./db";
import { createApi } from "./api";
import { serverEnv } from "./env";
if (existsSync(".env.local")) loadEnvFile(".env.local");
const env = serverEnv.parse(process.env);
const repo = new Repository(env.DB_PATH);
const api = createApi(repo, {
  token: env.OPERATOR_TOKEN,
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
