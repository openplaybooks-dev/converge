/**
 * RFC 0031: Run Spawner Action — mode: spawner with unified task rows.
 *
 * The body's job is to append task rows via `converge task add`
 * (or the programmatic equivalent). No more spawn.yml files.
 *
 *   1. Pre-body: ensure exec dir exists.
 *   2. Run the body via skill/executor dispatcher, falling back to
 *      passthrough shell execution when the task has `passthrough: true`
 *      and no skill.
 *   3. Validate post-body contract.
 *   4. Return done.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
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
      bodyRan = await runPassthroughBody(snap, parsed);
    }
  }

  // Validate: if no body ran at all, that's a spawner violation.
  if (!bodyRan) {
    writeViolation(execDir, {
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

/**
 * Resolve the TASK.md path for a unit. Checks source_path, journal_path,
 * then falls back to unit.path (which may already be the full TASK.md path).
 */
function resolveTaskMdPath(unit: any): string | undefined {
  const sourcePath = unit.source_path;
  const journalPath = unit.journal_path;
  if (sourcePath && existsSync(sourcePath)) return sourcePath;
  if (journalPath && existsSync(journalPath)) return journalPath;
  if (unit.path) {
    if (existsSync(unit.path) && unit.path.endsWith("TASK.md")) {
      return unit.path;
    }
    const taskMdPath = join(unit.path, "TASK.md");
    if (existsSync(taskMdPath)) {
      return taskMdPath;
    }
  }
  return undefined;
}

/**
 * Execute a passthrough body: extract ```bash fence(s) from TASK.md and
 * run them as a single shell script. Mirrors the logic in task-run.ts.
 */
async function runPassthroughBody(
  snap: Parameters<ActionHandler>[0],
  parsed: { body?: string },
): Promise<boolean> {
  try {
    const body = parsed?.body ?? "";
    const commands = extractShellCommands(body);
    if (commands.length === 0) return false;

    console.log(
      `   ⚡ Passthrough (spawner): running ${commands.length} shell command(s) as single script`,
    );

    const envSetup =
      'export PATH="$(pwd)/node_modules/.bin:$PATH"\n' +
      'if [ -n "${CONVERGE_BIN:-}" ] && [ -f "$CONVERGE_BIN" ]; then\n' +
      '  converge() { node "$CONVERGE_BIN" "$@"; }\n' +
      '  export -f converge 2>/dev/null || true\n' +
      'fi\n';

    const script = envSetup + commands.join("\n");
    const bashShell = process.platform === "win32" ? "bash" : "/bin/bash";
    execSync(script, {
      cwd: snap.projectDir,
      stdio: "inherit",
      timeout: 120_000,
      shell: bashShell,
    });
    return true;
  } catch {
    return false;
  }
}

/** Extract shell commands from fenced ```bash / ```sh / ```shell blocks. */
function extractShellCommands(body: string): string[] {
  const commands: string[] = [];
  const fenceRegex = /```(?:bash|sh|shell)?\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(body)) !== null) {
    const raw = match[1].trim();
    if (raw.length > 0) commands.push(raw);
  }
  return commands;
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
