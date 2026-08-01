const { spawn } = require("node:child_process");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const BACKEND_ENV_PATH = join(__dirname, "..", "..", "backend", ".env");

function parseEnv(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const comment = value.indexOf(" #");
    if (comment !== -1) value = value.slice(0, comment).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

function loadBackendEnv() {
  if (!existsSync(BACKEND_ENV_PATH)) return {};
  return parseEnv(readFileSync(BACKEND_ENV_PATH, "utf8"));
}

function run() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    console.error("usage: node scripts/backend-env.js <command> [args...]");
    process.exit(1);
  }
  const env = loadBackendEnv();
  if (process.env.EXPO_PUBLIC_API_PORT === undefined && env.PORT) {
    process.env.EXPO_PUBLIC_API_PORT = env.PORT;
  }
  const bin = process.platform === "win32" ? `${command}.cmd` : command;
  const child = spawn(bin, args, { stdio: "inherit", env: process.env });
  child.on("exit", (code) => process.exit(code ?? 1));
}

if (require.main === module) {
  run();
}

module.exports = { parseEnv, loadBackendEnv };
