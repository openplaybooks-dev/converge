/**
 * Retry Command
 *
 * Reset a failed task to pending so it can be retried on next run.
 *   converge retry <task-id>        Reset error → pending
 *   converge retry --select <expr>  Reset multiple tasks
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseSelector, resolveSelection } from "@openplaybooks/converge-core/select";
import type { Manifest } from "@openplaybooks/converge-core/select";

export interface RetryOptions {
  dir?: string;
  playbook?: string;
  select?: string;
  yes?: boolean;
}

interface RunStateNodeLike {
  id: string;
  status: string;
}

interface RunStateLike {
  dag?: {
    nodes?: Record<string, RunStateNodeLike>;
  };
}

function loadRunState(journalDir: string): RunStateLike | null {
  const path = join(journalDir, "runstate.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as RunStateLike;
}

function saveRunState(journalDir: string, state: RunStateLike): void {
  const path = join(journalDir, "runstate.json");
  writeFileSync(path, JSON.stringify(state, null, 2));
}

function resolveProjectDir(dir?: string): string {
  const cwd = dir || process.cwd();
  const convergeDir = join(cwd, ".converge");
  if (!existsSync(convergeDir)) {
    throw new Error("No .converge directory found. Run from project root.");
  }
  return cwd;
}

function resolvePlaybookDir(projectDir: string, playbookName?: string): string {
  const playbookDir = playbookName
    ? join(projectDir, ".converge", "playbooks", playbookName)
    : join(projectDir, ".converge", "playbooks", "default");

  if (!existsSync(playbookDir)) {
    throw new Error(`Playbook directory not found: ${playbookDir}`);
  }
  return playbookDir;
}

function resolveJournalDir(projectDir: string, playbookName: string): string {
  return join(projectDir, ".converge", "journal", playbookName);
}

async function getManifest(playbookDir: string): Promise<Manifest> {
  const manifestPath = join(playbookDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error("No manifest.json found. Compile the playbook first.");
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as Manifest;
  if (!manifest.dag?.nodes) {
    throw new Error("Invalid manifest: missing dag.nodes");
  }
  return manifest;
}

export async function retryCommand(options: RetryOptions): Promise<void> {
  const projectDir = resolveProjectDir(options.dir);

  // Find playbook name from .converge/project.yaml
  let playbookName = options.playbook || "default";
  const projectYaml = join(projectDir, ".converge", "project.yaml");
  if (existsSync(projectYaml)) {
    try {
      const yaml = JSON.parse(readFileSync(projectYaml, "utf8"));
      if (yaml.playbook) playbookName = yaml.playbook;
    } catch {}
  }

  const playbookDir = resolvePlaybookDir(projectDir, playbookName);
  const journalDir = resolveJournalDir(projectDir, playbookName);
  const runState = loadRunState(journalDir);

  if (!runState || !runState.dag?.nodes) {
    console.log("No runstate found. Nothing to retry.");
    return;
  }

  const manifest = await getManifest(playbookDir);
  const taskIds = new Set(Object.keys(runState.dag.nodes));

  // Resolve selection
  let taskPatterns: string[];
  if (options.select) {
    // Support comma-separated
    const selectStr = options.select;
    taskPatterns = selectStr.includes(",")
      ? selectStr.split(",").map(s => s.trim())
      : [selectStr];

    // Also support repeated --select
    if (Array.isArray(options.select)) {
      taskPatterns = (options.select as string[]).flatMap(s =>
        s.includes(",") ? s.split(",").map(x => x.trim()) : [s]
      );
    }
  } else {
    console.error("Error: --select is required");
    console.error("Usage: converge retry --select <task-id> [--playbook=<name>]");
    process.exit(1);
  }

  // Collect tasks to retry
  const tasksToRetry = new Set<string>();

  for (const pattern of taskPatterns) {
    const selector = parseSelector(pattern);
    const resolved = resolveSelection(selector, manifest as any);

    for (const id of resolved.ids) {
      if (taskIds.has(id)) {
        tasksToRetry.add(id);
      }
    }
  }

  if (tasksToRetry.size === 0) {
    console.log("No matching tasks found.");
    return;
  }

  // Reset tasks
  let resetCount = 0;
  for (const taskId of tasksToRetry) {
    const node = runState.dag.nodes![taskId];
    if (node.status === "error") {
      node.status = "pending";
      delete node.error_message;
      resetCount++;
      console.log(`  🔄 ${taskId}: error → pending`);
    } else if (node.status === "skipped") {
      node.status = "pending";
      resetCount++;
      console.log(`  🔄 ${taskId}: skipped → pending`);
    } else {
      console.log(`  ⏭️  ${taskId}: ${node.status} (no change needed)`);
    }
  }

  saveRunState(journalDir, runState);

  console.log(`\n✅ Reset ${resetCount} task(s) to pending`);
  console.log(`   Run 'converge run --playbook=${playbookName} --resume' to retry`);
}