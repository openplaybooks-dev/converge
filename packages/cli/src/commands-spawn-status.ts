/**
 * `converge spawn status` — diagnostic command for RFC 0036.
 *
 * Shows the full pipeline state for spawned tasks:
 *   - Ledger status (todo/doing/done/blocked/dropped)
 *   - Instance TASK.md existence
 *   - Template resolution
 *   - Parent relationships
 *   - Output file validation
 *
 * Usage:
 *   converge spawn status                          # all spawned tasks
 *   converge spawn status --task=<id>              # specific task
 *   converge spawn status --playbook=<name>        # specific playbook
 *   converge spawn status --json                   # machine-readable output
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  readRuntimeLedgerState,
  type RuntimeTask,
  type TaskRef,
} from "@openplaybooks/converge-core/task/goal";

export interface SpawnStatusOptions {
  playbook?: string;
  task?: string;
  json?: boolean;
}

interface TaskPipelineState {
  id: string;
  status: string;
  source: string;
  parent?: string;
  taskPath: string;
  instanceExists: boolean;
  template?: string;
  outputsExist: boolean;
  totalOutputs: number;
  outputsOnDisk: number;
  fingerprint?: string;
  metadata?: Record<string, unknown>;
  issue?: string;
}

/**
 * Read the runtime ledger and build pipeline state for spawned tasks.
 */
function collectSpawnedTasks(
  workspace: string,
  playbookFilter?: string,
): TaskPipelineState[] {
  const playbooksDir = join(workspace, ".converge", "inventory");
  if (!existsSync(playbooksDir)) return [];

  const playbooks = readdirSync(playbooksDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const results: TaskPipelineState[] = [];

  for (const pb of playbooks) {
    if (playbookFilter && pb !== playbookFilter) continue;

    const ledgerPath = join(
      workspace,
      ".converge",
      "inventory",
      pb,
      "tasks.jsonl",
    );
    let state: { tasks: RuntimeTask[] };
    try {
      state = readRuntimeLedgerState(workspace, pb);
    } catch {
      continue;
    }

    for (const task of state.tasks) {
      if (task.source !== "spawned") continue;

      const instancePath = join(workspace, task.taskPath);
      const instanceExists = existsSync(instancePath);

      // Check outputs
      const outputs = task.outputs ?? [];
      const outputsOnDisk = outputs.filter((o) =>
        existsSync(join(workspace, o)),
      ).length;

      // Resolve template info
      const taskRef = (task as any).taskRef as TaskRef | undefined;
      const templateName =
        taskRef?.kind === "template" ? taskRef.name : undefined;
      const metadata = task.metadata as Record<string, unknown> | undefined;
      const templateSource = metadata?.template as string | undefined;

      // Detect issues
      let issue: string | undefined;
      if (!instanceExists) {
        issue = "missing-instance-file";
      } else if (task.status === "todo" && instanceExists) {
        // Check if file is non-empty
        const st = statSync(instancePath);
        if (st.size === 0) {
          issue = "empty-instance-file";
        }
      }

      results.push({
        id: task.id,
        status: task.status,
        source: task.source,
        parent: task.parent,
        taskPath: task.taskPath,
        instanceExists,
        template: templateSource || templateName,
        outputsExist: outputsOnDisk === outputs.length && outputs.length > 0,
        totalOutputs: outputs.length,
        outputsOnDisk,
        fingerprint: task.fingerprint,
        metadata: task.metadata,
        issue,
      });
    }
  }

  return results;
}

/**
 * Format pipeline state as a human-readable table.
 */
function formatTable(tasks: TaskPipelineState[]): string {
  if (tasks.length === 0) return "No spawned tasks found.";

  const statusIcon = (status: string): string => {
    switch (status) {
      case "done":
        return "✅";
      case "doing":
        return "🔄";
      case "awaiting-review":
        return "⏸";
      case "todo":
        return "⏳";
      case "blocked":
        return "🚫";
      case "dropped":
        return "❌";
      default:
        return "❓";
    }
  };

  const issueMark = (issue?: string): string => {
    if (!issue) return "";
    return ` ⚠️ ${issue}`;
  };

  const lines: string[] = [];
  lines.push(`\nSpawned Tasks (${tasks.length} total):\n`);
  lines.push(
    "┌──────┬──────────┬─────────────┬──────────┬─────────────┬──────────┐",
  );
  lines.push(
    "│ ID   │ Status   │ Instance    │ Template │ Outputs     │ Parent   │",
  );
  lines.push(
    "├──────┼──────────┼─────────────┼──────────┼─────────────┼──────────┤",
  );

  for (const t of tasks) {
    const icon = statusIcon(t.status);
    const inst = t.instanceExists ? "yes" : "no";
    const tmpl = t.template || "-";
    const outputs =
      t.totalOutputs > 0 ? `${t.outputsOnDisk}/${t.totalOutputs}` : "-";
    const parent = t.parent || "-";
    const issue = issueMark(t.issue);

    lines.push(
      `│ ${icon} ${t.id.padEnd(14).slice(0, 14)}│ ` +
        `${t.status.padEnd(10).slice(0, 10)}│ ` +
        `${inst.padEnd(11).slice(0, 11)}│ ` +
        `${tmpl.padEnd(10).slice(0, 10)}│ ` +
        `${outputs.padEnd(11).slice(0, 11)}│ ` +
        `${parent}${issue}`,
    );
  }

  lines.push(
    "└──────┴──────────┴─────────────┴──────────┴─────────────┴──────────┘",
  );

  // Summary
  const done = tasks.filter((t) => t.status === "done").length;
  const issues = tasks.filter((t) => t.issue).length;
  const missing = tasks.filter((t) => !t.instanceExists).length;

  if (issues > 0 || missing > 0) {
    lines.push("\nIssues:");
    for (const t of tasks) {
      if (t.issue) {
        lines.push(`  ⚠️  ${t.id}: ${t.issue}`);
        if (t.issue === "missing-instance-file") {
          lines.push(
            `     → Run: converge spawn ${t.id} ${t.template || "<template>"}`,
          );
        }
      }
    }
  }

  lines.push(
    `\nSummary: ${done}/${tasks.length} done, ${issues} issues, ${missing} missing files`,
  );

  return lines.join("\n");
}

/**
 * Main entry point for `converge spawn status`.
 */
export async function spawnStatusCommand(
  opts: SpawnStatusOptions,
): Promise<void> {
  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const tasks = collectSpawnedTasks(workspace, opts.playbook);

  // Filter by specific task if requested
  const filtered = opts.task ? tasks.filter((t) => t.id === opts.task) : tasks;

  if (filtered.length === 0) {
    if (opts.task) {
      console.log(`No spawned task found with id '${opts.task}'`);
    } else {
      console.log("No spawned tasks found.");
    }
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    console.log(formatTable(filtered));
  }
}
