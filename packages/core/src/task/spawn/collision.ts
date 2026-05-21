/**
 * RFC 0026 — Sibling-output collision detector for spawn manifests.
 *
 * Detects when multiple children spawned from the same template declare
 * identical outputs after var substitution. This causes two failures:
 * 1. The cache predicate cannot distinguish per-child completion.
 * 2. Concurrent siblings race on the same file (RFC 0027 handles runtime).
 *
 * This detector catches the design-time mistake at apply time.
 */

import { parseTaskMdString } from "../../config/task-md-definition.ts";

export interface CollisionReport {
  groupKey: string;
  rows: Array<{ id: string; outputs: string[] }>;
  collidingOutputs: string[];
  severity: "error" | "warning";
}

interface RowWithOutputs {
  id: string;
  template: string;
  outputs: string[];
  outputScope?: string;
}

export function detectSiblingOutputCollisions(
  renderedContents: Map<string, string>,
): CollisionReport[] {
  const reports: CollisionReport[] = [];

  // Parse each rendered TASK.md to extract outputs and output_scope
  const rows: RowWithOutputs[] = [];
  for (const [id, content] of renderedContents.entries()) {
    try {
      const parsed = parseTaskMdString(content);
      rows.push({
        id,
        template: (parsed as any)._template ?? "",
        outputs: parsed.outputs ?? [],
        outputScope: parsed.output_scope,
      });
    } catch {
      // Skip rows that fail to parse
      continue;
    }
  }

  // Group by template
  const byTemplate = new Map<string, RowWithOutputs[]>();
  for (const row of rows) {
    if (!row.template) continue;
    if (!byTemplate.has(row.template)) {
      byTemplate.set(row.template, []);
    }
    byTemplate.get(row.template)!.push(row);
  }

  for (const [template, group] of byTemplate.entries()) {
    if (group.length <= 1) continue;

    // Filter out rows with output_scope: shared
    const sharedRows = group.filter((r) => r.outputScope !== "shared");
    if (sharedRows.length <= 1) continue;

    // Group by output set
    const outputSets = new Map<string, string[]>();
    for (const row of sharedRows) {
      const key = JSON.stringify([...row.outputs].sort());
      if (!outputSets.has(key)) outputSets.set(key, []);
      outputSets.get(key)!.push(row.id);
    }

    for (const [key, ids] of outputSets.entries()) {
      if (ids.length <= 1) continue;

      const outputs = JSON.parse(key) as string[];

      // Determine severity: error if ALL rows in the group have the same outputs
      const allOutputsCollide = sharedRows.every((r) => {
        const rKey = JSON.stringify([...r.outputs].sort());
        return rKey === key;
      });

      const severity = allOutputsCollide && ids.length > 1 ? "error" : "warning";

      reports.push({
        groupKey: template,
        rows: ids.map((id) => {
          const row = sharedRows.find((r) => r.id === id)!;
          return { id, outputs: row.outputs };
        }),
        collidingOutputs: outputs,
        severity,
      });
    }
  }

  return reports;
}

export function collisionReportToError(
  report: CollisionReport,
  rowId: string,
): {
  error: string;
  errorCode: "sibling-output-collision";
  siblings: string[];
  colliding_outputs: string[];
} {
  const siblings = report.rows.map((r) => r.id).filter((id) => id !== rowId);
  return {
    error:
      `all declared outputs collide with ${siblings.length} other sibling${siblings.length === 1 ? "" : "s"} ` +
      `spawned from ${report.groupKey}. The cache predicate cannot distinguish per-child completion. ` +
      `Add per-child scope to the template's \`outputs:\`, e.g. \`apps/portal/src/features/{{screenId}}\` ` +
      `instead of \`apps/portal/src/features\`.`,
    errorCode: "sibling-output-collision",
    siblings,
    colliding_outputs: report.collidingOutputs,
  };
}
