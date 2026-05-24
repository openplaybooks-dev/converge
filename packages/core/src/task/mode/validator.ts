/**
 * RFC 0022 — Post-body mode validator.
 *
 * Runs immediately after the task body returns and before the task's
 * declared `checks:` run. A violation short-circuits the check phase and
 * writes a structured error the repair loop can address.
 *
 * Pure I/O against `$CONVERGE_TASK_DIR`. No subprocess, no body
 * execution, no ledger reads. Caller passes a `childCount` accessor so
 * the leaf-has-children invariant can be checked without coupling this
 * module to runtime-ledger.
 *
 * The error codes are the addressable surface for the repair agent —
 * one violation, one code, one fix hint. The repair-loop prompt template
 * keys off this taxonomy.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import type { SpawnerConfig, ConvergerConfig, TaskMode } from "./schema.ts";

/**
 * Closed taxonomy of mode violations. Adding a new code requires:
 *   1. A corresponding fix-hint string (caller's responsibility — usually
 *      derived from the violation's nature, not hard-coded here).
 *   2. A repair-loop branch that maps the code to an agent prompt.
 *
 * Resist adding codes for distinctions the repair loop can't act on —
 * "spawner with one row that has the wrong template" is just
 * `spawner-apply-failed` with `errorCode: "template-not-found"` inside
 * the result file. The mode-level codes are about which *mode contract*
 * was broken; per-row diagnostics live in spawn.plan.result.jsonl.
 */
export type ModeErrorCode =
  | "leaf-spawned"
  | "leaf-has-children"
  | "spawner-missing-manifest"
  | "spawner-empty-manifest"
  | "spawner-row-count"
  | "spawner-apply-failed"
  | "converger-no-halt-signal"
  | "converger-max-waves"
  | "gateway-has-body"
  | "gateway-spawned";

/**
 * The minimal slice of the parsed task definition the validator reads.
 * Callers project their richer task representation down to this shape
 * before invoking; the validator does not depend on TaskMdDef directly.
 */
export interface TaskModeView {
  taskId: string;
  mode: TaskMode;
  outputs?: string[];
  spawn?: SpawnerConfig;
  converge?: ConvergerConfig;
}

export interface ValidatorContext {
  /** Absolute path to $CONVERGE_TASK_DIR. */
  execDir: string;
  /** How many ledger rows currently list this task as parent. Caller
   *  computes this from tasks.jsonl — the validator stays I/O-free
   *  on the ledger so it remains unit-testable. */
  childCount: number;
}

export interface ModeValidation {
  ok: boolean;
  errorCode?: ModeErrorCode;
  message?: string;
  /** Addressable fix hint for the repair loop. References the offending
   *  artefact (path, field name) so the AI's edit is single-step. */
  fixHint?: string;
  /** Paths the validator expected to find but didn't (or vice-versa). */
  expectedArtefacts?: string[];
  actualArtefacts?: string[];
}

const MANIFEST_NAME = "spawn.plan.jsonl";
const RESULT_NAME = "spawn.plan.result.jsonl";
const SPAWN_DIR_NAME = "spawn";

/**
 * Count child directories under `<execDir>/spawn/` (single level deep,
 * skip `_`-prefix scratch). Used as a heuristic to detect whether the
 * body produced spawn invocations via `converge spawn` or direct
 * tasks.jsonl row appends.
 */
function countSpawnDirChildren(execDir: string): number {
  const spawnRoot = join(execDir, SPAWN_DIR_NAME);
  if (!existsSync(spawnRoot)) return 0;
  let entries: string[];
  try {
    entries = readdirSync(spawnRoot);
  } catch {
    return 0;
  }
  let n = 0;
  for (const name of entries) {
    if (name.startsWith("_")) continue;
    const childPath = join(spawnRoot, name);
    try {
      const st = statSync(childPath);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }
    n++;
  }
  return n;
}

/**
 * Count manifest rows. Tolerates `//` comments and blank lines, mirroring
 * `parseManifestText` so authors can structure the manifest the same way
 * they write it.
 *
 * Does **not** schema-validate rows — the validator's job is to confirm
 * a manifest *exists with rows*, not that those rows are well-formed.
 * The `converge apply` step (RFC 0021) owns row-level validation and
 * writes per-row failures to the result file, which the validator reads
 * via `spawner-apply-failed`.
 */
