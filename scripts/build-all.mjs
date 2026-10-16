import { spawnSync } from "node:child_process";
const check = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "server/tsconfig.json"],
  { stdio: "inherit" },
);
if (check.status) process.exit(check.status);
const npmCli = process.env.npm_execpath;
const command = npmCli
  ? process.execPath
  : process.platform === "win32"
    ? "npm.cmd"
    : "npm";
const args = [...(npmCli ? [npmCli] : []), "--prefix", "app", "run", "build"];
const app = spawnSync(command, args, {
  shell: !npmCli && process.platform === "win32",
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_API_BASE: process.env.VITE_API_BASE ?? "/api/v1",
  },
});
if (app.status) process.exit(app.status);
await import("./build-server.mjs");
