/**
 * Why Command
 *
 * Explain why a task is blocked/pending/skipped.
 *   converge why <task-id>   Show dependency chain
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface WhyOptions {
  dir?: string;
  playbook?: string;
  task?: string;
  json?: boolean;
}

interface RunStateNodeLike {
  id: string;
  status: string;
  depends_on?: string[];
  depended_on_by?: string[];
  error_message?: string;
}

interface RunStateLike {
  dag?: {
    nodes?: Record<string, RunStateNodeLike>;
  };
}

function resolveProjectDir(dir?: string): string {
  const cwd = dir || process.cwd();
  const convergeDir = join(cwd, ".converge");
  if (!existsSync(convergeDir)) {
    throw new Error("No .converge directory found. Run from project root.");
  }
  return cwd;
}

function loadRunState(journalDir: string): RunStateLike | null {
  const path = join(journalDir, "runstate.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as RunStateLike;
}

function resolvePlaybookDir(projectDir: string, playbookName?: string): string {
  return join(projectDir, ".converge", "playbooks", playbookName || "default");
}

function resolveJournalDir(projectDir: string, playbookName: string): string {
  return join(projectDir, ".converge", "journal", playbookName);
}

interface TaskInfo {
  id: string;
  status: string;
  depends_on: string[];
  depended_on_by: string[];
  error_message?: string;
}

function buildTaskInfo(runState: RunStateLike): Map<string, TaskInfo> {
  const info = new Map<string, TaskInfo>();
  const nodes = runState.dag?.nodes || {};

  for (const [id, node] of Object.entries(nodes)) {
    info.set(id, {
      id,
      status: node.status || "unknown",
      depends_on: node.depends_on || [],
      depended_on_by: node.depended_on_by || [],
      error_message: node.error_message,
    });
  }

  return info;
}

function formatStatus(status: string): string {
  switch (status) {
    case "pass": return "\x1b[32mpass\x1b[0m";       // green
    case "pending": return "\x1b[33mpending\x1b[0m"; // yellow
    case "running": return "\x1b[36mrunning\x1b[0m"; // cyan
    case "error": return "\x1b[31merror\x1b[0m";     // red
    case "skipped": return "\x1b[90mskipped\x1b[0m"; // dim
    case "seeded": return "\x1b[35mseeded\x1b[0m";   // magenta
    default: return status;
  }
}

function explainTask(
  taskId: string,
  taskInfo: Map<string, TaskInfo>,
  visited: Set<string> = new Set(),
  depth: number = 0,
  prefix: string = ""
): string[] {
  const lines: string[] = [];

  if (!taskInfo.has(taskId)) {
    return [`❌ ${taskId}: task not found in runstate`];
  }

  if (visited.has(taskId)) {
    return [`${prefix}↻ ${taskId}: (circular dependency)`];
  }
  visited.add(taskId);

  const task = taskInfo.get(taskId)!;

  // Status icon
  let statusIcon = "";
  switch (task.status) {
    case "pass":
      statusIcon = "✅";
      break;
    case "pending":
      statusIcon = "⏳";
      break;
    case "running":
      statusIcon = "🔄";
      break;
    case "error":
      statusIcon = "❌";
      break;
    case "skipped":
      statusIcon = "⏭️ ";
      break;
    case "seeded":
      statusIcon = "🌱";
      break;
    default:
      statusIcon = "❓";
  }

  lines.push(`${prefix}${statusIcon} ${taskId} [${formatStatus(task.status)}]`);

  // Add error message if any
  if (task.status === "error" && task.error_message) {
    lines.push(`${prefix}   └─ ${task.error_message.slice(0, 80)}${task.error_message.length > 80 ? "..." : ""}`);
  }

  // Show dependencies
  if (task.depends_on.length > 0) {
    lines.push(`${prefix}   └─ depends on:`);
    for (const depId of task.depends_on) {
      const dep = taskInfo.get(depId);
      if (dep) {
        if (dep.status === "pass") {
          lines.push(`${prefix}      ✅ ${depId} [pass]`);
        } else if (dep.status === "pending" || dep.status === "running") {
          lines.push(`${prefix}      ⏳ ${depId} [${dep.status}]`);
          // Recurse
          const subLines = explainTask(depId, taskInfo, new Set(visited), depth + 1, prefix + "      ");
          lines.push(...subLines);
        } else if (dep.status === "error") {
          lines.push(`${prefix}      ❌ ${depId} [error]`);
        } else {
          lines.push(`${prefix}      ${depId} [${dep.status}]`);
        }
      } else {
        lines.push(`${prefix}      ❓ ${depId}: not in runstate`);
      }
    }
  }

  // Show dependents (who is waiting on this)
  if (task.depended_on_by.length > 0) {
    lines.push(`${prefix}   └─ waited by:`);
    for (const depId of task.depended_on_by) {
      const dep = taskInfo.get(depId);
      if (dep) {
        lines.push(`${prefix}      └── ${depId} [${formatStatus(dep.status)}]`);
      }
    }
  }

  return lines;
}

export async function whyCommand(options: WhyOptions): Promise<void> {
  if (!options.task) {
    console.error("Error: --task is required");
    console.error("Usage: converge why --task <task-id> [--playbook=<name>]");
    process.exit(1);
  }

  const projectDir = resolveProjectDir(options.dir);

  // Find playbook name
  let playbookName = options.playbook || "default";
  const projectYaml = join(projectDir, ".converge", "project.yaml");
  if (existsSync(projectYaml)) {
    try {
      const yaml = JSON.parse(readFileSync(projectYaml, "utf8"));
      if (yaml.playbook) playbookName = yaml.playbook;
    } catch {}
  }

  const journalDir = resolveJournalDir(projectDir, playbookName);
  const runState = loadRunState(journalDir);

  if (!runState || !runState.dag?.nodes) {
    console.log("No runstate found. Run the playbook first.");
    return;
  }

  const taskInfo = buildTaskInfo(runState);

  if (!options.json) {
    console.log(`\n🔍 Explaining: ${options.task}\n`);
  }

  const lines = explainTask(options.task, taskInfo);

  if (options.json) {
    console.log(JSON.stringify({
      taskId: options.task,
      chain: lines.join("\n")
    }, null, 2));
  } else {
    console.log(lines.join("\n"));
  }

  console.log("");
}