function countManifestRows(manifestPath: string): number {
  if (!existsSync(manifestPath)) return -1;
  const text = readFileSync(manifestPath, "utf-8");
  let count = 0;
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith("//")) continue;
    count++;
  }
  return count;
}

/**
 * Check whether the apply result file reports any row with ok:false.
 * Returns:
 *   -  null  → file absent (caller decides if that's a problem).
 *   - "ok"   → file present, every row ok:true.
 *   - "fail" → file present, at least one ok:false (or unparseable).
 */
function readApplyResult(resultPath: string): "ok" | "fail" | null {
  if (!existsSync(resultPath)) return null;
  const text = readFileSync(resultPath, "utf-8");
  let sawAny = false;
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    sawAny = true;
    // Cheap, deterministic — match what scripts/spawn-results-clean.sh
    // does. A row that fails to JSON-parse is treated as a fail so a
    // corrupt result file cannot silently pass.
    try {
      const parsed = JSON.parse(trimmed) as { ok?: unknown };
      if (parsed.ok !== true) return "fail";
    } catch {
      return "fail";
    }
  }
  return sawAny ? "ok" : "fail";
}

/**
 * The mode contract check. Dispatches per-mode and returns the first
 * violation it finds — early-exit semantics so the repair-loop hint is
 * single-issue and addressable.
 */
export function validatePostBody(
  task: TaskModeView,
  ctx: ValidatorContext,
): ModeValidation {
  const manifestPath = join(ctx.execDir, MANIFEST_NAME);
  const resultPath = join(ctx.execDir, RESULT_NAME);
  const manifestExists = existsSync(manifestPath);

  switch (task.mode) {
    case "leaf":
      return validateLeaf(task, ctx, manifestPath, manifestExists);
    case "spawner":
      return validateSpawner(
        task,
        ctx,
        manifestPath,
        resultPath,
        manifestExists,
      );
    case "converger":
      return validateConverger(task, manifestExists, resultPath);
    case "gateway":
      return validateGateway(task, manifestPath, manifestExists);
  }
}

function validateLeaf(
  task: TaskModeView,
  ctx: ValidatorContext,
  manifestPath: string,
  manifestExists: boolean,
): ModeValidation {
  if (manifestExists) {
    return {
      ok: false,
      errorCode: "leaf-spawned",
      message: `mode: leaf declared but body produced spawn manifest at ${manifestPath}.`,
      fixHint:
        "Either change mode: to spawner (and add a spawn: block), or delete the manifest write from the body.",
      expectedArtefacts: [],
      actualArtefacts: [manifestPath],
    };
  }
  if (ctx.childCount > 0) {
    return {
      ok: false,
      errorCode: "leaf-has-children",
      message: `mode: leaf declared but ${ctx.childCount} task(s) list this as their parent.`,
      fixHint:
        "Either change mode: to spawner (and write a spawn.plan.jsonl manifest), or stop spawning children from this task body.",
    };
  }
  return { ok: true };
}

