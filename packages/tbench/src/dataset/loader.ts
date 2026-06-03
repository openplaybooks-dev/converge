/**
 * Dataset loader — scans a local directory for terminal-bench task.yaml files.
 *
 * Terminal-bench distributes tasks via git clone or `tb download`.
 * Each task lives in its own directory with a task.yaml descriptor.
 *
 * Cache location: ~/.cache/converge/tbench/tasks.json
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { parse as parseYaml } from "yaml";
import type { TBenchTask } from "./types.ts";

const CACHE_DIR = join(homedir(), ".cache", "converge", "tbench");
const CACHE_FILE = join(CACHE_DIR, "tasks.json");

/**
 * Load terminal-bench tasks from a local directory.
 * Scans recursively for task.yaml files and parses them into TBenchTask[].
 */
export async function loadTasks(opts: {
  /** Directory containing terminal-bench tasks */
  tasksDir: string;
  /** Force re-scan even if cached */
  forceRefresh?: boolean;
}): Promise<TBenchTask[]> {
  const tasksDir = resolve(opts.tasksDir);

  // Return cached if available and not forcing refresh
  if (!opts.forceRefresh && existsSync(CACHE_FILE)) {
    const raw = await readFile(CACHE_FILE, "utf-8");
    const cached = JSON.parse(raw) as { tasksDir: string; tasks: TBenchTask[] };
    // Only use cache if it matches the same tasks directory
    if (cached.tasksDir === tasksDir) {
      return cached.tasks;
    }
  }

  // Scan for task.yaml files
  const tasks = await scanTaskDir(tasksDir);

  // Cache to disk
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    CACHE_FILE,
    JSON.stringify({ tasksDir, tasks }, null, 2),
    "utf-8",
  );

  return tasks;
}

/**
 * Recursively scan a directory for task.yaml files.
 */
async function scanTaskDir(dir: string): Promise<TBenchTask[]> {
  const tasks: TBenchTask[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Check if this directory contains a task.yaml
      const taskYamlPath = join(fullPath, "task.yaml");
      if (existsSync(taskYamlPath)) {
        const task = await parseTaskYaml(taskYamlPath, fullPath);
        if (task) tasks.push(task);
      } else {
        // Recurse into subdirectories
        const subTasks = await scanTaskDir(fullPath);
        tasks.push(...subTasks);
      }
    }
  }

  return tasks;
}

/**
 * Parse a single task.yaml file into a TBenchTask.
 */
async function parseTaskYaml(
  yamlPath: string,
  taskDir: string,
): Promise<TBenchTask | null> {
  try {
    const raw = await readFile(yamlPath, "utf-8");
    const data = parseYaml(raw) as Record<string, unknown>;

    return {
      taskId: (data.task_id ?? data.id ?? "") as string,
      instruction: (data.instruction ?? data.prompt ?? "") as string,
      category: (data.category ?? "unknown") as string,
      difficulty: (data.difficulty ?? "medium") as string,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      maxAgentTimeoutSec: (data.max_agent_timeout_sec ??
        data.agent_timeout ??
        300) as number,
      maxTestTimeoutSec: (data.max_test_timeout_sec ??
        data.test_timeout ??
        120) as number,
      parserName: (data.parser_name ?? data.parser ?? "pytest") as string,
      taskDir,
    };
  } catch {
    return null;
  }
}
