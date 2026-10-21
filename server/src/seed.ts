import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { Repository } from "./db";
if (existsSync("server/.env")) loadEnvFile("server/.env");
if (existsSync(".env.local")) loadEnvFile(".env.local");
const repo = new Repository(process.env.DB_PATH || "data/drain.sqlite");
try {
  console.log(
    repo.seed()
      ? "Demo database seeded."
      : "Database already has records; preserved existing data.",
  );
} finally {
  repo.close();
}
