/**
 * Resolve Seed Action
 * 
 * Execute Seed function.
 */

import type { ActionHandler } from "../../types.ts";
import { getEventWriter } from "../helpers/event-logging.ts";

export const resolveSeed: ActionHandler = async (snap) => {
  const { SeedExecutor } = await import("../../../../executor/seed-executor.ts");
  const { findGaps } = await import("../../../../task/unit/find-gaps.ts");

  const unit = snap.unit;
  if (!unit.seedFn) return { action: "continue" };

  // Re-detect after plan may have been resolved
  const postPlanGaps = await findGaps(unit);
  const seedGap = postPlanGaps.find((g) => g.metadata?.gapKind === "seed");
  if (!seedGap) return { action: "continue", gaps: postPlanGaps };

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
      gapId: seedGap.id,
      strategy: "seed",
      duration: Date.now() - fixStart,
    });
  }

  // Zero spawns with keepLooping=false is an intentional stop (incremental seed complete).
  // Only treat zero spawns as an error when the seed didn't explicitly signal completion.
  const isIntentionalStop = result.spawnCount === 0 && result.keepLooping === false;
  if (result.error || (result.spawnCount === 0 && !isIntentionalStop)) {
    console.log("\n❌ Seed failed to seed tasks");
    return {
      action: "bail",
      success: false,
      reason: "Seed failed to seed tasks",
    };
  }

  console.log("\n✅ Seed seeded — child tasks will be picked up by the engine");
  return { action: "done", success: true, reason: "Seed seeded" };
};
