/**
 * Lifecycle Module
 *
 * Before/Execute/After task lifecycle for the Converge framework.
 * Import from here instead of individual lifecycle files.
 */

export { pruneTaskJournal, DEFAULT_PRUNE_POLICY } from './prune.ts';
export type { PrunePolicy, PruneSummary } from './prune.ts';

export { runBeforePhase, updateResumePhase } from './before.ts';
export type {
  BeforePhaseResult,
  InputSnapshot,
  InputFile,
  InputPatternResult,
  DependencyCheckResult,
  ResumeState,
  SkillTaskInputs,
} from './before.ts';

export { runAfterPhase, readLastOutcome } from './after.ts';
export type {
  AfterPhaseResult,
  AfterPhaseMeta,
  CheckDef,
  CheckRunResult,
  FileDiff,
  TaskOutcome,
} from './after.ts';

export { diagnoseFailure } from './diagnose.ts';
export type {
  StructuredDiagnosis,
  DiagnosisHint,
  ErrorClass,
  CheckFailureDetail,
  DiagnoseOptions,
} from './diagnose.ts';

export { runCorrectionLoop } from './correct.ts';
export type {
  CorrectionLoopResult,
  CorrectionLoopOptions,
  CorrectionAttempt,
} from './correct.ts';

export { loadAncestorContext } from './context-propagation.ts';
export type {
  AncestorContext,
  AncestorSummary,
  SiblingOutcome,
} from './context-propagation.ts';

export { writeSummaryMd, readSummaryMd } from './summary.ts';
export type { SummaryInput } from './summary.ts';

export { buildEnrichedPrompt } from './prompt-builder.ts';
export type { EnrichedPromptOptions } from './prompt-builder.ts';

export { runAutoConvergePhase } from './auto-converge.ts';
export type { AutoConvergeResult } from './auto-converge.ts';

export { healChecks, isBrokenCommand, verifyHealedCheck } from './check-healer.ts';
export type { HealResult } from './check-healer.ts';

export type { RequiresCheckResult } from './before.ts';
