import { mkdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";

const rootDir = process.cwd();
const xdgConfigHome = path.join(rootDir, ".wrangler-xdg");

mkdirSync(xdgConfigHome, { recursive: true });

const args = process.argv.slice(2);
const child = spawn("npx.cmd", ["wrangler", ...args], {
  cwd: rootDir,
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    XDG_CONFIG_HOME: xdgConfigHome,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
