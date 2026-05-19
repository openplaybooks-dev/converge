/**
 * Run Gateway Action — RFC 0022 `mode: gateway`.
 *
 * A gateway is a synchronisation point: it has no body, no outputs, and
 * exists only to give downstream tasks a single edge to depend on
 * instead of N. The runtime's job is to verify the invariants:
 *
 *   - No body content executed.
 *   - No `spawn.plan.jsonl` was written (gateways must not spawn).
 *   - No `outputs:` declared (cross-field rejected at parse time).
 *
 * Depends-on resolution happens at the DAG level before this action
 * fires — by the time we get here, all upstream tasks have completed.
 * The handler just runs the post-body validator and returns `done`.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ActionHandler } from "../../types.ts";

const VIOLATION_NAME = "mode-violation.json";

export const runGateway: ActionHandler = async (snap) => {
  const { validatePostBody } = await import("../../../../task/mode/index.ts");

  const unit = snap.unit;
  const execDir = process.env.CONVERGE_TASK_DIR;
  if (!execDir) {
    return {
      action: "bail",
      success: false,
      reason: "CONVERGE_TASK_DIR not set; run-gateway cannot validate",
    };
  }

  const validation = validatePostBody(
    {
      taskId: unit.id,
      mode: "gateway",
      outputs: unit.outputs,
    },
    { execDir, childCount: 0 },
  );

  if (!validation.ok) {
    try {
      writeFileSync(
        join(execDir, VIOLATION_NAME),
        JSON.stringify(
          {
            errorCode: validation.errorCode,
            declaredMode: "gateway",
            message: validation.message,
            fixHint: validation.fixHint,
            expectedArtefacts: validation.expectedArtefacts,
            actualArtefacts: validation.actualArtefacts,
          },
          null,
          2,
        ),
        "utf-8",
      );
    } catch {
      // Best-effort.
    }
    return {
      action: "bail",
      success: false,
      reason: `mode-violation: ${validation.errorCode} — ${validation.message}`,
    };
  }

  return { action: "done", success: true, reason: "gateway converged" };
};
