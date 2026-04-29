import "server-only";
import { readFile, writeFile, rename } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { scanTasks, type ScannedTask } from "@/lib/tasks-scanner";
import { resolveProjectRoot } from "@/lib/core";
import {
  applyFrontmatterPatch,
  type FrontmatterPatch,
} from "@/lib/frontmatter";
import { loadPlaybook } from "@converge/core/studio-api";

export interface TaskPatch {
  title?: string;
  description?: string;
  inputs?: string[];
  outputs?: string[];
  dependencies?: string[];
  tags?: string[];
  blocking?: boolean | null;
}

export class TaskWriteError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "playbook_not_found"
      | "task_not_found"
      | "path_escape"
      | "invalid_payload",
  ) {
    super(message);
  }
}

function ensureInside(parent: string, child: string): void {
  const p = resolve(parent) + sep;
  const c = resolve(child);
  if (!c.startsWith(p)) {
    throw new TaskWriteError(
      `Refused to write outside playbook dir (${child})`,
      "path_escape",
    );
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function validatePatch(input: unknown): TaskPatch {
  if (!input || typeof input !== "object") {
    throw new TaskWriteError("Body must be an object", "invalid_payload");
  }
  const o = input as Record<string, unknown>;
  const out: TaskPatch = {};
  if ("title" in o) {
    if (o.title !== undefined && typeof o.title !== "string") {
      throw new TaskWriteError("title must be string", "invalid_payload");
    }
    out.title = o.title as string | undefined;
  }
  if ("description" in o) {
    if (o.description !== undefined && typeof o.description !== "string") {
      throw new TaskWriteError("description must be string", "invalid_payload");
    }
    out.description = o.description as string | undefined;
  }
  for (const k of ["inputs", "outputs", "dependencies", "tags"] as const) {
    if (k in o) {
      if (!isStringArray(o[k])) {
        throw new TaskWriteError(`${k} must be string[]`, "invalid_payload");
      }
      out[k] = o[k] as string[];
    }
  }
  if ("blocking" in o) {
    if (
      o.blocking !== undefined &&
      o.blocking !== null &&
      typeof o.blocking !== "boolean"
    ) {
      throw new TaskWriteError(
        "blocking must be boolean or null",
        "invalid_payload",
      );
    }
    out.blocking = o.blocking as boolean | null | undefined;
  }
  return out;
}

/**
 * Project the typed TaskPatch onto the loose FrontmatterPatch shape the
 * frontmatter helper takes. Only keys actually present on the patch are
 * forwarded; everything else stays untouched in the file.
 */
function toFrontmatterPatch(patch: TaskPatch): FrontmatterPatch {
  const out: FrontmatterPatch = {};
  if ("title" in patch) out.title = patch.title;
  if ("description" in patch) out.description = patch.description;
  if ("inputs" in patch) out.inputs = patch.inputs;
  if ("outputs" in patch) out.outputs = patch.outputs;
  if ("dependencies" in patch) out.dependencies = patch.dependencies;
  if ("tags" in patch) out.tags = patch.tags;
  if ("blocking" in patch) out.blocking = patch.blocking;
  return out;
}

async function findTaskFile(
  templateDir: string,
  taskId: string,
): Promise<ScannedTask | null> {
  const tasks = await scanTasks(templateDir);
  return tasks.find((t) => t.id === taskId) ?? null;
}

export async function writeTaskPatch(
  playbookName: string,
  taskId: string,
  patch: TaskPatch,
): Promise<ScannedTask> {
  const root = resolveProjectRoot();
  const source = await loadPlaybook(playbookName, root);
  if (!source) {
    throw new TaskWriteError(
      `Playbook "${playbookName}" not found`,
      "playbook_not_found",
    );
  }

  const task = await findTaskFile(source.templateDir, taskId);
  if (!task) {
    throw new TaskWriteError(
      `Task "${taskId}" not found in "${playbookName}"`,
      "task_not_found",
    );
  }

  const absPath = join(source.templateDir, task.filePath);
  ensureInside(source.templateDir, absPath);

  const raw = await readFile(absPath, "utf8");
  const nextRaw = applyFrontmatterPatch(raw, toFrontmatterPatch(patch));

  const tmpPath = `${absPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmpPath, nextRaw, "utf8");
  await rename(tmpPath, absPath);

  // Re-scan so the response reflects what's on disk.
  const updated = await findTaskFile(source.templateDir, taskId);
  if (!updated) {
    throw new TaskWriteError(
      `Task "${taskId}" disappeared after write`,
      "task_not_found",
    );
  }
  return updated;
}
