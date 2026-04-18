/**
 * Child unit discovery — discoverChildren() and discoverEpicChildren().
 */

import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import * as path from "node:path";
import type { Gap } from "../gap/types.ts";
import type { Unit } from "./unit.ts";

/**
 * Discover children by scanning numbered sibling directories for TASK.md.
 * Pattern: epics/01-name/001-task/TASK.md
 */
export async function discoverEpicChildren(
  unit: Unit,
  gaps: Gap[],
  forceAll: boolean,
): Promise<Unit[]> {
  const childUnits: Unit[] = [];

  // Scan both the task directory and its tasks/ subdirectory.
  // Container tasks (no executor, children in tasks/ subfolder) use the tasks/ structure.
  const scanDirs = [unit.path];
  const tasksSubDir = path.join(unit.path, "tasks");
  if (existsSync(tasksSubDir)) scanDirs.push(tasksSubDir);

  for (const taskDir of scanDirs) {
    try {
      const entries = await readdir(taskDir, { withFileTypes: true });
      const numberedDirs = entries
        .filter((e) => e.isDirectory() && /^\d{2,3}-/.test(e.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const dir of numberedDirs) {
        // Look for TASK.md inside the numbered subdir
        for (const candidate of ["TASK.md"]) {
          const taskFile = path.join(taskDir, dir.name, candidate);
          if (existsSync(taskFile)) {
            try {
              // Dynamic import to avoid circular dependency at module level
              const { Unit: UnitClass } = await import("./unit.ts");
              // Always use fromPath() - it handles TASK.md
              const childUnit = await UnitClass.fromPath(taskFile, unit);
              childUnits.push(childUnit);
            } catch (error) {
              console.warn(`Failed to load child unit at ${taskFile}:`, error);
            }
            break;
          }
        }
      }
    } catch {
      // Directory not readable
    }
  }

  return childUnits;
}

/**
 * Discover child units from folder structure.
 * Looks for numbered subdirectories (001-*, 002-*) containing TASK.md.
 */
export async function discoverChildren(
  unit: Unit,
  gaps: Gap[],
  forceAll: boolean = false,
): Promise<Unit[]> {
  return discoverEpicChildren(unit, gaps, forceAll);
}
