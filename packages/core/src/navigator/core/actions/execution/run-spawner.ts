/**
 * RFC 0031: Run Spawner Action — mode: spawner with unified task rows.
 *
 * The body's job is to append task rows via `converge task add`
 * (or the programmatic equivalent). No more spawn.yml files.
 *
 *   1. Pre-body: ensure exec dir exists.
 *   2. Run the body via skill/executor dispatcher.
 *   3. Validate post-body contract.
 *   4. Return done.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ActionHandler } from "../../types.ts";
import { runSkill } from "./run-skill.ts";

const VIOLATION_NAME = "mode-violation.json";

export const runSpawner: ActionHandler = async (snap, graph) => {
  const { validatePostBody } = await import("../../../../task/mode/index.ts");
  const { readRuntimeLedgerState } = await import(
    "../../../../task/goal/runtime-ledger.ts"
  );

  const unit = snap.unit;
  const execDir = process.env.CONVERGE_TASK_DIR;
  if (!execDir) {
    return {
      action: "bail",
      success: false,
      reason: "CONVERGE_TASK_DIR not set; run-spawner cannot validate",
    };
  }

  // Ensure exec dir exists
  mkdirSync(execDir, { recursive: true });

  // Run the body via the skill/executor dispatcher.
  // The body appends task rows to tasks.jsonl via `converge task add`
  // (the RFC 0031 unified path — no spawn.yml files).
  const { resolveSkill } = await import("../../../../task/unit/resolve.ts");
  if (resolveSkill(unit)) {
    const bodyResult = await runSkill(snap, graph);
    if (bodyResult.action === "bail") {
      return bodyResult;
    }
  }

  const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";

  // Post-body validation: count child rows in the ledger.
  let childCount = 0;
  try {
    const state = readRuntimeLedgerState(snap.projectDir, playbookName);
    childCount = state.tasks.filter((t) => t.parent === unit.id).length;
  } catch {
    // Ledger read failure is non-fatal; validator works with 0 children.
  }

  const validation = validatePostBody(
    {
      taskId: unit.id,
      mode: "spawner",
      outputs: unit.outputs,
      spawn: unit.spawn,
    },
    { childCount, execDir },
  );

  if (validation) {
    writeViolation(execDir, validation, "spawner");
    return {
      action: "bail",
      success: false,
      reason: `spawner mode violation: ${validation.errorCode ?? validation.message ?? "unknown"}`,
    };
  }

  return { action: "done", success: true, reason: "spawner converged" };
};

function writeViolation(
  execDir: string,
  validation: {
    errorCode?: string;
    message?: string;
    fixHint?: string;
    expectedArtefacts?: string[];
    actualArtefacts?: string[];
  },
  declaredMode: string,
): void {
  try {
    const payload = {
      errorCode: validation.errorCode,
      declaredMode,
      message: validation.message,
      fixHint: validation.fixHint,
      expectedArtefacts: validation.expectedArtefacts,
      actualArtefacts: validation.actualArtefacts,
    };
    writeFileSync(
      join(execDir, VIOLATION_NAME),
      JSON.stringify(payload, null, 2),
      "utf-8",
    );
  } catch {
    // Best-effort — diagnostics don't gate the bail decision.
  }
}
