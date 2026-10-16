import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync, readFileSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { loadEnvFile } from "node:process";
import { createServer } from "node:net";
import { resolve } from "node:path";
if (!existsSync(".env.local"))
  writeFileSync(
    ".env.local",
    `OPERATOR_TOKEN=${randomBytes(32).toString("hex")}\nDB_PATH=data/drain.sqlite\nLLM_PROVIDER=none\n`,
    { mode: 0o600 },
  );
if(!/^LORAWAN_SIM_SECRET=.+$/m.test(readFileSync('.env.local','utf8'))) appendFileSync('.env.local',`\nLORAWAN_SIM_SECRET=${randomBytes(32).toString('hex')}\n`);
loadEnvFile(".env.local");
if (!existsSync("app/node_modules/vite/bin/vite.js")) {
  console.error("Install frontend packages first: npm --prefix app ci");
  process.exit(1);
}
const build = spawnSync(process.execPath, ["scripts/build-server.mjs"], {
  stdio: "inherit",
});
if (build.status) process.exit(build.status);
async function openPort(start) {
  for (let port = start; port < start + 20; port++) {
    const free = await new Promise((done) => {
      const server = createServer();
      server.once("error", () => done(false));
      server.listen(port, "127.0.0.1", () => server.close(() => done(true)));
    });
    if (free) return port;
  }
  throw new Error("No local port is available");
}
const apiPort = await openPort(Number(process.env.PORT || 8080));
const appPort = await openPort(Number(process.env.APP_PORT || 5173));
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill());
  process.exitCode = code;
}
const backend = spawn(process.execPath, ["server/dist/index.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(apiPort),
    SEED_DEMO: "1",
    HOST: "127.0.0.1",
    CORS_ORIGIN: [process.env.CORS_ORIGIN, `http://127.0.0.1:${appPort}`]
      .filter(Boolean)
      .join(","),
  },
});
children.push(backend);
for (let i = 0; i < 75; i++) {
  if (backend.exitCode !== null)
    throw new Error("Backend stopped during startup");
  if (
    await fetch(`http://127.0.0.1:${apiPort}/health`)
      .then((r) => r.ok)
      .catch(() => false)
  )
    break;
  if (i === 74) {
    stop(1);
    throw new Error("Backend did not become ready");
  }
  await new Promise((r) => setTimeout(r, 200));
}
const frontend = spawn(
  process.execPath,
  [
    resolve("app/node_modules/vite/bin/vite.js"),
    "--host",
    "127.0.0.1",
    "--port",
    String(appPort),
    "--strictPort",
  ],
  {
    cwd: process.cwd() + "/app",
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_API_BASE: "/api/v1",
      DEV_API_TARGET: `http://127.0.0.1:${apiPort}`,
    },
  },
);
children.push(frontend);
for (const child of children)
  child.once("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
console.log(
  `Open http://127.0.0.1:${appPort}. First connection: enter your name and the token from .env.local. Tokens are never printed.`,
);
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
