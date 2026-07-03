import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const xdgConfigHome = path.join(rootDir, ".wrangler-xdg");

mkdirSync(xdgConfigHome, { recursive: true });

const children = [];
let shuttingDown = false;

function start(name, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`[dev-local] ${name} exited (${signal || code}). Stopping all services.`);
    stopAll(code ?? 1);
  });

  children.push(child);
  return child;
}

function stopAll(exitCode = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(exitCode), 200);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

start("wrangler", "npx.cmd", ["wrangler", "dev", "--ip", "127.0.0.1", "--port", "8787"], {
  XDG_CONFIG_HOME: xdgConfigHome,
});

start(
  "vite",
  "npm.cmd",
  ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  {
    VITE_LOCAL_API_PROXY: "http://127.0.0.1:8787",
  },
);
