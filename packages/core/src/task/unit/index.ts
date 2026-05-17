/**
 * Unit submodule — public API surface.
 */

export { Unit } from "./unit.ts";
export type { UnitConfig, CheckResult } from "./types.ts";
export {
  pathExists,
  getProjectRoot,
  getEpicId,
  hasStalled,
} from "./helpers.ts";
export {
  resolveChecks,
  resolvePrompt,
  resolveAgent,
  resolveTaskAI,
  resolveSkill,
  createTaskContext,
} from "./resolve.ts";
export {
  extractJournalTaskId,
  constructJournalPath,
  extractEpicId,
  extractEpicDir,
  extractLeafTaskId,
  extractParentTaskId,
  resolveTaskMdPath,
} from "./path-utils.ts";
