/**
 * Playbook Module
 *
 * Unified API that combines workflow definitions (what to do)
 * and run configuration (how to do it) into a single reusable concept.
 */

export type {
  PlaybookDef,
  PlaybookInput,
  PlaybookGoal,
  PlaybookGoalCheck,
  PlaybookRunConfig,
  PlaybookSource,
  ResolvedPlaybook,
  PlaybookContext,
  PlaybookTrendEntry,
} from "./types.ts";

export type { PlaybookPaths } from "./paths.ts";
export { resolvePlaybookPaths } from "./paths.ts";

export {
  parsePlaybookYml,
  validatePlaybook,
  discoverPlaybooks,
  loadPlaybook,
  resolvePlaybook,
  substituteVars,
  parseDuration,
} from "./loader.ts";

export {
  generateEpicFromPlaybook,
  installPlaybook,
  mergeRunConfig,
  injectVarsIntoTaskMd,
} from "./executor.ts";

export {
  initPlaybookJournal,
  appendTrend,
  readTrends,
  listExecutions,
  getPlaybookJournalDir,
} from "./journal.ts";
export type { ExecutionSummary } from "./journal.ts";
