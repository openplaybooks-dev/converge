export {
  gapWeight,
  totalScore,
  scoreByKind,
  scoreBySeverity,
  sortByWeight,
} from "./weights.ts";
export {
  appendLedgerEntry,
  readLedger,
  formatTrendTable,
  closeOrphanedRuns,
} from "./gap-ledger.ts";
export type { LedgerEntry } from "./gap-ledger.ts";
export { backlogItemToGap, collectBacklogGaps } from "./backlog-bridge.ts";
export { convergeRun } from "./converge-runner.ts";
export type { ConvergeRunConfig, ConvergeResult } from "./converge-runner.ts";
