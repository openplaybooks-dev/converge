/**
 * Run Spawner Action — RFC 0022 `mode: spawner`.
 *
 * Drives the one-shot fan-out lifecycle:
 *
 *   1. Run the body via the existing skill/executor dispatcher.
 *   2. If the body wrote `$CONVERGE_TASK_DIR/spawn.plan.jsonl` and
 *      `spawn.apply === "auto"` (default), call `applyManifest` to
 *      ingest the rows and upsert them into the runtime ledger.
 *   3. Run the post-body validator (`validatePostBody`): if it reports
 *      a contract violation, write `mode-violation.json` and bail.
 *   4. Otherwise return `done`.
 *
 * This handler is the spawning surface for `mode: spawner` tasks.
 * It depends on three pieces:
 *
 *   - `applyManifest` (RFC 0021) — pure manifest ingest, idempotent.
 *   - `validatePostBody` (RFC 0022) — pure post-body invariant check.
 *   - `CONVERGE_TASK_DIR` env var — set by `run/index.ts` before body.
 *
 * The body itself runs through the standard execution chain (skill,
 * passthrough shell, executorFn). This handler runs *after* the body
 * returns; the dispatcher in `run-executor.ts` schedules this node
 * once the run-skill / run-executor-fn node has completed.
 */

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ActionHandler } from "../../types.ts";
import { runSkill } from "./run-skill.ts";

const MANIFEST_NAME = "spawn.plan.jsonl";
const VIOLATION_NAME = "mode-violation.json";

export const runSpawner: ActionHandler = async (snap, graph) => {
  const { applyManifest } = await import("../../../../task/spawn/index.ts");
  const { validatePostBody } = await import("../../../../task/mode/index.ts");
  const { readRuntimeLedgerState } = await import(
    "../../../../task/goal/runtime-ledger.ts"
  );

  const unit = snap.unit;
  const execDir = process.env.CONVERGE_TASK_DIR;
  if (!execDir) {
    // No exec dir → run/index.ts didn't set it. The validator's
    // expected-artefact paths would be nonsense, so abort cleanly.
    return {
      action: "bail",
      success: false,
      reason: "CONVERGE_TASK_DIR not set; run-spawner cannot validate",
    };
  }

  // Step 0: run the body via the skill/executor dispatcher. The body's
  // job is to write `$CONVERGE_TASK_DIR/spawn.plan.jsonl`; the framework
  // takes over from there.
  const { resolveSkill } = await import("../../../../task/unit/resolve.ts");
  if (resolveSkill(unit)) {
    const bodyResult = await runSkill(snap, graph);
    if (bodyResult.action === "bail") {
      return bodyResult;
    }
  }

  const manifestPath = join(execDir, MANIFEST_NAME);
  const apply = unit.spawn?.apply ?? "auto";

  // Step 1: framework-driven apply. Only triggered when the body wrote
  // a manifest AND apply is "auto". `applyManifest` is idempotent — a
  // re-run over an existing manifest+result file is a no-op for
  // already-applied rows.
  if (apply === "auto" && existsSync(manifestPath)) {
    try {
      await applyManifest({
        manifestPath,
        workspace: snap.projectDir,
      });
    } catch (err) {
      // Apply itself crashed (rare: I/O error, malformed JSONL the
      // schema couldn't decode). The validator below will surface
      // `spawner-apply-failed` when it reads the result file; if the
      // result file is missing entirely we still bail with the message.
      console.error(
        `[run-spawner] applyManifest crashed: ${(err as Error).message}`,
      );
    }
  }

  // Step 2: post-body validation. Count child rows in the ledger so the
  // validator can detect `leaf-has-children`-style violations.
  const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";
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
    { execDir, childCount },
  );

  if (!validation.ok) {
    writeViolation(execDir, validation, "spawner");
    return {
      action: "bail",
      success: false,
      reason: `mode-violation: ${validation.errorCode} — ${validation.message}`,
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
