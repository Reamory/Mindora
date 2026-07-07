#!/usr/bin/env node
// Wrapper to start `next dev` with PI_CODING_AGENT_DIR pointing into the
// workspace (./.pi/agent) so writes work in restricted sandboxes (e.g. when
// the dev server is spawned by a sandboxed IDE that forbids writes to
// %USERPROFILE%\.pi\agent).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const agentDir = resolve(root, ".pi", "agent");
if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });

process.env.PI_CODING_AGENT_DIR = agentDir;
console.log(`[dev] PI_CODING_AGENT_DIR = ${agentDir}`);

const port = process.env.PORT || "30141";
const child = spawn("npx", ["next", "dev", "-p", port], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
