/**
 * Check Outputs Exist Action
 * 
 * Skip if outputs already present.
 */

import type { ActionHandler } from "../../types.ts";
import { getEventWriter } from "../helpers/event-logging.ts";

export const checkOutputsExist: ActionHandler = async (snap) => {
  const unit = snap.unit;
  if ((unit.outputs?.length ?? 0) === 0) return { action: "continue" };

  const { existsSync } = await import("node:fs");
  const { join } = await import("node:path");

  const attemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
  const hasLearnMd = attemptDir
    ? existsSync(join(attemptDir, "LEARN.md"))
    : false;
  const attemptNumber = parseInt(process.env.CONVERGE_TASK_ATTEMPT || "1", 10);

  if (hasLearnMd || attemptNumber <= 1) return { action: "continue" };

  const { findGaps } = await import("../../../../task/unit/find-gaps.ts");
  const preflightGaps = await findGaps(unit);
  const actionableGaps = preflightGaps.filter(
    (g) =>
      g.metadata?.gapKind === "output" ||
      g.metadata?.gapKind === "corrupted" ||
      g.metadata?.gapKind === "check",
  );

  if (actionableGaps.length === 0) {
    console.log(
      "\n✅ Pre-flight: all outputs already present — skipping execution (task was already complete)",
    );
    const eventWriter = getEventWriter();
    if (eventWriter) {
      eventWriter.aiReasoning(
        "Pre-flight check: outputs already exist, skipping execution",
        {
          taskId: unit.id,
          outputCount: unit.outputs?.length ?? 0,
        },
      );
    }
    return { action: "done", success: true, reason: "Outputs already present" };
  }

  return { action: "continue" };
};
