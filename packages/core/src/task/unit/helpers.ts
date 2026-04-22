/**
 * Utility helpers — getProjectRoot, getEpicId, hasStalled, exists.
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import type { Gap } from "../../task/gap/types.ts";
import type { Unit } from "./unit.ts";
import { createTaskContext } from "./task-context.ts";

/**
 * Get project root directory (workspace root).
 * Public so TaskExecutor can call it for virtual child Units.
 */
export function getProjectRoot(unit: Unit): string {
  // Virtual paths (inline spawns) delegate to parent
  if (unit.path.startsWith("<virtual:") && unit.parent) {
    return getProjectRoot(unit.parent);
  }
  // Walk up from task path to find .converge directory
  let current = path.dirname(unit.path);
  while (current !== path.dirname(current)) {
    if (path.basename(current) === ".converge") {
      return path.dirname(current);
    }
    current = path.dirname(current);
  }
  return path.dirname(unit.path);
}

/**
 * Extract epic ID from task path or parent chain.
 * Path format: .converge/epics/{epicId}/...
 *
 * Now uses path-based context for automatic derivation.
 */
export function getEpicId(unit: Unit): string {
  try {
    // Use path-based context to automatically derive epic ID
    const context = createTaskContext(unit.path);
    return context.epicId;
  } catch (error) {
    // Fallback for non-standard paths: walk parent chain
    let current = unit.parent;
    while (current) {
      if (current.id.match(/^(\d+-|epic-)/i)) {
        return current.id;
      }
      current = current.parent;
    }

    return "unknown-epic";
  }
}

/**
 * Check if stalled (no progress).
 *
 * Returns true if:
 * 1. Same number of gaps
 * 2. Same gap IDs in same order
 * 3. Same gap descriptions (to detect if the gap nature changed even with same ID)
 *
 * Also returns true (stalled) when:
 * 4. The gaps are all check-failed with identical error output — even if the
 *    description differs slightly, repeated identical check output means the
 *    same underlying problem is not being resolved.
 *
 * This prevents false stall detection when gaps have same IDs but different
 * states (e.g., check failed → check passed → check failed with different error).
 */
export function hasStalled(current: Gap[], previous: Gap[]): boolean {
  // Different number of gaps = progress made
  if (current.length !== previous.length) return false;

  // Primary: check if gaps are truly identical (same IDs AND same descriptions)
  const identicalByDescription = current.every((g, i) => {
    const prev = previous[i];
    if (!prev) return false;
    return g.id === prev.id && g.description === prev.description;
  });
  if (identicalByDescription) return true;

  // Secondary: check if all gaps are check-failed with identical error output.
  // This catches cases where descriptions vary but the underlying shell error
  // is the same (e.g. broken check command producing identical stderr each time).
  if (
    current.length > 0 &&
    current.every((g, i) => {
      const prev = previous[i];
      if (!prev) return false;
      if (g.id !== prev.id) return false;
      const curOutput = (g.metadata?.checkOutput as string) ?? "";
      const prevOutput = (prev.metadata?.checkOutput as string) ?? "";
      return curOutput !== "" && curOutput === prevOutput;
    })
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a path exists (handles globs).
 */
export async function pathExists(
  baseDir: string,
  pathOrPattern: string,
): Promise<boolean> {
  const hasGlobChars = /[*?{]/.test(pathOrPattern);
  if (hasGlobChars) {
    const { glob } = await import("glob");
    const matches = await glob(pathOrPattern, { cwd: baseDir });
    return matches.length > 0;
  }
  return existsSync(path.join(baseDir, pathOrPattern));
}
