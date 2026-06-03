import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

let _resolved: {
  command: string;
  prefixArgs: string[];
  shell: boolean;
} | null = null;

/**
 * Resolve the converge CLI invocation the studio should spawn.
 *
 * Priority:
 *   1. `CONVERGE_CLI` env var — explicit override (path to dist/index.js,
 *      or the name of a binary on PATH).
 *   2. The in-repo build at `<monorepo>/packages/cli/dist/index.js` —
 *      preferred during development so studio always exercises the
 *      latest local code instead of a stale globally-installed copy.
 *   3. `converge` from PATH — fallback for production studio installs
 *      where users have done `npm i -g @openplaybooks/converge`.
 *
 * Returns the command plus any prefix args (e.g. the JS file when we
 * invoke `node`), and whether to spawn with `shell: true`.
 */
export function getConvergeCli(): {
  command: string;
  prefixArgs: string[];
  shell: boolean;
} {
  if (_resolved) return _resolved;

  const override = process.env.CONVERGE_CLI?.trim();
  if (override) {
    if (
      override.endsWith(".js") ||
      override.endsWith(".mjs") ||
      override.endsWith(".cjs")
    ) {
      _resolved = {
        command: process.execPath,
        prefixArgs: [override],
        shell: false,
      };
    } else {
      _resolved = { command: override, prefixArgs: [], shell: true };
    }
    return _resolved;
  }

  const local = findLocalCliBin();
  if (local) {
    _resolved = {
      command: process.execPath,
      prefixArgs: [local],
      shell: false,
    };
    return _resolved;
  }

  _resolved = { command: "converge", prefixArgs: [], shell: true };
  return _resolved;
}

function findLocalCliBin(): string | null {
  let dir = resolve(process.cwd());
  for (let i = 0; i < 12; i++) {
    const candidate = resolve(dir, "packages", "cli", "dist", "index.js");
    if (existsSync(candidate)) return candidate;
    const marker = resolve(dir, "pnpm-workspace.yaml");
    if (existsSync(marker)) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}