function validateSpawner(
  task: TaskModeView,
  ctx: ValidatorContext,
  manifestPath: string,
  resultPath: string,
  manifestExists: boolean,
): ModeValidation {
  // The schema fills defaults; if for some reason a caller bypassed it,
  // synthesise defaults locally so we don't crash on missing config.
  const cfg: SpawnerConfig = task.spawn ?? {
    min_children: 0,
    max_children: 1000,
    apply: "auto",
  };

  // Count child directories under `<execDir>/spawn/` as evidence that
  // the body invoked the spawn contract (via `converge spawn` CLI or
  // direct tasks.jsonl row appends). The pipeline that applied them
  // owns per-row error reporting. The validator only asks: did the body
  // produce *any* invocation evidence at all?
  const spawnDirCount = countSpawnDirChildren(ctx.execDir);

  // `converge spawn` CLI registers children in the ledger directly,
  // bypassing the manifest surface. The `childCount` ctx already
  // captures that path. Treat it as a valid spawner outcome too — the
  // validator's contract is "mode: spawner produced children," not "the
  // body used a specific authoring surface."
  const hasAnyInvocation =
    manifestExists || spawnDirCount > 0 || ctx.childCount > 0;

  if (!hasAnyInvocation) {
    return {
      ok: false,
      errorCode: "spawner-missing-manifest",
      message:
        "mode: spawner declared but no spawn invocations were found under $CONVERGE_TASK_DIR (no children via `converge spawn` and no `spawn.plan.jsonl`).",
      fixHint: `Use \`converge spawn\` to register children, or append rows directly to tasks.jsonl. Legacy: write a JSONL manifest at ${manifestPath}.`,
      expectedArtefacts: [join(ctx.execDir, SPAWN_DIR_NAME), manifestPath],
      actualArtefacts: [],
    };
  }

  // When the body used `converge spawn` (childCount path) or spawn dir
  // children and didn't also write the legacy manifest, there's no
  // row-count contract to enforce here — the imperative path enforces
  // its own min/max constraints.
  if (!manifestExists) return { ok: true };

  const rowCount = countManifestRows(manifestPath);

  if (rowCount === 0) {
    if (cfg.min_children > 0) {
      return {
        ok: false,
        errorCode: "spawner-empty-manifest",
        message: `mode: spawner produced a manifest with 0 rows, min_children: ${cfg.min_children}.`,
        fixHint:
          "Add at least one row to spawn.plan.jsonl, or set spawn.min_children to 0 if an empty fan-out is intentional.",
      };
    }
    // min_children == 0 + zero rows is an intentional no-op spawner.
    return { ok: true };
  }

  if (rowCount < cfg.min_children) {
    return {
      ok: false,
      errorCode: "spawner-row-count",
      message: `mode: spawner manifest has ${rowCount} row(s); min_children: ${cfg.min_children}.`,
      fixHint: `Add at least ${cfg.min_children - rowCount} more row(s) to spawn.plan.jsonl, or lower min_children.`,
    };
  }
  if (rowCount > cfg.max_children) {
    return {
      ok: false,
      errorCode: "spawner-row-count",
      message: `mode: spawner manifest has ${rowCount} row(s); max_children: ${cfg.max_children}.`,
      fixHint: `Remove ${rowCount - cfg.max_children} row(s) from spawn.plan.jsonl, or raise max_children.`,
    };
  }

  // apply:manual hands off result-file ownership to the body. The
  // validator can't safely assert the result file's shape because the
  // body may still be in the middle of multi-stage apply.
  if (cfg.apply === "manual") return { ok: true };

  const applyOutcome = readApplyResult(resultPath);
  if (applyOutcome === "fail") {
    return {
      ok: false,
      errorCode: "spawner-apply-failed",
      message:
        "mode: spawner manifest applied but at least one row failed (see spawn.plan.result.jsonl).",
      fixHint:
        "Read spawn.plan.result.jsonl for per-row errorCode and patch the offending rows in spawn.plan.jsonl, then re-run converge apply.",
      expectedArtefacts: [resultPath],
      actualArtefacts: [resultPath],
    };
  }
  // applyOutcome === null means the framework hasn't run apply yet —
  // executor wiring (Phase 1) drives that; the validator only flags
  // explicit failures. applyOutcome === "ok" passes through.
  return { ok: true };
}

function validateConverger(
  task: TaskModeView,
  manifestExists: boolean,
  resultPath: string,
): ModeValidation {
  // Convergers may write a per-wave manifest. If they did, the same
  // apply-result invariant as spawner applies: any ok:false is a
  // failure surfaced under spawner-apply-failed (the failure class
  // is the same — manifest contracts don't differ by mode).
  if (manifestExists) {
    const applyOutcome = readApplyResult(resultPath);
    if (applyOutcome === "fail") {
      return {
        ok: false,
        errorCode: "spawner-apply-failed",
        message:
          "mode: converger wave wrote a manifest but apply reported per-row failures.",
        fixHint:
          "Read spawn.plan.result.jsonl for per-row errorCode and patch the offending rows; the wave will re-run.",
        expectedArtefacts: [resultPath],
        actualArtefacts: [resultPath],
      };
    }
  }
  // Halt-signal validation (max_waves, halt.marker, halt_when, wave_check)
  // is owned by `mode/converger.ts` — those decisions happen at the wave
  // boundary, not at post-body. validatePostBody only flags wave-internal
  // contract violations (manifest result row failures).
  void task;
  return { ok: true };
}

function validateGateway(
  task: TaskModeView,
  manifestPath: string,
  manifestExists: boolean,
): ModeValidation {
  void task;
  if (manifestExists) {
    return {
      ok: false,
      errorCode: "gateway-spawned",
      message: `mode: gateway is a sync point but a spawn manifest was written at ${manifestPath}.`,
      fixHint:
        "Either delete the manifest write from the body, or change mode: to spawner (gateways must remain bodyless).",
      expectedArtefacts: [],
      actualArtefacts: [manifestPath],
    };
  }
  return { ok: true };
}
