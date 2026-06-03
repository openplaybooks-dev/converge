/**
 * Verify Action
 *
 * Verify outputs and gaps.
 */

import { existsSync, statSync } from "node:fs";
import path from "node:path";
import type { ActionHandler } from "../../types.ts";
import { getEventWriter } from "../helpers/event-logging.ts";
import { loadLatestHumanReview } from "../../../../task/review.ts";

export const verify: ActionHandler = async (snap) => {
  const { findGaps } = await import("../../../../task/unit/find-gaps.ts");

  console.log("Verifying outputs...");

  // Refresh unit from disk if TASK.md was edited mid-convergence (e.g. the
  // AI agent fixed a broken check command). Without this, findGaps runs
  // against the in-memory unit captured at converge() entry, so check edits
  // never take effect and the repeat-failure detector trips on a check the
  // user already fixed.
  let unitForGaps = snap.unit;
  try {
    const taskMdPath = path.join(snap.unit.path, "TASK.md");
    if (existsSync(taskMdPath)) {
      const mtimeMs = statSync(taskMdPath).mtimeMs;
      const loadedAtMs = (snap.unit as any)._loadedAtMs ?? 0;
      if (mtimeMs > loadedAtMs) {
        const { Unit } = await import("../../../../task/unit/unit.ts");
        const fresh = await Unit.fromPath(taskMdPath, snap.unit.parent ?? undefined);
        // Preserve runtime-only fields the navigator/loop populated.
        (fresh as any).context = snap.unit.context;
        (fresh as any)._loadedAtMs = mtimeMs;
        unitForGaps = fresh;
      }
    }
  } catch (_) {
    // Best-effort refresh — fall back to the in-memory unit on any failure.
  }

  const postGaps = await findGaps(unitForGaps);

  const eventWriter = getEventWriter();
  if (eventWriter) {
    eventWriter.write({
      type: "validation_start" as any,
      level: "info",
      outputs: unitForGaps.outputs || [],
    });

    if (postGaps.length === 0) {
      eventWriter.write({
        type: "validation_result" as any,
        level: "info",
        output: unitForGaps.outputs?.join(", ") || "",
        exists: true,
        checks: (unitForGaps.outputs || []).map((o) => ({ id: o, passed: true })),
      });
    } else {
      eventWriter.write({
        type: "validation_result" as any,
        level: "warning",
        output: unitForGaps.outputs?.join(", ") || "",
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

    // Human-in-the-loop review gate (decoupled from `mode: gateway`).
    // Once outputs + checks are satisfied, if the task declares a
    // `handoff:` block, pause for human verdict before declaring done.
    // `approve` → pass. `revise`/`reject` → bail so the runner schedules
    // another attempt with the reviewer's feedback in context.
    const review = (unitForGaps as any).handoff;
    if (review) {
      const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";
      const latest = await loadLatestHumanReview(
        snap.projectDir,
        playbookName,
        unitForGaps.id,
      );
      if (!latest || latest.decision !== "approve") {
        const decision = latest?.decision ?? "pending";
        const reason =
          decision === "pending"
            ? "human-review-pending"
            : `human-review-${decision}: ${latest?.feedback ?? ""}`;
        return {
          action: "bail",
          success: false,
          reason,
          gaps: postGaps,
        };
      }
    }

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
