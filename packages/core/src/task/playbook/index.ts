/**
 * Playbook Module
 *
 * Unified API that combines workflow definitions (what to do)
 * and run configuration (how to do it) into a single reusable concept.
 */

export type {
  PlaybookDef,
  PlaybookInput,
  PlaybookRunConfig,
  PlaybookCheck,
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
  mergeRunConfig,
  injectVarsIntoTaskMd,
} from "./executor.ts";

export {
  initPlaybookJournal,
  appendTrend,
  readTrends,
  getPlaybookJournalDir,
} from "./journal.ts";
