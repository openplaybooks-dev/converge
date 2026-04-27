import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Resolve the converge project root for a given starting directory.
 *
 * Project root = the nearest ancestor (or `startDir` itself) that contains
 * a `.converge/` directory.
 *
 * This is the single source of truth for "where is the project" across
 * the entire framework. Every framework-resolved path — skills, agents,
 * artifacts, journal, sessions, playbooks, project.yaml — is computed
 * relative to this root.
 *
 * The walk stops at the first `.converge/` it finds. It never climbs
 * past one. It does not consult `.claude/`, `pnpm-workspace.yaml`,
 * `package.json`, or any other heuristic.
 *
 * @param startDir Directory to start the walk from. Resolved to absolute.
 * @returns Absolute path of the project root, or `null` if no `.converge/`
 *   ancestor exists.
 */
export function findConvergeRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, ".converge"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
