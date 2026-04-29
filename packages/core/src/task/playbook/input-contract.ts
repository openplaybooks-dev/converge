/**
 * Input Contract Validator — pre-flight check that every declared `inputs:`
 * is satisfied either by a file already on disk OR by some other task's
 * `outputs:`.
 *
 * Catches the "WBS script reads a file no upstream task produces" failure
 * mode at playbook load time, before the runner spends API budget.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { glob } from "glob";
import type { TaskTree } from "../tree/index.ts";

export interface InputContractIssue {
  taskId: string;
  taskTitle: string;
  input: string;
  reason: "no-producer-and-not-on-disk";
}

export interface InputContractReport {
  issues: InputContractIssue[];
  hasErrors: boolean;
  /** Tasks scanned (for the user-facing "checked N tasks" line). */
  tasksScanned: number;
}

function hasGlobWildcards(p: string): boolean {
  return /[*?{}]/.test(p);
}

async function inputResolvedOnDisk(
  projectDir: string,
  input: string,
): Promise<boolean> {
  if (hasGlobWildcards(input)) {
    const matches = await glob(input, { cwd: projectDir });
    return matches.length > 0;
  }
  return existsSync(join(projectDir, input));
}

/**
 * Check every task's `inputs:` against:
 *   1. files that already exist on disk under projectDir, OR
 *   2. the union of `outputs:` across every other task in the tree.
 *
 * An input that is neither on-disk nor declared as an output anywhere is a
 * contract bug — it can never be produced, so the task can never run.
 */
export async function validateInputContracts(
  taskTree: TaskTree,
  projectDir: string,
): Promise<InputContractReport> {
  const allNodes = taskTree.getAllNodes();

  // Collect every declared output across the tree.
  const allOutputs = new Set<string>();
  for (const node of allNodes) {
    const outs = node.unit?.outputs;
    if (!Array.isArray(outs)) continue;
    for (const o of outs) {
      if (typeof o === "string") allOutputs.add(o);
    }
  }

  const issues: InputContractIssue[] = [];
  let tasksScanned = 0;

  for (const node of allNodes) {
    const unit = node.unit;
    if (!unit) continue;
    const inputs = unit.inputs;
    if (!Array.isArray(inputs) || inputs.length === 0) continue;
    tasksScanned++;

    for (const input of inputs) {
      if (typeof input !== "string") continue;

      // 1) Already produced by some task in the tree?
      if (allOutputs.has(input)) continue;

      // 2) Already on disk?
      if (await inputResolvedOnDisk(projectDir, input)) continue;

      issues.push({
        taskId: unit.id,
        taskTitle: unit.title || unit.id,
        input,
        reason: "no-producer-and-not-on-disk",
      });
    }
  }

  return {
    issues,
    hasErrors: issues.length > 0,
    tasksScanned,
  };
}

export function formatInputContractReport(report: InputContractReport): string {
  const lines: string[] = [];
  if (report.tasksScanned === 0) {
    return "🔗 Input contract: no tasks declare `inputs:` — skipped.";
  }
  if (!report.hasErrors) {
    return `🔗 Input contract: ${report.tasksScanned} task(s) checked — all inputs satisfied.`;
  }

  lines.push(`🔗 Input contract: ${report.issues.length} unsatisfied input(s):`);
  lines.push("");
  for (const issue of report.issues) {
    lines.push(`   ❌ [${issue.taskId}] declares input "${issue.input}"`);
    lines.push(
      `      but no task produces it and no file exists at that path.`,
    );
  }
  lines.push("");
  lines.push(
    "   Fix: either (a) add the file at that path before running, or",
  );
  lines.push(
    "        (b) declare it as an `outputs:` of an upstream task that will produce it.",
  );
  return lines.join("\n");
}
