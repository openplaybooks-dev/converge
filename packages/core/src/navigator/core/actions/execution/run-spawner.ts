/**
 * RFC 0031: Run Spawner Action — mode: spawner with unified task rows.
 *
 * The body's job is to append task rows via `converge spawn` (or the
 * programmatic equivalent via tasks.jsonl row appends). This handler:
 *
 *   1. Pre-body: set CONVERGE_TASK_DIR and ensure the exec dir exists.
 *   2. Run the body via skill/executor dispatcher, falling back to
 *      passthrough shell execution when the task has `passthrough: true`
 *      and no skill.
 *   3. Validate post-body contract (min/max children, manifest apply).
 *   4. Return done.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ActionHandler } from "../../types.ts";
import { runSkill } from "./run-skill.ts";
import { resolveTaskMdPath, runPassthroughBody } from "./passthrough.ts";
import { resolveSkill } from "../../../../task/unit/resolve.ts";
import { parseTaskMd } from "../../../../config/task-md-definition.ts";
import { validatePostBody } from "../../../../task/mode/index.ts";
import { readRuntimeLedgerState } from "../../../../task/goal/runtime-ledger.ts";
import { execDirFor } from "../../../../task/spawn/exec-dir.ts";

const VIOLATION_NAME = "mode-violation.json";

export const runSpawner: ActionHandler = async (snap, graph) => {
  const unit = snap.unit;
  const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";

  if (!process.env.CONVERGE_TASK_DIR) {
    return bailWith("CONVERGE_TASK_DIR not set; run-spawner cannot validate");
  }

  process.env.CONVERGE_TASK_DIR = join(
    snap.projectDir,
    execDirFor(playbookName, unit.id),
  );
  process.env.CONVERGE_SPAWN_DIR = join(process.env.CONVERGE_TASK_DIR, "spawn");
  mkdirSync(process.env.CONVERGE_TASK_DIR, { recursive: true });

  const bodyRan = await runSpawnerBody(snap, graph, unit);

  // A spawner with `min_children: 0` is intentionally a no-op
  // (incremental seeds); no body needed. Otherwise a missing body
  // means the spawner can't have produced any children, which is a
  // violation when the spawn declares a lower bound.
  const minChildren = unit.spawn?.min_children ?? 0;
  if (!bodyRan && minChildren > 0) {
    writeViolation(
      process.env.CONVERGE_TASK_DIR,
      {
        errorCode: "spawner-missing-manifest",
        message:
          "mode: spawner — no skill or passthrough body found to execute.",
        fixHint:
          "Declare a skill: or set passthrough: true with a ```bash block.",
        expectedArtefacts: ["skill or passthrough body"],
        actualArtefacts: [],
      },
      "spawner",
    );
    return bailWith("spawner-missing-manifest — no body to execute");
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
    { childCount, execDir: process.env.CONVERGE_TASK_DIR },
  );

  if (validation && !validation.ok) {
    writeViolation(process.env.CONVERGE_TASK_DIR, validation, "spawner");
    return bailWith(validation.errorCode ?? validation.message ?? "unknown");
  }

  return { action: "done", success: true, reason: "spawner converged" };
};

async function runSpawnerBody(
  snap: Parameters<ActionHandler>[0],
  graph: Parameters<ActionHandler>[1],
  unit: Parameters<ActionHandler>[0]["unit"],
): Promise<boolean> {
  // Skill-driven body — the documented norm.
  if (resolveSkill(unit)) {
    const result = await runSkill(snap, graph);
    return result.action !== "bail";
  }

  // Passthrough shell body — read from TASK.md directly because
  // `unit.passthrough` may be undefined for spawned tasks (the DAG
  // node's taskDef doesn't always carry it).
  const taskMdPath = resolveTaskMdPath(unit);
  if (!taskMdPath || !existsSync(taskMdPath)) return false;

  const parsed = await parseTaskMd(taskMdPath);
  const isPassthrough = unit.passthrough ?? parsed?.def?.passthrough ?? false;
  if (!isPassthrough) return false;
  return parsed ? await runPassthroughBody(snap, parsed, "spawner") : false;
}

function bailWith(reason: string): {
  action: "bail";
  success: false;
  reason: string;
} {
  return {
    action: "bail",
    success: false,
    reason: `spawner mode violation: ${reason}`,
  };
}

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
