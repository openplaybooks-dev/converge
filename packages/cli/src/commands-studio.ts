/**
 * `converge studio` — launch the browser studio.
 *
 * The studio is a separate, heavy (Next.js) package that is NOT a dependency of
 * the CLI. To keep the CLI lean it is fetched on demand: we spawn it via
 * `npx -y @openplaybooks/converge-studio@<cli-version>`, which npx downloads
 * once and caches for subsequent runs.
 *
 * The spawned studio reads project state from CONVERGE_PROJECT_DIR and shells
 * back to *this* CLI build via CONVERGE_CLI so versions stay in lockstep.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CommonOptions } from "./commands.ts";

const STUDIO_PKG = "@openplaybooks/converge-studio";
const DEFAULT_PORT = 4317;

export interface StudioOptions extends CommonOptions {
  /** Port for the studio server (default: 4317). */
  port?: number;
  /** Open the browser once the server is up (default: true). */
  open?: boolean;
}

/** Read this CLI's own version from its package.json (mirrors main.ts). */
function getCliVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "../package.json");
    return JSON.parse(readFileSync(pkgPath, "utf-8")).version || "latest";
  } catch {
    return "latest";
  }
}

/** Absolute path to this CLI's entry, passed to the studio as CONVERGE_CLI. */
function getSelfCliPath(): string {
  // When running from dist, import.meta.url IS the bundled entry. When running
  // from source (tsx), point at the built dist so the studio always invokes the
  // compiled CLI.
  const here = fileURLToPath(import.meta.url);
  if (here.endsWith(".js")) return here;
  return join(dirname(here), "..", "dist", "index.js");
}

/** Open a URL in the default browser, best-effort and non-fatal. */
function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  try {
    spawn(cmd, [url], {
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
    }).unref();
  } catch {
    /* best-effort */
  }
}

export async function studioCommand(options: StudioOptions = {}): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const port = options.port && options.port > 0 ? options.port : DEFAULT_PORT;
  const spec = `${STUDIO_PKG}@${getCliVersion()}`;

  console.log(`🚀 Launching Converge studio…`);
  console.log(`   Fetching ${spec} (first run only — npx caches it).`);

  const child = spawn("npx", ["-y", spec, "--port", String(port)], {
    stdio: "inherit",
    env: {
      ...process.env,
      CONVERGE_PROJECT_DIR: projectDir,
      CONVERGE_CLI: getSelfCliPath(),
      PORT: String(port),
    },
    // npx is npx.cmd on Windows and must run through the shell.
    shell: process.platform === "win32",
  });

  if (options.open !== false) {
    // The server takes a moment to boot; open after a short delay.
    setTimeout(() => openBrowser(`http://127.0.0.1:${port}`), 2500);
  }

  // Forward termination signals so Ctrl-C tears the studio down cleanly.
  const forward = (sig: NodeJS.Signals) => {
    if (!child.killed) child.kill(sig);
  };
  process.on("SIGINT", forward);
  process.on("SIGTERM", forward);

  await new Promise<void>((resolvePromise) => {
    child.on("exit", (code, signal) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      if (signal) {
        // Re-raise so our exit code reflects the signal.
        process.exitCode = 1;
      } else if (typeof code === "number" && code !== 0) {
        process.exitCode = code;
      }
      resolvePromise();
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        console.error(
          `❌ Could not run npx. Ensure Node.js / npm is installed and on PATH.`,
        );
      } else {
        console.error(`❌ Failed to launch studio: ${err.message}`);
      }
      process.exitCode = 1;
      resolvePromise();
    });
  });
}
