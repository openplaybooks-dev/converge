import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Check whether a prior run_results.json exists in the project's target directory.
 */
export function checkRunResults(cwd: string): boolean {
  const projectDir = resolve(cwd);
  return existsSync(join(projectDir, "target", "run_results.json"));
}
