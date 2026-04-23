/**
 * Detect Gaps Action
 * 
 * Find gaps in the unit.
 */

import type { ActionHandler } from "../../types.ts";
import { getEventWriter } from "../helpers/event-logging.ts";

export const detectGaps: ActionHandler = async (snap) => {
  const { findGaps } = await import("../../../../task/unit/find-gaps.ts");
  const gaps = await findGaps(snap.unit);

  const eventWriter = getEventWriter();
  if (eventWriter) {
    for (const gap of gaps) {
      eventWriter.gapDetected(
        gap.id,
        gap.description,
        (gap.metadata?.gapKind as string) || gap.type,
      );
    }
  }

  snap.taskContext?.logGaps(snap.iteration, gaps, snap.gaps);
  return { action: "continue", gaps, previousGaps: [...snap.gaps] };
};
