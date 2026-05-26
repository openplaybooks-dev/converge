/**
 * RFC 0031: Run Spawner Action — mode: spawner with unified task rows.
 *
 * The body's job is to append task rows via `converge spawn`
 * (or the programmatic equivalent via tasks.jsonl row appends).
 *
 *   1. Pre-body: ensure exec dir exists.
 *   2. Run the body via skill/executor dispatcher, falling back to
 *      passthrough shell execution when the task has `passthrough: true`
 *      and no skill.
 *   3. Validate post-body contract.
 *   4. Return done.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ActionHandler } from "../../types.ts";
import { runSkill } from "./run-skill.ts";
import { resolveTaskMdPath, runPassthroughBody } from "./passthrough.ts";

const VIOLATION_NAME = "mode-violation.json";

export const runSpawner: ActionHandler = async (snap, graph) => {
  const { validatePostBody } = await import("../../../../task/mode/index.ts");
  const { readRuntimeLedgerState } = await import(
    "../../../../task/goal/runtime-ledger.ts"
  );
  const { execDirFor } = await import("../../../../task/spawn/exec-dir.ts");

  const unit = snap.unit;
  const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";

  // RFC 0021 — set CONVERGE_TASK_DIR before body runs
  // This is normally done in execute-task.ts, but run-spawner runs as an
  // action handler in the convergence loop, not through execute-task.ts
  const execDir = execDirFor(playbookName, unit.id);
  process.env.CONVERGE_TASK_DIR = join(snap.projectDir, execDir);
  // Also set CONVERGE_SPAWN_DIR (defaults to taskDir/spawn)
  process.env.CONVERGE_SPAWN_DIR = join(process.env.CONVERGE_TASK_DIR, "spawn");
  if (!process.env.CONVERGE_TASK_DIR) {
    return {
      action: "bail",
      success: false,
      reason: "CONVERGE_TASK_DIR not set; run-spawner cannot validate",
    };
  }

  // Ensure exec dir exists
  mkdirSync(process.env.CONVERGE_TASK_DIR, { recursive: true });

  // Run the body via skill/executor dispatcher, falling back to passthrough
  // shell execution when the task has `passthrough: true` and no skill.
  // For spawned tasks, `unit.passthrough` may be undefined because the unit
  // was constructed from the DAG node's taskDef (which lacks passthrough),
  // so we also check the TASK.md file directly.
  const { resolveSkill } = await import("../../../../task/unit/resolve.ts");
  const { parseTaskMd } = await import("../../../../config/task-md-definition.ts");

  // Resolve the TASK.md path: inventory for spawned, source for static.
  const taskMdPath = resolveTaskMdPath(unit);

  let bodyRan = false;

  if (resolveSkill(unit)) {
    const bodyResult = await runSkill(snap, graph);
    if (bodyResult.action === "bail") {
      return bodyResult;
    }
    bodyRan = true;
  } else if (taskMdPath && existsSync(taskMdPath)) {
    const parsed = await parseTaskMd(taskMdPath);
    const isPassthrough = unit.passthrough ?? parsed?.def?.passthrough ?? false;
    if (isPassthrough) {
      bodyRan = parsed ? await runPassthroughBody(snap, parsed, "spawner") : false;
    }
  }

  // Validate: if no body ran at all, that's a spawner violation.
  if (!bodyRan) {
    writeViolation(process.env.CONVERGE_TASK_DIR!, {
      errorCode: "spawner-missing-manifest",
      message:
        "mode: spawner — no skill or passthrough body found to execute.",
      fixHint:
        "Declare a skill: or set passthrough: true with a ```bash block.",
      expectedArtefacts: ["skill or passthrough body"],
      actualArtefacts: [],
    }, "spawner");
    return {
      action: "bail",
      success: false,
      reason: "spawner mode violation: no body to execute",
    };
  }

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
    { childCount, execDir: process.env.CONVERGE_TASK_DIR! },
  );

  if (validation) {
    writeViolation(process.env.CONVERGE_TASK_DIR!, validation, "spawner");
    return {
      action: "bail",
      success: false,
      reason: `spawner mode violation: ${validation.errorCode ?? validation.message ?? "unknown"}`,
    };
  }

  return { action: "done", success: true, reason: "spawner converged" };
};

// resolveTaskMdPath, runPassthroughBody, extractShellCommands
// are imported from ./passthrough.ts (shared with run-converger.ts)

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
