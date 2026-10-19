// Bundles the unit tests with esbuild (already a dev dependency) and runs them
// with Node's built-in test runner. No database or network needed.
import { build } from "esbuild";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(dir, "src/__tests__");
const entries = readdirSync(testDir).filter((f) => f.endsWith(".test.ts")).map((f) => path.join(testDir, f));
// Inside the package so externalized node_modules resolve; gitignored.
const outdir = path.join(dir, ".test-dist");
rmSync(outdir, { recursive: true, force: true });

await build({
  entryPoints: entries,
  outdir,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outExtension: { ".js": ".mjs" },
  logLevel: "warning",
});

const files = readdirSync(outdir).map((f) => path.join(outdir, f));
const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  cwd: dir,
  env: { ...process.env, NODE_ENV: "production", LOG_LEVEL: "silent" },
});
rmSync(outdir, { recursive: true, force: true });
process.exit(result.status ?? 1);
