/**
 * Resolve WBS Action
 * 
 * Execute WBS function.
 */

import type { ActionHandler } from "../../types.ts";
import { getEventWriter } from "../helpers/event-logging.ts";

export const resolveWbs: ActionHandler = async (snap) => {
  const { SeedExecutor } = await import("../../../../executor/seed-executor.ts");
  const { findGaps } = await import("../../../../task/unit/find-gaps.ts");

  const unit = snap.unit;
  if (!unit.seedFn) return { action: "continue" };

  // Re-detect after plan may have been resolved
  const postPlanGaps = await findGaps(unit);
  const wbsGap = postPlanGaps.find((g) => g.metadata?.gapKind === "wbs");
  if (!wbsGap) return { action: "continue", gaps: postPlanGaps };

  const jCtx = { epicId: snap.epicId, taskId: unit.id };
  const executor = new SeedExecutor(snap.projectDir, jCtx, unit.path, {
    id: unit.id,
    title: unit.title,
    vars: unit.vars,
  });

  const fixStart = Date.now();
  const result = await executor.run(unit.seedFn, 1);

  const eventWriter = getEventWriter();
  if (eventWriter) {
    eventWriter.write({
      type: "strategy_applied" as any,
      level: "info",
      gapId: wbsGap.id,
      strategy: "wbs",
      duration: Date.now() - fixStart,
    });
  }

  if (result.error || result.spawnCount === 0) {
    console.log("\n❌ WBS failed to seed tasks");
    return {
      action: "bail",
      success: false,
      reason: "WBS failed to seed tasks",
    };
  }

  console.log("\n✅ WBS seeded — child tasks will be picked up by the engine");
  return { action: "done", success: true, reason: "WBS seeded" };
};
