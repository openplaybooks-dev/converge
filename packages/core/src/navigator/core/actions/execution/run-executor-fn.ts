/**
 * Run Executor Function Action
 * 
 * TaskExecutor.run() single shot.
 */

import type { ActionHandler } from "../../types.ts";

export const runExecutorFn: ActionHandler = async (snap) => {
  const { TaskExecutor } = await import("../../../../executor/task-executor.ts");
  const { resolveChecks } = await import("../../../../task/unit/resolve.ts");
  const unit = snap.unit;
  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const meta = {
    id: unit.id,
    title: unit.title,
    outputs: unit.outputs,
    checks: await resolveChecks(unit),
  };
  const executor = new TaskExecutor(snap.projectDir, jCtx, meta, unit);
  await executor.run(unit.executorFn!, snap.iteration);
  return { action: "continue", executionCount: snap.executionCount + 1 };
};
