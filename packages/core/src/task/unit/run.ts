/**
 * Convergence loop — the run() method body.
 *
 * Delegates all decision logic to the graph-driven navigator.
 * The navigator executes one action per pass, persisting the graph
 * to disk as a crash-safe checkpoint between each action.
 */

import type { Unit } from "./unit.ts";
import { getProjectRoot, getEpicId } from "./helpers.ts";
import type { TaskEventWriter } from "../../journal/event-writer.ts";
import { converge } from "../../navigator/core/navigator.ts";
import { buildActionRegistry } from "../../navigator/core/actions/index.ts";
import { TaskContext } from "../../navigator/core/task-context.ts";

/**
 * Get event writer from global context (if running under task-runner)
 */
function getEventWriter(): TaskEventWriter | null {
  return (global as any).__CONVERGE_EVENT_WRITER__ || null;
}

/**
 * Universal run method - same for all levels.
 * Convergence loop: navigator picks one action at a time until done/bail/max-actions.
 *
 * Returns true on success. Returns false on failure — and stamps a global
 * marker if the failure was specifically a repeat-failure-stall (so the
 * outer scheduler can short-circuit further attempts on the same task).
 */
export async function run(unit: Unit): Promise<boolean> {
  const eventWriter = getEventWriter();
  const taskTitle = unit.title || unit.id || "Unit";

  // Log AI reasoning about task execution
  if (eventWriter) {
    eventWriter.aiReasoning(
      `Starting convergence loop for task: ${taskTitle}`,
      {
        taskId: unit.id,
        maxIterations: unit.config.maxIterations,
        mode: unit.mode,
        hasInputs: (unit.inputs?.length ?? 0) > 0,
        hasOutputs: (unit.outputs?.length ?? 0) > 0,
      },
    );
  }

  // ── Graph-driven convergence ───────────────────────────────────────
  const registry = buildActionRegistry();
  const projectDir = getProjectRoot(unit);
  const epicId = getEpicId(unit);
  const taskContext = new TaskContext(projectDir, epicId, unit.id);

  // Clear stale walker state from a previous attempt so the navigator
  // starts fresh. Without this, the navigator resumes mid-convergence
  // with stale gaps/node statuses from a prior failed run.
  await taskContext.clearWalkerState();

  // maxActions = maxIterations * average-nodes-per-iteration (generous multiplier)
  const maxActions = unit.config.maxIterations * 20;

  const result = await converge({
    unit,
    projectDir,
    epicId,
    registry,
    taskContext,
    maxActions,
    skipPreflight: unit.config.skipPreflight,
  });

  // Surface terminal-stall to the outer scheduler via a global marker
  // (we can't change the boolean return type without touching every caller).
  // The scheduler reads this immediately after `run()` returns and clears it.
  //
  // Prefer the navigator's explicit `terminal` flag, fall back to a reason-
  // string regex for older bail sites that haven't been migrated yet.
  const isTerminalStall =
    !result.success &&
    (result.terminal === true ||
      (typeof result.reason === "string" &&
        /Repeat-failure detector|stalled — repeated failures/i.test(
          result.reason,
        )));
  if (isTerminalStall) {
    // Stamp BOTH the unit's own id and the journal task id (epic/path) so
    // the outer scheduler can match either form. Sub-task units sometimes
    // load with a non-canonical id (the materialized TASK.md doesn't carry
    // the original frontmatter id) — without both forms the marker silently
    // misses and the scheduler retries the failed task instead of skipping.
    (global as any).__CONVERGE_LAST_BAIL__ = {
      taskId: unit.id,
      journalTaskId: epicId ? `${epicId}/${unit.id}` : unit.id,
      kind: "repeat-failure-stall",
      reason: result.reason,
      at: new Date().toISOString(),
    };
  }

  return result.success;
}
