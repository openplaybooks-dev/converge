import "server-only";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import matter from "gray-matter";

export interface ScannedTask {
  id: string;
  title?: string;
  description?: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  tags: string[];
  blocking?: boolean;
  checks: { id: string; cmd?: string; description?: string }[];
  filePath: string;
  body: string;
}

export interface ScannedArtifact {
  glob: string;
  producedBy: string[];
  consumedBy: string[];
}

const TASK_FILENAME = "TASK.md";
const MAX_DEPTH = 6;

async function walkTasks(
  dir: string,
  templateRoot: string,
  depth: number,
  out: { absPath: string; relPath: string }[],
): Promise<void> {
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkTasks(abs, templateRoot, depth + 1, out);
    } else if (entry.isFile() && entry.name === TASK_FILENAME) {
      out.push({ absPath: abs, relPath: relative(templateRoot, abs) });
    }
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseChecks(value: unknown): ScannedTask["checks"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      cmd: typeof entry.cmd === "string" ? entry.cmd : undefined,
      description:
        typeof entry.description === "string" ? entry.description : undefined,
    }))
    .filter((c) => c.id.length > 0);
}

function deriveIdFromPath(relPath: string, fallback: string): string {
  const dir = relPath.split("/").slice(0, -1).pop();
  return dir && dir.length > 0 ? dir : fallback;
}

export async function scanTasks(templateDir: string): Promise<ScannedTask[]> {
  const tasksDir = join(templateDir, "tasks");
  try {
    await stat(tasksDir);
  } catch {
    // Some playbooks (keyed/dispatch) put TASK.md at the root only.
    const rootTask = join(templateDir, TASK_FILENAME);
    try {
      await stat(rootTask);
      return [await readScannedTask(rootTask, templateDir)];
    } catch {
      return [];
    }
  }

  const found: { absPath: string; relPath: string }[] = [];
  await walkTasks(tasksDir, templateDir, 0, found);

  // Also pick up a root-level TASK.md if present (keyed playbooks).
  const rootTask = join(templateDir, TASK_FILENAME);
  try {
    await stat(rootTask);
    found.unshift({ absPath: rootTask, relPath: TASK_FILENAME });
  } catch {
    // ignore
  }

  const tasks = await Promise.all(
    found.map((f) => readScannedTask(f.absPath, templateDir)),
  );

  // Stable order: by file path
  tasks.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return tasks;
}

async function readScannedTask(
  absPath: string,
  templateDir: string,
): Promise<ScannedTask> {
  const raw = await readFile(absPath, "utf8");
  const { data, content } = matter(raw);
  const relPath = relative(templateDir, absPath);
  const id =
    typeof data.id === "string" && data.id.length > 0
      ? data.id
      : deriveIdFromPath(relPath, relPath);

  return {
    id,
    title: typeof data.title === "string" ? data.title : undefined,
    description:
      typeof data.description === "string" ? data.description : undefined,
    inputs: asStringArray(data.inputs),
    outputs: asStringArray(data.outputs),
    dependencies: asStringArray(data.dependencies ?? data.depends_on),
    tags: asStringArray(data.tags),
    blocking: typeof data.blocking === "boolean" ? data.blocking : undefined,
    checks: parseChecks(data.checks),
    filePath: relPath,
    body: content,
  };
}

export function deriveArtifacts(tasks: ScannedTask[]): ScannedArtifact[] {
  const map = new Map<string, ScannedArtifact>();

  function touch(glob: string): ScannedArtifact {
    let entry = map.get(glob);
    if (!entry) {
      entry = { glob, producedBy: [], consumedBy: [] };
      map.set(glob, entry);
    }
    return entry;
  }

  for (const task of tasks) {
    for (const out of task.outputs) {
      const artifact = touch(out);
      if (!artifact.producedBy.includes(task.id)) {
        artifact.producedBy.push(task.id);
      }
    }
    for (const inp of task.inputs) {
      const artifact = touch(inp);
      if (!artifact.consumedBy.includes(task.id)) {
        artifact.consumedBy.push(task.id);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.glob.localeCompare(b.glob));
}

export function deriveDataFlowEdges(
  tasks: ScannedTask[],
): { from: string; to: string; via: string }[] {
  const edges: { from: string; to: string; via: string }[] = [];
  for (const producer of tasks) {
    for (const out of producer.outputs) {
      for (const consumer of tasks) {
        if (consumer.id === producer.id) continue;
        if (consumer.inputs.includes(out)) {
          edges.push({ from: producer.id, to: consumer.id, via: out });
        }
      }
    }
  }
  return edges;
}
