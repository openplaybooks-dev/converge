/**
 * Resolve Blockers Action
 * 
 * Check and resolve blockers.
 */

import type { ActionHandler } from "../../types.ts";
import { getEventWriter, getSessionLogger } from "../helpers/event-logging.ts";

export const resolveBlockers: ActionHandler = async (snap) => {
  const { findGaps } = await import("../../../../task/unit/find-gaps.ts");
  const blockers = snap.gaps.filter((g) => g.metadata?.gapKind === "blocker");
  if (blockers.length === 0) return { action: "continue" };

  const eventWriter = getEventWriter();
  const sessionLogger = getSessionLogger();
  for (const b of blockers) {
    if (eventWriter) {
      eventWriter.gapDetected(
        b.id,
        b.description,
        (b.metadata?.gapKind as string) || "blocker",
      );
    }
    if (sessionLogger && snap.unit.id) {
      await sessionLogger.logGapDetected(
        snap.unit.id,
        (b.metadata?.gapKind as string) || "blocker",
        b.description,
      );
    }
  }

  // Re-check — blockers may have been resolved by upstream work (e.g. parent tasks)
  const stillBlocked = (await findGaps(snap.unit)).filter(
    (g) => g.metadata?.gapKind === "blocker",
  );

  if (stillBlocked.length > 0) {
    const label = snap.unit.wbsFn
      ? "WBS task cannot seed"
      : "Task cannot execute";
    console.log(
      `\n❌ ${label}: ${stillBlocked.length} blocker(s) still unresolved`,
    );
    for (const b of stillBlocked) {
      console.log(`  - ${b.description}`);
    }
    return {
      action: "bail",
      success: false,
      reason: `${stillBlocked.length} unresolvable blockers`,
    };
  }

  return { action: "continue" };
};
