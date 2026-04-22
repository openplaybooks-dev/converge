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
    console.log(
      `\n⚠️  Stalled — no progress after fix attempt (${newStallCount}/3).`,
    );

    if (newStallCount >= 3) {
      console.log(`\n⚠️  Max stalls (3) reached. Giving up.`);
      return {
        action: "bail",
        success: false,
        reason: "Max stalls reached",
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
