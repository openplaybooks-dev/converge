import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Check whether a prior runstate.json exists in the project's target directory.
 */
export function checkRunState(cwd: string): boolean {
  const projectDir = resolve(cwd);
  return existsSync(join(projectDir, "target", "runstate.json"));
}
