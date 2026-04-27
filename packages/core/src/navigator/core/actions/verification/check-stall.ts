/**
 * Check Stall Action
 * 
 * Detect stall conditions.
 */

import type { ActionHandler } from "../../types.ts";

export const checkStall: ActionHandler = async (snap) => {
  const { hasStalled } = await import("../../../../task/unit/helpers.ts");

  const before = snap.previousGaps.length;
  const after = snap.gaps.length;
  const actualResolved = before - after;

  if (
    actualResolved === 0 &&
    hasStalled([...snap.gaps], [...snap.previousGaps])
  ) {
    const newStallCount = snap.stallCount + 1;
    snap.taskContext?.logStall(snap.iteration, newStallCount);
    // Surface what's actually wedged so operators can act without spelunking.
    const sample = snap.gaps.slice(0, 3).map((g) => `  - ${g.id}: ${g.description}`).join("\n");
    const more = snap.gaps.length > 3 ? `  …and ${snap.gaps.length - 3} more` : "";
    console.log(
      `\n⚠️  Stalled — identical failure on consecutive attempts (${newStallCount}/3).`,
    );
    console.log(`   Failing gap(s):`);
    console.log(sample);
    if (more) console.log(more);

    if (newStallCount >= 3) {
      console.log(
        `\n❌ Repeat-failure detector: same gap(s) for 3 attempts in a row — AI cannot make progress alone.`,
      );
      console.log(
        `   This is usually a structural issue (broken check command, stale outputs:, missing tool, type drift in vendored code).`,
      );
      console.log(
        `   Inspect: converge inspect --task <taskId>   then patch TASK.md and resume.`,
      );
      return {
        action: "bail",
        success: false,
        reason: "Repeat-failure detector tripped (same gap on 3 attempts)",
        stallCount: newStallCount,
      };
    }

    console.log(`   Retrying... (attempt ${newStallCount + 1})`);
    return {
      action: "continue",
      stallCount: newStallCount,
      previousGaps: [...snap.gaps],
    };
  }

  const newStallCount = actualResolved > 0 ? 0 : snap.stallCount;
  return {
    action: "continue",
    stallCount: newStallCount,
    previousGaps: [...snap.gaps],
  };
};
