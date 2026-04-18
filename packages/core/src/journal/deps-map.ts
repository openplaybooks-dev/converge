/**
 * Dependency Map Generator
 *
 * Generates DEPS.md at .converge/journal/tasks/{epicId}/DEPS.md — a markdown
 * file that maps task inputs → outputs across all epics. Used by
 * DependencyBackoffStrategy so AI can understand which task should produce
 * missing files and choose the right repair strategy.
 *
 * Scans ALL epics (not just the blocked task's epic) to detect cross-epic
 * producer/consumer relationships.
 *
 * Output path: .converge/journal/tasks/{epicId}/DEPS.md
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { glob } from "glob";
import { getEpicsDir } from "./structure.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TaskDef {
  epicId: string;
  taskId: string;
  /** Full journalTaskId (e.g. "004-generate-html-designs/004-002-design-lesson-quiz") */
  journalTaskId: string;
  filePath: string;
  inputs: string[];
  outputs: string[];
  checkpointStatus: string;
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

/**
 * Generate (or refresh) DEPS.md for the given epic at:
 *   .converge/journal/tasks/{epicId}/DEPS.md
 *
 * Scans all epics to build cross-epic producer/consumer relationships.
 */
export async function generateDepsMap(
  projectDir: string,
  epicId: string,
): Promise<string> {
  const outputPath = join(getEpicsDir(projectDir), epicId, "DEPS.md");

  // Discover all task defs across all epics
  const allTasks = await discoverAllTasks(projectDir);

  // Build producer map: file pattern → task that produces it
  const producerMap = buildProducerMap(allTasks);

  // Build consumer map: file pattern → tasks that consume it
  const consumerMap = buildConsumerMap(allTasks);

  // Generate the markdown content
  const content = formatDepsMap(
    epicId,
    allTasks,
    producerMap,
    consumerMap,
    projectDir,
  );

  // Write to journal
  await mkdir(join(getEpicsDir(projectDir), epicId), { recursive: true });
  await writeFile(outputPath, content, "utf-8");

  return outputPath;
}

/* ------------------------------------------------------------------ */
/*  Discovery                                                          */
/* ------------------------------------------------------------------ */

async function discoverAllTasks(projectDir: string): Promise<TaskDef[]> {
  const epicsDir = join(projectDir, ".converge", "epics");
  if (!existsSync(epicsDir)) return [];

  const tasks: TaskDef[] = [];

  const epicDirs = readdirSync(epicsDir).filter((e) => {
    const fullPath = join(epicsDir, e);
    return statSync(fullPath).isDirectory();
  });

  for (const epicId of epicDirs) {
    const epicPath = join(epicsDir, epicId);
    // Find all TASK.md files (handles nested WBS tasks too)
    const taskMdFiles = await glob("**/TASK.md", {
      cwd: epicPath,
      absolute: true,
      ignore: ["**/node_modules/**", "**/subtask/**"],
    });

    for (const taskMdPath of taskMdFiles) {
      const def = await parseTaskMdDef(
        taskMdPath,
        epicId,
        epicPath,
        projectDir,
      );
      if (def) tasks.push(def);
    }
  }

  return tasks;
}

async function parseTaskMdDef(
  taskMdPath: string,
  epicId: string,
  epicPath: string,
  projectDir: string,
): Promise<TaskDef | null> {
  try {
    const content = await readFile(taskMdPath, "utf-8");
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;

    const { default: yaml } = await import("yaml");
    const frontmatter = yaml.parse(match[1]) as Record<string, unknown>;

    const inputs: string[] = (
      Array.isArray(frontmatter.inputs) ? frontmatter.inputs : []
    ).filter((x: unknown): x is string => typeof x === "string");
    const outputs: string[] = (
      Array.isArray(frontmatter.outputs) ? frontmatter.outputs : []
    ).filter((x: unknown): x is string => typeof x === "string");

    // Derive taskId from task path relative to epic dir
    const relToEpic = relative(epicPath, taskMdPath).replace(/\\/g, "/");
    // e.g. "004-002-design-lesson-quiz/TASK.md" or "tasks/004-002.../TASK.md"
    const parts = relToEpic
      .split("/")
      .filter((p) => p !== "TASK.md" && p !== "tasks");
    const taskId = parts[parts.length - 1]; // leaf task ID
    // journalTaskId: for WBS subtasks, parent/child; else just taskId
    const journalTaskId = parts.join("/");

    // Check status from checkpoint
    const checkpointStatus = await getTaskCheckpointStatus(
      projectDir,
      epicId,
      journalTaskId,
    );

    return {
      epicId,
      taskId,
      journalTaskId,
      filePath: taskMdPath,
      inputs,
      outputs,
      checkpointStatus,
    };
  } catch {
    return null;
  }
}

async function getTaskCheckpointStatus(
  projectDir: string,
  epicId: string,
  journalTaskId: string,
): Promise<string> {
  try {
    // Build path: journal/tasks/{epicId}/{journalTaskId.replace('/', '/tasks/')}/checkpoint.json
    // When journalTaskId starts with epicId, the epic IS the task — no double-nesting.
    const segments = journalTaskId.split("/");
    let ckptPath: string;
    if (segments[0] === epicId) {
      if (segments.length === 1) {
        ckptPath = join(getEpicsDir(projectDir), epicId, "checkpoint.json");
      } else {
        const childParts: string[] = ["tasks", segments[1]];
        for (let i = 2; i < segments.length; i++)
          childParts.push("tasks", segments[i]);
        ckptPath = join(
          getEpicsDir(projectDir),
          epicId,
          ...childParts,
          "checkpoint.json",
        );
      }
    } else {
      const pathParts: string[] = [segments[0]];
      for (let i = 1; i < segments.length; i++)
        pathParts.push("tasks", segments[i]);
      ckptPath = join(
        getEpicsDir(projectDir),
        epicId,
        ...pathParts,
        "checkpoint.json",
      );
    }
    if (!existsSync(ckptPath)) return "pending";
    const raw = JSON.parse(await readFile(ckptPath, "utf-8"));
    return raw.status ?? "pending";
  } catch {
    return "pending";
  }
}

