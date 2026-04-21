/**
 * Dispatch Runner — runs the playbook's root WBS to stamp a new task.
 *
 * When `--add` is called, invokes the WBS script declared in the
 * playbook's root TASK.md. The WBS uses ctx.spawn to create child
 * tasks under the playbook's tasks/ directory.
 */

import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WbsConfig {
  type: string;
  path: string;
}

interface SpawnRef {
  _type: "template-ref";
  path: string;
  vars: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Run the playbook's root WBS to stamp a new task.
 *
 * Reads TASK.md at playbook root, finds the wbs script, and invokes it
 * with a ctx that supports spawn (which copies the template into tasks/).
 */
export async function stampDispatchTask(
  playbookDir: string,
  vars: Record<string, string>,
): Promise<string> {
  const taskMdPath = join(playbookDir, "TASK.md");
  if (!existsSync(taskMdPath)) {
    throw new Error(`No TASK.md found at playbook root: ${playbookDir}`);
  }

  // Parse TASK.md frontmatter to find wbs path
  const content = await readFile(taskMdPath, "utf-8");
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    throw new Error(`No frontmatter in ${taskMdPath}`);
  }
  const frontmatter = parseYaml(fmMatch[1]) as Record<string, unknown>;
  const wbs = frontmatter.wbs as WbsConfig | undefined;
  if (!wbs?.path) {
    throw new Error(`No wbs.path in ${taskMdPath}`);
  }

  // Resolve wbs script path relative to TASK.md
  const wbsPath = resolve(playbookDir, wbs.path);
  if (!existsSync(wbsPath)) {
    throw new Error(`WBS script not found: ${wbsPath}`);
  }

  // Resolve project dir (playbook is at .converge/playbooks/<name>/)
  const projectDir = resolve(playbookDir, "../../..");
  const tasksDir = join(playbookDir, "tasks");

  // Build a minimal ctx for the WBS
  let spawnedDir = "";
  const ctx = {
    projectDir,
    vars: { ...vars, projectDir },
    async spawn(
      ref: SpawnRef | Record<string, string>,
      opts: { id: string },
    ) {
      if ("_type" in ref && ref._type === "template-ref") {
        // Copy template into tasks/<id>/
        const templateMdPath = resolve(projectDir, ref.path);
        const templateDir = dirname(templateMdPath);
        const destDir = join(tasksDir, opts.id);
        const vars = (ref as SpawnRef).vars;
        await copyWithSubstitution(templateDir, destDir, vars);
        spawnedDir = destDir;
      }
    },
  };

  // Import and run the WBS
  const wbsModule = await import(wbsPath);
  await wbsModule.run(ctx);

  if (!spawnedDir) {
    throw new Error("WBS did not spawn any tasks");
  }

  return spawnedDir;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Recursively copy a directory with {{var}} substitution in .md/.yml files.
 */
async function copyWithSubstitution(
  srcDir: string,
  destDir: string,
  vars: Record<string, string>,
): Promise<void> {
  await mkdir(destDir, { recursive: true });

  const entries = await readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      await copyWithSubstitution(srcPath, destPath, vars);
    } else if (entry.isFile()) {
      let content = await readFile(srcPath, "utf-8");

      if (
        entry.name.endsWith(".md") ||
        entry.name.endsWith(".yml") ||
        entry.name.endsWith(".yaml")
      ) {
        content = substituteVars(content, vars);
      }

      await writeFile(destPath, content, "utf-8");
    }
  }
}

/**
 * Replace {{var}} placeholders in content.
 */
function substituteVars(
  content: string,
  vars: Record<string, string>,
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}
