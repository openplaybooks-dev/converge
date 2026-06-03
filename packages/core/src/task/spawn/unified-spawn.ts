/**
 * RFC 0031: Unified spawn row append API.
 *
 * Programmatic interface for appending spawned tasks with taskRef + params
 * directly to the unified tasks.jsonl.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { appendTaskUpsert, type TaskRef } from "../goal/runtime-ledger.ts";

export interface UnifiedSpawnRow {
  /** Unique task identifier. */
  id: string;
  /** Template name (references templates/<name>/TASK.md). */
  template: string;
  /** Template parameters for substitution. */
  params: Record<string, unknown>;
  /** Dependency task IDs. */
  depends_on?: string[];
  /** Parent task ID (the spawner task that created this row). */
  parent?: string;
}

/**
 * Append a single unified spawn row to tasks.jsonl.
 */
export function appendUnifiedSpawnRow(
  projectDir: string,
  playbookName: string,
  playbookDir: string,
  row: UnifiedSpawnRow,
): { ok: true } | { ok: false; error: string } {
  // Validate template exists
  const templateDir = join(playbookDir, "templates", row.template);
  const templateMdPath = join(templateDir, "TASK.md");
  if (!existsSync(templateMdPath)) {
    return { ok: false, error: `Template not found: ${templateMdPath}` };
  }

  // Build the taskRef
  const taskRef: TaskRef = { kind: "template", name: row.template };

  // Append to the unified tasks.jsonl
  appendTaskUpsert(projectDir, playbookName, {
    id: row.id,
    taskRef,
    params: row.params,
    depends_on: row.depends_on ?? [],
    parent: row.parent,
    goalId: "inventory",
    summary: row.id,
    status: "todo",
    source: "spawned",
    playbook: playbookName,
    metadata: {
      template: row.template,
      renderedHash: "", // Will be computed after EXPANDED.md render
    },
  });

  return { ok: true };
}
