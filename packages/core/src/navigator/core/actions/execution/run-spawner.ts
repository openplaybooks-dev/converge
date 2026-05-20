/**
 * Run Spawner Action — RFC 0022 `mode: spawner`, RFC 0024 invocation surface.
 *
 * Drives the one-shot fan-out lifecycle:
 *
 *   1. Pre-body: ensure `<execDir>/spawn/` exists, expose as
 *      `CONVERGE_SPAWN_DIR`.
 *   2. Run the body via the existing skill/executor dispatcher.
 *   3. If the body produced any `<id>/spawn.yml` files (RFC 0024),
 *      call `ingestSpawnDir` to preview→apply via template expansion.
 *      Otherwise — legacy — if the body wrote `spawn.plan.jsonl`,
 *      call `applyManifest`. The two paths are mutually exclusive.
 *   4. Run the post-body validator (`validatePostBody`): if it reports
 *      a contract violation, write `mode-violation.json` and bail.
 *   5. Otherwise return `done`.
 *
 * The body itself runs through the standard execution chain (skill,
 * passthrough shell, executorFn). This handler runs *after* the body
 * returns; the dispatcher in `run-executor.ts` schedules this node
 * once the run-skill / run-executor-fn node has completed.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
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

  // Pre-body setup: ensure `<execDir>/spawn/` exists and expose it via
  // `CONVERGE_SPAWN_DIR`. RFC 0024 bodies write `<id>/spawn.yml` files
  // here; the planning skill instructs the AI to use this env var (or
  // the cwd, once the executor honours it for spawner mode).
  const spawnDirEnvPath = join(execDir, "spawn");
  try {
    mkdirSync(spawnDirEnvPath, { recursive: true });
  } catch {
    // best-effort; absence will surface as "no rfc-0024 invocations" and
    // the legacy path takes over.
  }
  process.env.CONVERGE_SPAWN_DIR = spawnDirEnvPath;

  // Step 0: run the body via the skill/executor dispatcher. The body's
  // job is to write `<id>/spawn.yml` files in `$CONVERGE_SPAWN_DIR`
  // (RFC 0024) or — legacy — `$CONVERGE_TASK_DIR/spawn.plan.jsonl`.
  // The framework takes over from there.
  const { resolveSkill } = await import("../../../../task/unit/resolve.ts");
  if (resolveSkill(unit)) {
    const bodyResult = await runSkill(snap, graph);
    if (bodyResult.action === "bail") {
      return bodyResult;
    }
  }

  const manifestPath = join(execDir, MANIFEST_NAME);
  const spawnRoot = join(execDir, "spawn");
  const apply = unit.spawn?.apply ?? "auto";
  const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";

  // Step 1: framework-driven apply.
  //
  // RFC 0024 (preferred): if the body produced any `<id>/spawn.yml` files
  // under `<execDir>/spawn/`, run the new preview→apply pipeline. The
  // pipeline writes STATUS.md (AI-facing) and EVIDENCE.json (machine
  // readable) on its own.
  //
  // RFC 0021 (legacy): if no `spawn.yml` files exist but a top-level
  // `spawn.plan.jsonl` does, fall through to the original manifest
  // applier. This keeps unmigrated spawners working until they're
  // moved to the new surface.
  if (apply === "auto" && bodyProducedSpawnYml(spawnRoot)) {
    const { ingestSpawnDir } = await import("../../../../task/spawn/index.ts");
    const playbookDir = join(
      snap.projectDir,
      ".converge",
      "playbooks",
      playbookName,
    );
    try {
      await ingestSpawnDir({
        spawnRoot,
        workspace: snap.projectDir,
        playbookDir,
        playbook: playbookName,
      });
    } catch (err) {
      console.error(
        `[run-spawner] ingestSpawnDir crashed: ${(err as Error).message}`,
      );
    }
  } else if (apply === "auto" && existsSync(manifestPath)) {
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

/**
 * Detect whether the body wrote any `<id>/spawn.yml` files under the
 * spawn root. We don't parse — just check for existence one level deep,
 * skipping `_`-prefixed scratch directories. Cheap and side-effect free.
 */
function bodyProducedSpawnYml(spawnRoot: string): boolean {
  if (!existsSync(spawnRoot)) return false;
  let entries: string[];
  try {
    entries = readdirSync(spawnRoot);
  } catch {
    return false;
  }
  for (const name of entries) {
    if (name.startsWith("_")) continue;
    const childPath = join(spawnRoot, name);
    try {
      const st = statSync(childPath);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }
    if (existsSync(join(childPath, "spawn.yml"))) return true;
  }
  return false;
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
