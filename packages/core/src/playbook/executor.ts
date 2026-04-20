/**
 * Playbook Executor
 *
 * Copies tasks/ from the playbook template into .converge/epics/{epicId}/
 * with variable substitution. That's it.
 *
 * Both continuous and keyed playbooks use the same mechanism:
 * - Continuous: tasks/ has multiple TASK.md files with their own deps/wbs/checks
 * - Keyed: tasks/ has a root TASK.md with wbs: in frontmatter that spawns children
 *
 * The playbook executor doesn't know or care — it just copies and substitutes.
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { ResolvedPlaybook, PlaybookRunConfig } from "./types.ts";
import { substituteVars } from "./loader.ts";

/* ------------------------------------------------------------------ */
/*  Template Copy with Variable Substitution                           */
/* ------------------------------------------------------------------ */

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
      let content = await readFile(srcPath, "utf8");

      if (
        entry.name.endsWith(".md") ||
        entry.name.endsWith(".yml") ||
        entry.name.endsWith(".yaml")
      ) {
        content = substituteVars(content, vars);
      }

      await writeFile(destPath, content, "utf8");
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Epic Generation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Prepare a playbook for execution.
 *
 * Previously this copied the template into `.converge/epics/{epicId}/` to
 * isolate runtime state. That dual-layout caused:
 *   - double-discovery (scanner saw both playbook + epic copies)
 *   - id collisions across concurrent runs
 *   - a timestamp-suffixed epicId that nested journals as
 *     `journal/{playbook}/tasks/{playbook}-{timestamp}/...`
 *
 * Runtime state now lives IN-PLACE in `.converge/playbooks/{name}/tasks/`.
 * `installPlaybook` handles the initial copy+substitution; WBS spawns write
 * their children back into that same tree. Nothing under `.converge/epics/`
 * is read or written anymore.
 *
 * The returned path is the playbook's tasks root so callers expecting an
 * "epic dir" receive a stable, collision-free location.
 */
export async function generateEpicFromPlaybook(
  playbook: ResolvedPlaybook,
  projectDir: string,
): Promise<string> {
  const playbookDir = join(
    projectDir,
    ".converge",
    "playbooks",
    playbook.def.name,
  );

  // Ensure the playbook is installed (copies template + substitutes vars once).
  // Idempotent: installPlaybook skips if tasks/ already exists.
  await installPlaybook(playbook, projectDir);

  return playbookDir;
}

/**
 * Install a playbook template into .converge/playbooks/{name}/.
 * Copies playbook.yml and tasks/ with variable substitution.
 *
 * If the template tasks/ contains a root TASK.md (no subdirectories with
 * their own TASK.md), wraps the contents in a named subdirectory using
 * the epicId so the converge scanner can derive a proper task ID.
 *
 * Skips if already installed.
 */
export async function installPlaybook(
  playbook: ResolvedPlaybook,
  projectDir: string,
): Promise<string> {
  const playbookDir = join(
    projectDir,
    ".converge",
    "playbooks",
    playbook.def.name,
  );
  const tasksDir = join(playbookDir, "tasks");

  // Already installed — skip
  if (existsSync(tasksDir)) {
    return playbookDir;
  }

  await mkdir(tasksDir, { recursive: true });

  // Copy playbook.yml
  const srcYml = join(playbook.templateDir, "playbook.yml");
  if (existsSync(srcYml)) {
    let ymlContent = await readFile(srcYml, "utf8");
    ymlContent = substituteVars(ymlContent, playbook.vars);
    await writeFile(join(playbookDir, "playbook.yml"), ymlContent, "utf8");
  }

  // Copy tasks/ with variable substitution.
  // If the template has a root TASK.md directly in tasks/ (single-root playbook),
  // wrap contents into tasks/{epicId}/ so the scanner can derive a task ID.
  const templateTasksDir = join(playbook.templateDir, "tasks");
  if (existsSync(templateTasksDir)) {
    const hasRootTask = existsSync(join(templateTasksDir, "TASK.md"));
    const entries = await readdir(templateTasksDir, { withFileTypes: true });
    const hasSubdirTasks = entries.some(
      (e) =>
        e.isDirectory() &&
        existsSync(join(templateTasksDir, e.name, "TASK.md")),
    );

    if (hasRootTask && !hasSubdirTasks) {
      // Single-root: wrap into a named subdirectory with numeric prefix
      // so the converge scanner can derive a proper task ID.
      const taskDir = join(tasksDir, `001-${playbook.def.name}`);
      await copyWithSubstitution(templateTasksDir, taskDir, playbook.vars);
      // Inject playbook vars into the root TASK.md frontmatter so WBS scripts
      // can access them via ctx.vars at runtime.
      await injectVarsIntoTaskMd(join(taskDir, "TASK.md"), playbook.vars);
    } else {
      // Multi-task: copy directly
      await copyWithSubstitution(templateTasksDir, tasksDir, playbook.vars);
    }
  }

  return playbookDir;
}

/* ------------------------------------------------------------------ */
/*  Vars Injection into TASK.md Frontmatter                            */
/* ------------------------------------------------------------------ */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Inject playbook vars into a TASK.md's YAML frontmatter.
 * Adds a `vars:` block so WBS scripts can access them via ctx.vars.
 */
async function injectVarsIntoTaskMd(
  taskMdPath: string,
  vars: Record<string, string>,
): Promise<void> {
  if (!existsSync(taskMdPath) || Object.keys(vars).length === 0) return;

  const content = await readFile(taskMdPath, "utf8");
  const match = content.match(FRONTMATTER_RE);
  if (!match) return;

  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  frontmatter.vars = { ...vars };
  const newFrontmatter = stringifyYaml(frontmatter).trimEnd();
  const body = content.slice(match[0].length);
  await writeFile(taskMdPath, `---\n${newFrontmatter}\n---${body}`, "utf8");
}

/* ------------------------------------------------------------------ */
/*  Run Config Merging                                                 */
/* ------------------------------------------------------------------ */

/**
 * Merge playbook run config with CLI overrides.
 */
export function mergeRunConfig(
  playbookConfig?: PlaybookRunConfig,
  cliOverrides?: Partial<PlaybookRunConfig>,
): PlaybookRunConfig {
  const base = playbookConfig || {};
  const overrides = cliOverrides || {};

  return {
    mode: overrides.mode ?? base.mode ?? "autonomous",
    maxIterations: overrides.maxIterations ?? base.maxIterations,
    maxTaskAttempts: overrides.maxTaskAttempts ?? base.maxTaskAttempts,
    maxDuration: overrides.maxDuration ?? base.maxDuration,
    resume: overrides.resume ?? base.resume,
    maxGoals: overrides.maxGoals ?? base.maxGoals,
  };
}
