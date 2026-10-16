import { build } from "esbuild";
await build({
  entryPoints: [
    "server/src/index.ts",
    "server/src/storm-worker.ts",
    "server/src/seed.ts",
  ],
  outdir: "server/dist",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  sourcemap: true,
});
