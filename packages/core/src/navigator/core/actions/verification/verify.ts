/**
 * Verify Action
 * 
 * Verify outputs and gaps.
 */

import type { ActionHandler } from "../../types.ts";
import { getEventWriter } from "../helpers/event-logging.ts";

export const verify: ActionHandler = async (snap) => {
  const { findGaps } = await import("../../../../task/unit/find-gaps.ts");

  console.log("Verifying outputs...");
  const postGaps = await findGaps(snap.unit);

  const eventWriter = getEventWriter();
  if (eventWriter) {
    eventWriter.write({
      type: "validation_start" as any,
      level: "info",
      outputs: snap.unit.outputs || [],
    });

    if (postGaps.length === 0) {
      eventWriter.write({
        type: "validation_result" as any,
        level: "info",
        output: snap.unit.outputs?.join(", ") || "",
        exists: true,
        checks: (snap.unit.outputs || []).map((o) => ({ id: o, passed: true })),
      });
    } else {
      eventWriter.write({
        type: "validation_result" as any,
        level: "warning",
        output: snap.unit.outputs?.join(", ") || "",
        exists: false,
        checks: postGaps.map((g) => ({
          id: g.id,
          passed: false,
          error: g.description,
        })),
      });
    }
  }

  if (postGaps.length === 0) {
    console.log("✅ All gaps resolved");
    return {
      action: "done",
      success: true,
      reason: "All gaps resolved",
      gaps: postGaps,
    };
  }

  const before = snap.gaps.length;
  const resolved = before - postGaps.length;
  if (resolved >= 0) {
    console.log(`Verified: ${resolved}/${before} gap(s) resolved`);
  } else {
    console.log(
      `Verified: 0/${before} gap(s) resolved (${postGaps.length - before} new gap(s) found)`,
    );
  }

  return { action: "continue", gaps: postGaps };
};
