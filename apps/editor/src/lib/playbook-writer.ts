import "server-only";
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { Document } from "yaml";
import { resolveProjectRoot } from "@/lib/core";
import type { PlaybookDraft } from "@/lib/ai-draft";

export class PlaybookWriteError extends Error {
  constructor(
    message: string,
    public readonly code: "exists" | "io_error",
  ) {
    super(message);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write a drafted playbook under `<root>/.converge/playbooks/<slug>/`.
 * Refuses to overwrite an existing playbook directory.
 */
export async function writePlaybookDraft(
  draft: PlaybookDraft,
): Promise<{ root: string; playbookDir: string; taskCount: number }> {
  const root = resolveProjectRoot();
  const playbooksRoot = join(root, ".converge", "playbooks");
  const playbookDir = join(playbooksRoot, draft.name);

  if (await exists(playbookDir)) {
    throw new PlaybookWriteError(
      `Playbook "${draft.name}" already exists at ${playbookDir}; refusing to overwrite.`,
      "exists",
    );
  }

  // playbook.yml
  await mkdir(playbookDir, { recursive: true });
  await writeFile(
    join(playbookDir, "playbook.yml"),
    renderPlaybookYaml(draft),
    "utf8",
  );

  // tasks/<id>/TASK.md per task
  const tasksDir = join(playbookDir, "tasks");
  await mkdir(tasksDir, { recursive: true });

  let taskCount = 0;
  for (const task of draft.tasks) {
    const taskDir = join(tasksDir, task.id);
    await mkdir(taskDir, { recursive: true });
    await writeFile(
      join(taskDir, "TASK.md"),
      renderTaskMd(task),
      "utf8",
    );
    taskCount++;
  }

  return { root, playbookDir, taskCount };
}

function renderPlaybookYaml(draft: PlaybookDraft): string {
  const doc = new Document({
    name: draft.name,
    description: draft.description,
    run: {
      mode: draft.mode,
    },
  });
  return doc.toString();
}

function renderTaskMd(task: PlaybookDraft["tasks"][number]): string {
  const data: Record<string, unknown> = {
    id: task.id,
    title: task.title,
  };
  if (task.description) data.description = task.description;
  if (task.blocking) data.blocking = true;
  if (task.dependencies.length > 0) data.dependencies = task.dependencies;
  if (task.inputs.length > 0) data.inputs = task.inputs;
  if (task.outputs.length > 0) data.outputs = task.outputs;
  if (task.tags.length > 0) data.tags = task.tags;
  if (task.checks.length > 0) {
    data.checks = task.checks.map((c) => ({
      id: c.id,
      cmd: c.cmd,
      description: c.description,
    }));
  }

  const doc = new Document(data);
  const frontmatter = doc.toString().replace(/\n$/, "");
  return `---\n${frontmatter}\n---\n\n${task.body.trim()}\n`;
}
