/**
 * Bail Blockers Action
 *
 * Bail on unresolvable blockers.
 */

import type { ActionHandler } from "../../types.ts";

export const bailBlockers: ActionHandler = async (snap) => {
  const blockers = snap.gaps.filter((g) => g.metadata?.gapKind === "blocker");
  if (blockers.length === 0) return { action: "continue" };

  console.log(
    `\n❌ Task cannot proceed: ${blockers.length} unresolvable blocker(s)`,
  );
  for (const b of blockers) {
    console.log(`  - ${b.description}`);
  }
  return {
    action: "bail",
    success: false,
    reason: `${blockers.length} unresolvable blockers`,
  };
};
