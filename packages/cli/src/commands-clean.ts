/**
 * Clean Command
 *
 * Delete journal state for selected tasks. Replaces --restart and reset.
 *   converge clean --select <expr>    Delete journal subtree for matching tasks
 *   converge clean --orphaned         Delete journal tasks not in current playbook
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  parseSelector,
  resolveSelection,
} from "@openplaybooks/converge-core/select";
import { readRunLock, isPidAlive } from "./run-lock.ts";
import type { Manifest } from "@openplaybooks/converge-core/select";

export interface CleanOptions {
  dir?: string;
  playbook?: string;
  select?: string;
  exclude?: string;
  orphaned?: boolean;
  all?: boolean;
  yes?: boolean;
}

interface RunStateNodeLike {
  id: string;
  status: string;
  duration_ms?: number;
  completed_at?: string;
  error_message?: string;
  depends_on?: string[];
  depended_on_by?: string[];
  tags?: string[];
  seed?: string | null;
  journal_path?: string;
}

interface RunStateLike {
  metadata?: {
    status?: string;
    completed_at?: string;
  };
  dag?: {
    nodes?: Record<string, RunStateNodeLike>;
  };
}

function loadRunState(journalDir: string): {
  path: string;
  state: RunStateLike | null;
} {
  const path = join(journalDir, "runstate.json");
  if (!existsSync(path)) return { path, state: null };
  return {
    path,
    state: JSON.parse(readFileSync(path, "utf-8")) as RunStateLike,
  };
}

function buildJournalManifest(
  journalTasksDir: string,
  runState: RunStateLike | null,
): Manifest {
  const nodes: Record<string, Record<string, unknown>> = {};
  const child_map: Record<string, string[]> = {};
  const parent_map: Record<string, string[]> = {};

  for (const [taskId, node] of Object.entries(runState?.dag?.nodes ?? {})) {
    const dependsOn = node.depends_on ?? [];
    const dependedOnBy = node.depended_on_by ?? [];
    nodes[taskId] = {
      id: taskId,
      state: "concrete",
      depends_on: dependsOn,
      depended_on_by: dependedOnBy,
      seed: node.seed ? { type: node.seed, path: "" } : null,
      tags: node.tags ?? [],
    };
    child_map[taskId] = dependedOnBy;
    parent_map[taskId] = dependsOn;
  }

  if (!existsSync(journalTasksDir)) {
    return { nodes, child_map, parent_map } as Manifest;
  }

  const taskDirs = readdirSync(journalTasksDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const taskId of taskDirs) {
    if (nodes[taskId]) continue;
    nodes[taskId] = {
      id: taskId,
      state: "concrete",
      depends_on: [],
      depended_on_by: [],
      seed: null,
      tags: [],
    };
    child_map[taskId] = [];
    parent_map[taskId] = [];
  }

  return { nodes, child_map, parent_map } as Manifest;
}

function resetRunStateNodes(
  runState: RunStateLike,
  taskIds: Iterable<string>,
): boolean {
  let changed = false;
  for (const taskId of taskIds) {
    const node = runState.dag?.nodes?.[taskId];
    if (!node) continue;
    node.status = "pending";
    node.duration_ms = 0;
    delete node.completed_at;
    delete node.error_message;
    changed = true;
  }
  if (changed && runState.metadata) {
    runState.metadata.status = "running";
    delete runState.metadata.completed_at;
  }
  return changed;
}

function loadPlaybookTaskNames(
  projectDir: string,
  playbookName: string,
): string[] {
  // RFC 0049: the inventory is the runtime source of truth. It also lists
  // spawned tasks, whose journals are legitimate — not orphans.
  const inventoryPath = join(
    projectDir,
    ".converge",
    "inventory",
    playbookName,
    "tasks.jsonl",
  );
  if (existsSync(inventoryPath)) {
    const ids = readFileSync(inventoryPath, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((row): row is Record<string, unknown> =>
        Boolean(row && row.kind !== "playbook" && row.id),
      )
      .map((row) => String(row.id));
    if (ids.length > 0) return ids;
  }

  // Static task dirs (playbook not yet compiled into an inventory).
  const tasksDir = join(
    projectDir,
    ".converge",
    "playbooks",
    playbookName,
    "tasks",
  );
  if (existsSync(tasksDir)) {
    const ids = readdirSync(tasksDir, { withFileTypes: true })
      .filter(
        (e) => e.isDirectory() && existsSync(join(tasksDir, e.name, "TASK.md")),
      )
      .map((e) => e.name);
    if (ids.length > 0) return ids;
  }

  // Legacy: explicit tasks: list in playbook.yml.
  const playbookPath = join(
    projectDir,
    ".converge",
    "playbooks",
    playbookName,
    "playbook.yml",
  );
  const altPath = join(
    projectDir,
    ".converge",
    "playbooks",
    playbookName,
    "playbook.yaml",
  );

  for (const p of [playbookPath, altPath]) {
    if (existsSync(p)) {
      const yaml = readFileSync(p, "utf-8");
      const pb = parseYaml(yaml) as Record<string, unknown>;
      const tasks = (Array.isArray(pb.tasks) ? pb.tasks : []) as Array<
        Record<string, unknown>
      >;
      return tasks.map((t) => String(t.name || t.id || "")).filter(Boolean);
    }
  }

  // Fallback: try project-level playbook.yml
  for (const ext of [".yml", ".yaml"]) {
    const p = join(projectDir, `playbook${ext}`);
    if (existsSync(p)) {
      const yaml = readFileSync(p, "utf-8");
      const pb = parseYaml(yaml) as Record<string, unknown>;
      const tasks = (Array.isArray(pb.tasks) ? pb.tasks : []) as Array<
        Record<string, unknown>
      >;
      return tasks.map((t) => String(t.name || t.id || "")).filter(Boolean);
    }
  }

  return [];
}

function detectPlaybookName(projectDir: string): string {
  const playbooksDir = join(projectDir, ".converge", "playbooks");
  if (existsSync(playbooksDir)) {
    if (existsSync(join(playbooksDir, "default"))) return "default";
    const entries = readdirSync(playbooksDir, { withFileTypes: true }).filter(
      (e) => e.isDirectory(),
    );
    if (entries.length > 0) return entries[0].name;
  }
  return "default";
}

export async function cleanCommand(options: CleanOptions): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const playbookName = options.playbook || detectPlaybookName(projectDir);
  const active = readRunLock(projectDir, playbookName);
  if (active && isPidAlive(active.pid)) {
    throw new Error(
      `Refusing to clean playbook "${playbookName}" because run PID ${active.pid} is active.\n` +
        `Stop it first with: converge stop --playbook=${playbookName}`,
    );
  }

  const journalDir = join(projectDir, ".converge", "journal", playbookName);
  if (options.all) {
    await rm(journalDir, { recursive: true, force: true });
    await rm(join(projectDir, "target", playbookName), {
      recursive: true,
      force: true,
    });
    await rm(join(projectDir, "target", "manifest.json"), { force: true });
    return;
  }

  const journalTasksDir = join(
    projectDir,
    ".converge",
    "journal",
    playbookName,
    "tasks",
  );

  if (!existsSync(journalTasksDir)) {
    return;
  }

  if (options.select) {
    const { path: runStatePath, state: runState } = loadRunState(journalDir);
    const manifest = buildJournalManifest(journalTasksDir, runState);
    const selector = parseSelector(options.select);
    const result = resolveSelection(selector, manifest, {
      ...(options.exclude ? { exclude: parseSelector(options.exclude) } : {}),
    });

    for (const taskId of result.ids) {
      const journalPath = runState?.dag?.nodes?.[taskId]?.journal_path;
      const directTaskDir = join(journalTasksDir, taskId);
      if (existsSync(directTaskDir)) {
        await rm(directTaskDir, { recursive: true, force: true });
      }
      if (journalPath) {
        const journalTaskDir = join(projectDir, journalPath);
        if (journalTaskDir !== directTaskDir && existsSync(journalTaskDir)) {
          await rm(join(journalTaskDir, "attempts"), {
            recursive: true,
            force: true,
          });
        }
      }
    }
    if (runState && resetRunStateNodes(runState, result.ids)) {
      writeFileSync(runStatePath, `${JSON.stringify(runState, null, 2)}\n`);
    }
  } else if (options.orphaned) {
    const playbookTasks = loadPlaybookTaskNames(projectDir, playbookName);

    const journalTaskDirs = readdirSync(journalTasksDir, {
      withFileTypes: true,
    })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const taskId of journalTaskDirs) {
      if (!playbookTasks.includes(taskId)) {
        const taskDir = join(journalTasksDir, taskId);
        await rm(taskDir, { recursive: true, force: true });
      }
    }
  }
}
