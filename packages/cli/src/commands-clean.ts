/**
 * Clean Command
 *
 * Delete journal state for selected tasks. Replaces --restart and reset.
 *   converge clean --select <expr>    Delete journal subtree for matching tasks
 *   converge clean --orphaned         Delete journal tasks not in current playbook
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { parseSelector, resolveSelection } from "@converge/core/select/index.ts";

export interface CleanOptions {
  dir?: string;
  select?: string;
  exclude?: string;
  orphaned?: boolean;
}

function buildJournalManifest(journalTasksDir: string) {
  const nodes: Record<string, Record<string, unknown>> = {};
  const child_map: Record<string, string[]> = {};
  const parent_map: Record<string, string[]> = {};

  if (!existsSync(journalTasksDir)) return { nodes, child_map, parent_map };

  const taskDirs = readdirSync(journalTasksDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const taskId of taskDirs) {
    nodes[taskId] = {
      id: taskId,
      state: "concrete",
      depends_on: [],
      depended_on_by: [],
      wbs: null,
      tags: [],
    };
    child_map[taskId] = [];
    parent_map[taskId] = [];
  }

  return { nodes, child_map, parent_map };
}

function loadPlaybookTaskNames(
  projectDir: string,
  playbookName: string,
): string[] {
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
  const playbookName = detectPlaybookName(projectDir);
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
    const manifest = buildJournalManifest(journalTasksDir);
    const selector = parseSelector(options.select);
    const result = resolveSelection(selector, manifest, {
      ...(options.exclude
        ? { exclude: parseSelector(options.exclude) }
        : {}),
    });

    for (const taskId of result.ids) {
      const taskDir = join(journalTasksDir, taskId);
      if (existsSync(taskDir)) {
        await rm(taskDir, { recursive: true, force: true });
      }
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
