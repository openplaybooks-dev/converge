#!/usr/bin/env node
/**
 * Launcher for the Converge browser studio.
 *
 * Boots the Next.js standalone server emitted by `next build` (see
 * next.config.ts `output: 'standalone'`). Designed to be run either directly,
 * via `npx @openplaybooks/converge-studio`, or spawned by the converge CLI's
 * `studio` command.
 *
 * Env / args:
 *   --port, -p <n>          Port to listen on (default: 4317, or PORT env).
 *   PORT                    Fallback for --port.
 *   HOSTNAME                Bind host (default: 127.0.0.1 — loopback only).
 *   CONVERGE_PROJECT_DIR    Project root the studio reads .converge state from
 *                           (default: cwd). The CLI sets this when spawning.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const DEFAULT_PORT = 4317;

function parsePort(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' || a === '-p') return Number(argv[i + 1]);
    if (a.startsWith('--port=')) return Number(a.slice('--port='.length));
  }
  if (process.env.PORT) return Number(process.env.PORT);
  return DEFAULT_PORT;
}

const port = parsePort(process.argv.slice(2));
if (!Number.isInteger(port) || port <= 0) {
  console.error(`[studio] invalid port: ${port}`);
  process.exit(1);
}

// Next's standalone server reads PORT / HOSTNAME from env at import time.
process.env.PORT = String(port);
process.env.HOSTNAME ??= '127.0.0.1';
// Don't clobber a CONVERGE_PROJECT_DIR the CLI already passed; default to cwd so
// `npx @openplaybooks/converge-studio` works on its own.
process.env.CONVERGE_PROJECT_DIR ??= process.cwd();

const pkgRoot = path.join(import.meta.dirname, '..');
const serverPath = path.join(pkgRoot, '.next', 'standalone', 'packages', 'studio', 'server.js');

if (!existsSync(serverPath)) {
  console.error(
    `[studio] standalone server not found at ${serverPath}.\n` +
      `  The package may be built incorrectly. Expected a Next.js standalone build.`,
  );
  process.exit(1);
}

console.log(`[studio] http://${process.env.HOSTNAME}:${port}`);
console.log(`[studio] project: ${process.env.CONVERGE_PROJECT_DIR}`);

await import(pathToFileURL(serverPath).href);
