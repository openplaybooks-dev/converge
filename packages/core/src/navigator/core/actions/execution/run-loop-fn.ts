/**
 * Run Loop Function Action
 *
 * LoopFunctionExecutor.run().
 */

import type { ActionHandler } from "../../types.ts";

export const runLoopFn: ActionHandler = async (snap) => {
  const { LoopFunctionExecutor } =
    await import("../../../../executor/loop-executor.ts");
  const unit = snap.unit;
  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const executor = new LoopFunctionExecutor(snap.projectDir, jCtx);
  const maxIterations =
    (unit.vars?.maxLoopIterations as number | undefined) ??
    unit.config.maxIterations;
  await executor.run(unit.loopFn!, maxIterations);
  return { action: "continue", executionCount: snap.executionCount + 1 };
};