/* ------------------------------------------------------------------ */
/*  Producer / Consumer Maps                                           */
/* ------------------------------------------------------------------ */

function buildProducerMap(tasks: TaskDef[]): Map<string, TaskDef> {
  const map = new Map<string, TaskDef>();
  for (const task of tasks) {
    for (const output of task.outputs) {
      // Store first producer found (by output pattern)
      if (!map.has(output)) map.set(output, task);
    }
  }
  return map;
}

function buildConsumerMap(tasks: TaskDef[]): Map<string, TaskDef[]> {
  const map = new Map<string, TaskDef[]>();
  for (const task of tasks) {
    for (const input of task.inputs) {
      if (!map.has(input)) map.set(input, []);
      map.get(input)!.push(task);
    }
  }
  return map;
}

/** Find the producer task for a specific file path (exact or glob match) */
function findProducerForFile(
  filePath: string,
  producerMap: Map<string, TaskDef>,
): TaskDef | null {
  // Exact match
  const exact = producerMap.get(filePath);
  if (exact) return exact;

  // Pattern match: check if any output pattern matches the file path
  for (const [pattern, task] of producerMap.entries()) {
    if (patternMatches(pattern, filePath)) return task;
  }
  return null;
}

function patternMatches(pattern: string, filePath: string): boolean {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*");
  try {
    return new RegExp(`^${regexStr}$`).test(filePath);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Markdown Formatter                                                 */
/* ------------------------------------------------------------------ */

/**
 * Generates a focused dependency report for AI repair use.
 *
 * Only shows actionable information:
 *  - Tasks in the target epic that have missing inputs (blocked)
 *  - Tasks in the target epic that have missing outputs (incomplete)
 *  - For each missing file: who should produce it and their status
 *
 * Skips completed tasks and files that already exist — they are not the problem.
 */
function formatDepsMap(
  targetEpicId: string,
  allTasks: TaskDef[],
  producerMap: Map<string, TaskDef>,
  consumerMap: Map<string, TaskDef[]>,
  projectDir: string,
): string {
  const epicTasks = allTasks.filter((t) => t.epicId === targetEpicId);

  const lines: string[] = [
    `# Dependency Map — Epic: ${targetEpicId}`,
    `Generated: ${new Date().toISOString()}`,
    "",
  ];

  // --- Section 1: Tasks with missing inputs (blocked) ---
  const blockedTasks = epicTasks.filter((task) =>
    task.inputs.some((input) => !checkFileExists(input, projectDir)),
  );

  if (blockedTasks.length > 0) {
    lines.push("## Blocked Tasks (missing inputs)", "");
    for (const task of blockedTasks) {
      lines.push(
        `### ${task.journalTaskId} — ${statusToIcon(task.checkpointStatus)} ${task.checkpointStatus}`,
      );
      lines.push("**Missing inputs:**");
      for (const input of task.inputs) {
        if (!checkFileExists(input, projectDir)) {
          const producer = findProducerForFile(input, producerMap);
          const producerInfo = producer
            ? `should be produced by \`${producer.epicId}/${producer.journalTaskId}\` (${producer.checkpointStatus})`
            : "no producer found";
          lines.push(`  - \`${input}\` — ${producerInfo}`);
        }
      }
      lines.push("");
    }
  }

  // --- Section 2: Tasks with missing outputs (incomplete) ---
  const incompleteTasks = epicTasks.filter(
    (task) =>
      task.checkpointStatus !== "complete" &&
      task.outputs.some((output) => !checkFileExists(output, projectDir)),
  );

  if (incompleteTasks.length > 0) {
    lines.push("## Incomplete Tasks (missing outputs)", "");
    for (const task of incompleteTasks) {
      lines.push(
        `### ${task.journalTaskId} — ${statusToIcon(task.checkpointStatus)} ${task.checkpointStatus}`,
      );
      lines.push("**Missing outputs:**");
      for (const output of task.outputs) {
        if (!checkFileExists(output, projectDir)) {
          lines.push(`  - \`${output}\``);
        }
      }
      lines.push("");
    }
  }

  if (blockedTasks.length === 0 && incompleteTasks.length === 0) {
    lines.push(
      "All tasks in this epic have their required files. No dependency issues detected.",
    );
    lines.push("");
  }

  return lines.join("\n");
}

function statusToIcon(status: string): string {
  switch (status) {
    case "complete":
      return "✅";
    case "failed":
      return "❌";
    case "running":
      return "🔄";
    case "blocked":
      return "🔴";
    default:
      return "⏳";
  }
}

function checkFileExists(pattern: string, projectDir: string): boolean {
  if (typeof pattern !== "string") return false;
  // For exact paths (no glob wildcards), check directly
  if (!pattern.includes("*")) {
    return existsSync(join(projectDir, pattern));
  }
  // For glob patterns, check if any match exists
  try {
    const { globSync } = require("glob");
    const matches = globSync(pattern, { cwd: projectDir });
    return matches.length > 0;
  } catch {
    return false;
  }
}
