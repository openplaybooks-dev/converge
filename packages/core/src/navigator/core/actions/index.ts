/**
 * Navigator Actions Index
 *
 * Re-exports all action handlers and provides buildActionRegistry().
 */

import type { ActionHandler } from "../types.ts";

// Import all action handlers
import { checkSeedSeeded, checkOutputsExist } from "./preflight/index.ts";
import { detectGaps, signalDone } from "./core/index.ts";
import {
  resolvePlan,
  resolveSeed,
  resolveBlockers,
  bailBlockers,
} from "./resolution/index.ts";
import {
  runExecutor,
  runExecutorFn,
  runLoopFn,
  runChildren,
  runSkill,
} from "./execution/index.ts";
import {
  repairLoop,
  runStrategyHandler,
  strategySeedGeneratorRepair,
  strategySeedScriptRepair,
  strategyUserQuestionResume,
} from "./repair/index.ts";
import { verify, checkStall, advanceAttempt } from "./verification/index.ts";

// Re-export all handlers for direct access
export {
  checkSeedSeeded,
  checkOutputsExist,
  detectGaps,
  signalDone,
  resolvePlan,
  resolveSeed,
  resolveBlockers,
  bailBlockers,
  runExecutor,
  runExecutorFn,
  runLoopFn,
  runChildren,
  runSkill,
  repairLoop,
  runStrategyHandler,
  strategySeedGeneratorRepair,
  strategySeedScriptRepair,
  strategyUserQuestionResume,
  verify,
  checkStall,
  advanceAttempt,
};

// Re-export helpers
export * from "./helpers/index.ts";

/**
 * Build the action registry with all handlers
 */
export function buildActionRegistry(): Map<string, ActionHandler> {
  const registry = new Map<string, ActionHandler>();

  registry.set("check-seed-seeded", checkSeedSeeded);
  registry.set("check-outputs-exist", checkOutputsExist);
  registry.set("detect-gaps", detectGaps);
  registry.set("signal-done", signalDone);
  registry.set("resolve-plan", resolvePlan);
  registry.set("resolve-seed", resolveSeed);
  registry.set("resolve-blockers", resolveBlockers);
  registry.set("bail-blockers", bailBlockers);
  registry.set("run-executor", runExecutor);
  registry.set("run-executor-fn", runExecutorFn);
  registry.set("run-loop-fn", runLoopFn);
  registry.set("run-children", runChildren);
  registry.set("run-skill", runSkill);
  registry.set("repair-loop", repairLoop);
  registry.set("run-strategy", runStrategyHandler);
  registry.set("strategy-seed-generator-repair", strategySeedGeneratorRepair);
  registry.set("strategy-seed-script-repair", strategySeedScriptRepair);
  registry.set("strategy-user-question-resume", strategyUserQuestionResume);
  registry.set("verify", verify);
  registry.set("check-stall", checkStall);
  registry.set("advance-attempt", advanceAttempt);

  return registry;
}
