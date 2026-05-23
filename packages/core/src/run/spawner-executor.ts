/**
 * RFC 0031: Direct spawner execution — bypasses the convergence loop.
 *
 * Spawner tasks don't need AI-driven iteration. Their body is either a
 * skill call or a passthrough shell script. This module runs the body
 * directly, validates the post-body contract (children were spawned),
 * and returns success/failure.
 *
 * Flow:
 *   1. Resolve task body (skill or passthrough)
 *   2. Execute body
 *   3. Validate post-body (child count from ledger)
 *   4. Return success/failure
 */

import { existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import type { Unit } from "../task/unit/unit.ts";
import type { TaskEventWriter } from "../journal/event-writer.ts";
import { validatePostBody } from "../task/mode/validator.ts";
import { readRuntimeLedgerState } from "../task/goal/runtime-ledger.ts";
import { resolveSkill } from "../task/unit/resolve.ts";
import { parseTaskMd } from "../config/task-md-definition.ts";
import { runSkill } from "../navigator/core/actions/execution/run-skill.ts";
import { buildTaskEnv } from "./task-env.ts";

/** Result of spawner execution */
export interface SpawnerResult {
  success: boolean;
  reason: string;
  childCount: number;
}

/**
 * Execute a spawner task directly, bypassing the convergence loop.
 *
 * @param unit The task unit to execute
 * @param projectDir Absolute path to the project root
 * @param playbookName Name of the current playbook
 * @param eventWriter Optional event writer for logging
 * @returns SpawnerResult with success/failure and child count
 */
export async function executeSpawner(
  unit: Unit,
  projectDir: string,
  playbookName: string,
  eventWriter?: TaskEventWriter | null,
): Promise<SpawnerResult> {
  // Resolve TASK.md path
  const taskMdPath = resolveTaskMdPath(unit);
  if (!taskMdPath) {
    return {
      success: false,
      reason: `TASK.md not found for spawner task "${unit.id}"`,
      childCount: 0,
    };
  }

  // Ensure exec dir exists
  const execDir = process.env.CONVERGE_TASK_DIR;
  if (!execDir) {
    return {
      success: false,
      reason: "CONVERGE_TASK_DIR not set; spawner cannot validate",
      childCount: 0,
    };
  }
  mkdirSync(execDir, { recursive: true });

  console.log(
    `   🎬 Spawner: executing body for "${unit.title || unit.id}"`,
  );

  // Execute body
  let bodyRan = false;
  let bodySuccess = true;
  let bodyReason = "";

  if (resolveSkill(unit)) {
    console.log(`   🎯 Running skill for spawner task`);
    try {
      // Build a minimal snapshot for runSkill
      const snap = {
        unit,
        gaps: [],
        iteration: 1,
        previousGaps: [],
        stallCount: 0,
        executionCount: 0,
        projectDir,
        epicId: playbookName,
        taskContext: null as any,
      };
      const graph = {
        addNode: () => {},
        getNodesByHandler: () => [],
      } as any;
      const result = await runSkill(snap, graph);
      bodyRan = true;
      if (result.action === "bail") {
        bodySuccess = false;
        bodyReason = result.reason || "Skill execution failed";
      }
    } catch (err: any) {
      bodySuccess = false;
      bodyReason = err.message;
    }
  } else {
    // Try passthrough body
    const taskEnv = buildTaskEnv(process.env, {
      currentTaskPath: `.converge/journal/${playbookName}/tasks/${unit.id}`,
      workerId: process.env.CONVERGE_WORKER_ID,
      taskDir: process.env.CONVERGE_TASK_DIR,
      taskWave: process.env.CONVERGE_TASK_WAVE,
      taskWaveSource: process.env.CONVERGE_TASK_WAVE_SOURCE,
      attemptDir: process.env.CONVERGE_TASK_ATTEMPT_DIR,
      attempt: process.env.CONVERGE_TASK_ATTEMPT,
      vars: unit.vars,
    });
    bodyRan = await runPassthroughBody(unit, taskMdPath, projectDir, taskEnv);
    if (!bodyRan) {
      return {
        success: false,
        reason: `Spawner task "${unit.id}" has no skill and no passthrough body to execute`,
        childCount: 0,
      };
    }
  }

  if (!bodyRan || !bodySuccess) {
    return {
      success: false,
      reason: `Spawner body failed: ${bodyReason}`,
      childCount: 0,
    };
  }

  // Post-body validation: count child rows in the ledger
  let childCount = 0;
  try {
    const state = readRuntimeLedgerState(projectDir, playbookName);
    childCount = state.tasks.filter((t) => t.parent === unit.id).length;
  } catch {
    // Ledger read failure — validator works with 0 children
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

  if (!validation.ok) {
    return {
      success: false,
      reason: `Spawner validation failed: ${validation.errorCode ?? validation.message ?? "unknown"}`,
      childCount,
    };
  }

  console.log(
    `   ✅ Spawner: body executed, ${childCount} child(ren) registered`,
  );

  return {
    success: true,
    reason: `Spawner converged: ${childCount} child(ren) spawned`,
    childCount,
  };
}

/**
 * Resolve the TASK.md path for a unit.
 * unit.path may be a directory or a full file path.
 */
function resolveTaskMdPath(unit: Unit): string | undefined {
  const unitPath = (unit as any).path;
  if (!unitPath) return undefined;

  if (existsSync(unitPath)) {
    if (unitPath.endsWith("TASK.md")) return unitPath;
    const candidate = join(unitPath, "TASK.md");
    if (existsSync(candidate)) return candidate;
  }

  // Fallback: try parent directory
  const dir = dirname(unitPath);
  if (existsSync(dir)) {
    const candidate = join(dir, "TASK.md");
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}

/**
 * Execute a passthrough body: extract ```bash fence(s) from TASK.md
 * and run them as a single shell script.
 */
export async function runPassthroughBody(
  unit: Unit,
  taskMdPath: string,
  projectDir: string,
  taskEnv: NodeJS.ProcessEnv,
): Promise<boolean> {
  try {
    const parsed = await parseTaskMd(taskMdPath);
    const isPassthrough =
      unit.passthrough ?? parsed?.def?.passthrough ?? false;
    if (!isPassthrough) return false;

    const body = parsed?.body ?? "";
    const commands = extractShellCommands(body);
    if (commands.length === 0) return false;

    console.log(
      `   ⚡ Passthrough (spawner): running ${commands.length} shell command(s)`,
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
      cwd: projectDir,
      stdio: "inherit",
      timeout: 120_000,
      shell: bashShell,
      env: taskEnv,
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
