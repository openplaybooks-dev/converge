/**
 * Cost preflight — sum each task's declared `cost_cents` (or `cost_cents_each`
 * × spawn count for WBS parents) and warn / abort when the total exceeds
 * `vars.budget_cents`.
 *
 * Convention: TASK.md frontmatter may declare `cost_cents: <int>` for a
 * single-call task, or `cost_cents_each: <int>` for a WBS parent that
 * fans out children of the same kind. The preflight reports the sum so
 * the operator knows up-front whether the run will fit the budget.
 *
 * This is conservative: a missing field is treated as 0, so the preflight
 * UNDERestimates rather than overestimating. The point is to catch the
 * "you're about to spend $5 on a $1 budget" case, not to be exact.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { TaskTree } from "@converge/core/task/tree/index.ts";

export interface CostPreflightLine {
  taskId: string;
  costCents: number;
  /** Per-task or aggregated (per-cohort) line. */
  kind: "single" | "cohort";
  childCount?: number;
}

export interface CostPreflightReport {
  budgetCents: number | undefined;
  totalCents: number;
  lines: CostPreflightLine[];
  /** True when totalCents > budgetCents (and budgetCents was set). */
  exceedsBudget: boolean;
}

async function readFrontmatter(taskMdPath: string): Promise<Record<string, unknown> | null> {
  if (!existsSync(taskMdPath)) return null;
  try {
    const raw = await readFile(taskMdPath, "utf-8");
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return null;
    const parsed = parseYaml(m[1]);
    return (parsed && typeof parsed === "object") ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Estimate total cost for the run by summing per-task `cost_cents`.
 * For WBS parents, a `cost_cents_each` field × spawned-child count
 * gives the cohort estimate (children may not exist on disk yet at
 * preflight time, so we trust the parent's declaration).
 */
export async function estimateRunCost(
  taskTree: TaskTree,
  budgetCents: number | undefined,
): Promise<CostPreflightReport> {
  const lines: CostPreflightLine[] = [];
  for (const node of taskTree.getAllNodes()) {
    const fm = await readFrontmatter(node.unit?.path ?? "");
    if (!fm) continue;
    const single = typeof fm.cost_cents === "number" ? fm.cost_cents : 0;
    const each = typeof fm.cost_cents_each === "number" ? fm.cost_cents_each : 0;
    const declaredChildren = typeof fm.expected_child_count === "number"
      ? fm.expected_child_count
      : undefined;
    const childCount = declaredChildren ?? node.children?.length ?? 0;
    if (single > 0) {
      lines.push({
        taskId: node.unit?.id ?? "?",
        costCents: single,
        kind: "single",
      });
    }
    if (each > 0 && childCount > 0) {
      lines.push({
        taskId: node.unit?.id ?? "?",
        costCents: each * childCount,
        kind: "cohort",
        childCount,
      });
    }
  }
  const totalCents = lines.reduce((s, l) => s + l.costCents, 0);
  const exceedsBudget = budgetCents !== undefined && totalCents > budgetCents;
  return { budgetCents, totalCents, lines, exceedsBudget };
}

export function formatCostReport(report: CostPreflightReport): string {
  const out: string[] = [];
  if (report.lines.length === 0) {
    return `💰 Cost preflight: no tasks declared cost_cents — total estimate is 0¢ (declarations are optional; tasks may still spend).`;
  }
  out.push(`💰 Cost preflight: ${report.totalCents}¢ estimated across ${report.lines.length} declared line(s)${report.budgetCents !== undefined ? ` / budget ${report.budgetCents}¢` : ""}`);
  for (const l of report.lines) {
    const tag = l.kind === "cohort" ? ` (${l.childCount} children × each)` : "";
    out.push(`   • [${l.taskId}] ${l.costCents}¢${tag}`);
  }
  if (report.exceedsBudget) {
    out.push("");
    out.push(`   ⚠️  Estimated total ${report.totalCents}¢ EXCEEDS declared budget ${report.budgetCents}¢.`);
    out.push("       Bump `vars.budget_cents` in playbook.yml or remove tasks before running.");
  }
  return out.join("\n");
}
