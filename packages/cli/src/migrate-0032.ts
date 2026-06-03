/**
 * RFC 0032 Migration: inline playbook.yml task definitions → tasks/<id>/TASK.md.
 *
 * For each task entry in playbook.yml that has inline content fields (title,
 * description, prompt, outputs, checks, skill, agent, vars, tags, file, ai):
 *   1. Create tasks/<id>/TASK.md with frontmatter from inline fields.
 *   2. Write the prompt as the TASK.md body.
 *   3. If TASK.md already exists, merge inline fields into frontmatter.
 *
 * Then rewrite playbook.yml's tasks: array to reference-only format:
 *   tasks:
 *     - id: analyze
 *       depends_on: []
 *
 * Idempotent: no-op when playbook.yml already has only {id, depends_on} entries.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface Migrate0032Report {
  playbook: string;
  tasksMigrated: number;
  tasksAlreadyValid: number;
  taskMdFilesCreated: string[];
  playbookRewritten: boolean;
  errors: string[];
  alreadyCompliant: boolean;
}

/** Fields that must live in TASK.md, not inline in playbook.yml. */
const INLINE_CONTENT_FIELDS = [
  "title",
  "description",
  "prompt",
  "inputs",
  "outputs",
  "checks",
  "skill",
  "agent",
  "vars",
  "tags",
  "file",
  "ai",
] as const;

/** Fields allowed in playbook.yml task entries (graph references only). */
const ALLOWED_TASK_FIELDS = ["id", "path", "name", "depends_on"] as const;

interface TaskEntry {
  id?: string;
  path?: string;
  name?: string;
  depends_on?: string[];
  [key: string]: unknown;
}

interface PlaybookYaml {
  name?: string;
  description?: string;
  key?: string;
  inputs?: Record<string, unknown>;
  run?: Record<string, unknown>;
  tasks?: TaskEntry[];
  goals?: unknown[];
  checks?: unknown[];
  vars?: Record<string, unknown>;
  [key: string]: unknown;
}

function hasInlineContent(entry: TaskEntry): boolean {
  return INLINE_CONTENT_FIELDS.some((f) => f in entry);
}

function getTaskId(entry: TaskEntry): string | null {
  return (entry.path ?? entry.id ?? entry.name ?? null) as string | null;
}

function buildTaskMdFrontmatter(entry: TaskEntry): string {
  const frontmatter: Record<string, unknown> = {};

  for (const field of INLINE_CONTENT_FIELDS) {
    if (field in entry) {
      frontmatter[field] = entry[field];
    }
  }

  // Ensure id is in frontmatter
  const taskId = getTaskId(entry);
  if (taskId) {
    frontmatter.id = taskId;
  }

  // Build YAML frontmatter
  let yaml = "---\n";
  for (const [key, value] of Object.entries(frontmatter)) {
    yaml += `${key}: ${stringifyYaml(value).trim()}\n`;
  }
  yaml += "---\n";

  return yaml;
}

function buildTaskMdBody(entry: TaskEntry): string {
  const prompt = entry.prompt as string | undefined;
  if (prompt) {
    return `\n${prompt}\n`;
  }
  return `\nTask: ${getTaskId(entry) ?? "unknown"}\n`;
}

export function migrate0032(
  playbookDir: string,
  dry: boolean = false,
): Migrate0032Report {
  const playbookPath = join(playbookDir, "playbook.yml");

  if (!existsSync(playbookPath)) {
    return {
      playbook: playbookDir,
      tasksMigrated: 0,
      tasksAlreadyValid: 0,
      taskMdFilesCreated: [],
      playbookRewritten: false,
      errors: ["playbook.yml not found"],
      alreadyCompliant: false,
    };
  }

  const raw = readFileSync(playbookPath, "utf-8");
  const pb = parseYaml(raw) as PlaybookYaml;

  if (!pb || typeof pb !== "object" || Array.isArray(pb) || !pb.tasks) {
    return {
      playbook: playbookDir,
      tasksMigrated: 0,
      tasksAlreadyValid: 0,
      taskMdFilesCreated: [],
      playbookRewritten: false,
      errors: ["playbook.yml has no tasks: array"],
      alreadyCompliant: false,
    };
  }

  const report: Migrate0032Report = {
    playbook: pb.name ?? playbookDir.split("/").pop() ?? "unknown",
    tasksMigrated: 0,
    tasksAlreadyValid: 0,
    taskMdFilesCreated: [],
    playbookRewritten: false,
    errors: [],
    alreadyCompliant: true,
  };

  // Process each task entry
  for (const entry of pb.tasks) {
    const taskId = getTaskId(entry);
    if (!taskId) {
      report.errors.push("Task entry missing id/path/name");
      report.alreadyCompliant = false;
      continue;
    }

    if (!hasInlineContent(entry)) {
      report.tasksAlreadyValid++;
      continue;
    }

    report.alreadyCompliant = false;
    report.tasksMigrated++;

    // Create tasks/<id>/TASK.md
    const taskDir = join(playbookDir, "tasks", taskId);
    const taskMdPath = join(taskDir, "TASK.md");

    if (!dry) {
      mkdirSync(taskDir, { recursive: true });

      let body = "";
      if (existsSync(taskMdPath)) {
        // Merge: append migration note to existing content
        const existing = readFileSync(taskMdPath, "utf-8");
        body =
          existing +
          "\n\n<!-- Migrated by RFC 0032: inline fields moved to frontmatter -->\n";
      }

      const frontmatter = buildTaskMdFrontmatter(entry);
      const taskBody = body || buildTaskMdBody(entry);
      writeFileSync(taskMdPath, frontmatter + taskBody, "utf-8");
    }

    report.taskMdFilesCreated.push(taskMdPath);
  }

  // Rewrite playbook.yml to reference-only format
  if (!report.alreadyCompliant && !dry) {
    const newTasks = pb.tasks.map((entry) => {
      const taskId = getTaskId(entry);
      const ref: Record<string, unknown> = { id: taskId };
      if (entry.depends_on && entry.depends_on.length > 0) {
        ref.depends_on = entry.depends_on;
      }
      return ref;
    });

    // Preserve non-task fields
    const newPb: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(pb)) {
      if (key === "tasks") {
        newPb[key] = newTasks;
      } else {
        newPb[key] = value;
      }
    }

    const newYaml = stringifyYaml(newPb);
    writeFileSync(playbookPath, newYaml, "utf-8");
    report.playbookRewritten = true;
  }

  return report;
}

/** Discover all playbooks under .converge/playbooks/ */
export function discoverPlaybooks(workspace: string): string[] {
  const playbooksDir = join(workspace, ".converge", "playbooks");
  if (!existsSync(playbooksDir)) return [];

  return readdirSync(playbooksDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(playbooksDir, d.name))
    .filter((dir) => existsSync(join(dir, "playbook.yml")));
}
