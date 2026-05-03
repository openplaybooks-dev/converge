/**
 * Resolve Plan Action
 * 
 * Execute plan configuration.
 */

import type { ActionHandler } from "../../types.ts";
import { getEventWriter, getExecutionLogger } from "../helpers/event-logging.ts";

export const resolvePlan: ActionHandler = async (snap) => {
  const { PlanExecutor } = await import("../../../../executor/plan-executor.ts");
  const { resolvePrompt, createTaskContext } =
    await import("../../../../task/unit/resolve.ts");

  const planGap = snap.gaps.find((g) => g.metadata?.gapKind === "plan");
  if (!planGap) return { action: "continue" };

  const unit = snap.unit;
  if (!unit.planConfig) return { action: "continue" };

  const eventWriter = getEventWriter();
  if (eventWriter) {
    eventWriter.gapDetected(planGap.id, planGap.description, "plan");
  }
  const executionLogger = getExecutionLogger();
  if (executionLogger && unit.id) {
    await executionLogger.logGapDetected(unit.id, "plan", planGap.description);
  }

  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const executor = new PlanExecutor(snap.projectDir, jCtx, {
    id: unit.id,
    title: unit.title,
    vars: unit.vars,
  });

  const fixStart = Date.now();

  if (!executor.alreadyPlanned()) {
    const ctx = createTaskContext(unit);
    const planPromptOverride =
      typeof unit.planConfig.prompt === "function"
        ? await unit.planConfig.prompt(ctx)
        : unit.planConfig.prompt;

    const outputPrompt =
      typeof unit.planConfig.outputPrompt === "function"
        ? await unit.planConfig.outputPrompt(ctx)
        : unit.planConfig.outputPrompt;

    const taskPrompt = await resolvePrompt(unit);
    const finalPrompt = executor.buildPlanningPrompt(
      taskPrompt,
      planPromptOverride,
      unit.planConfig.output,
      outputPrompt,
    );

    try {
      await executor.run(finalPrompt, unit.planConfig.output);
    } catch (err: any) {
      console.error(`[resolve-plan] Plan generation failed: ${err.message}`);
      return { action: "continue" };
    }
  }

  if (eventWriter) {
    eventWriter.write({
      type: "strategy_applied" as any,
      level: "info",
      gapId: planGap.id,
      strategy: "plan",
      duration: Date.now() - fixStart,
    });
  }

  return { action: "continue" };
};
