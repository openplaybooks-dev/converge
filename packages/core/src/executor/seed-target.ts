/**
 * Seed target resolution and serialization — the "what does the seed
 * function want to spawn?" boundary.
 *
 * The seed API (`ctx.spawn(target, opts)`) accepts a wide variety of
 * target shapes:
 *
 *   - RawMarkdown (rawMd("---\nid: ...\n---\nbody"))
 *   - TemplateRef (template("path/to/tpl.md", { vars }))
 *   - skill name as string
 *   - factory function (ctx) => TaskDefinition | string
 *   - TaskDefinitionBuilder
 *   - plain TaskMdShape or TaskDefinition object
 *
 * `resolveSeedTarget` normalizes all six into a `TaskMdShape`.
 * `taskDefToMdShape` projects a TaskDefinition into the same shape.
 * `writeTaskMdToFile` serializes a shape to disk via the canonical
 * `serializeTaskMd` (YAML library) — no hand-written quoting.
 *
 * Extracted from `seed-executor.ts` so that file can focus on the
 * actual seed-execution lifecycle. Public API exports unchanged.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve as resolvePath } from "node:path";
import { readFile as readFileAsync } from "node:fs/promises";

import { TaskDefinitionBuilder } from "../config/task-definition.ts";
import type {
  TaskDefinition,
  Check,
  SeedSpawnTarget,
  SeedSpawnOptions,
  SeedContext,
  RawMarkdown,
  TemplateRef,
} from "../config/task-definition.ts";
import type { TaskMdShape } from "../config/task-md-definition.ts";
import {
  parseTaskMdString,
  serializeTaskMd,
} from "../config/task-md-definition.ts";

/**
 * Convert a TaskDefinition to a TaskMdShape for uniform serialization.
 */
export function taskDefToMdShape(def: TaskDefinition): TaskMdShape {
  const skills = def.skill
    ? Array.isArray(def.skill)
      ? def.skill
      : [def.skill]
    : undefined;

  // Map planConfig → plan (TaskMdPlan)
  let plan: TaskMdShape["plan"] | undefined;
  if (def.planConfig) {
    plan = {};
    if (def.planConfig.prompt) {
      plan.prompt =
        typeof def.planConfig.prompt === "string"
          ? def.planConfig.prompt
          : "[dynamic-function]";
    }
    if (def.planConfig.output) plan.output = def.planConfig.output;
    if (def.planConfig.outputPrompt) {
      plan.outputPrompt =
        typeof def.planConfig.outputPrompt === "string"
          ? def.planConfig.outputPrompt
          : "[dynamic-function]";
    }
  }

  // Map tests — only static Check[] can be serialized
  const tests = Array.isArray(def.checks)
    ? (def.checks as Check[]).map((c) => ({
        id: c.id,
        name: c.name,
        cmd: c.cmd,
        description: c.description ?? c.id,
        args: c.args,
        type: c.type,
      }))
    : undefined;

  return {
    id: def.id,
    title: def.title,
    description: def.description,
    agent: def.agent,
    skills,
    inputs: def.inputs,
    outputs: def.outputs,
    tests,
    depends_on: def.depends_on,
    blocking: def.blocking,
    tags: def.tags,
    vars: def.vars,
    plan,
    seed:
      def.seed &&
      typeof def.seed === "object" &&
      (def.seed as { mode?: unknown }).mode === "cli"
        ? ({ mode: "cli" } satisfies TaskMdShape["seed"])
        : undefined,
    body: typeof def.prompt === "string" ? def.prompt : undefined,
  };
}

/**
 * Writes a TaskMdShape or TaskDefinition as a TASK.md file:
 *   - YAML frontmatter block via `serializeTaskMd` (yaml library)
 *   - Markdown body (the prompt/body string)
 *
 * The scanner discovers these files at {parent_basename}/{id}/TASK.md as
 * executable tasks. Delegates to `serializeTaskMd` from
 * config/task-md-definition.ts — uses the `yaml` library for emission so
 * special characters round-trip safely. The previous per-field
 * string-concatenation implementation had known bugs around multi-line
 * strings, args dict keys, and trailing whitespace; those are no longer
 * possible.
 */
export async function writeTaskMdToFile(
  projectDir: string,
  def: TaskMdShape | TaskDefinition,
  relPath: string,
): Promise<void> {
  // Normalize to TaskMdShape
  const shape: TaskMdShape = isTaskMdShape(def)
    ? def
    : taskDefToMdShape(def as TaskDefinition);

  const absPath = join(projectDir, relPath);
  await mkdir(dirname(absPath), { recursive: true });

  // serializeTaskMd handles the full TaskMdShape: title (defaults to id),
  // skills, depends_on, blocking, tags, inputs, outputs, tests/checks,
  // needs, executor, seeds, plan, materialization, materials, vars, body.
  const withTitle = shape.title ? shape : { ...shape, title: shape.title ?? shape.id };
  const content = serializeTaskMd(withTitle);
  await writeFile(absPath, content, "utf-8");
}

/** Type guard: is this a TaskMdShape (has `id` as string, no builder/function traits)? */
export function isTaskMdShape(t: unknown): t is TaskMdShape {
  return (
    typeof t === "object" &&
    t !== null &&
    typeof (t as { id?: unknown }).id === "string" &&
    typeof (t as { build?: unknown }).build !== "function" &&
    (t as { _type?: unknown })._type === undefined
  );
}

function isBuilder(t: unknown): t is TaskDefinitionBuilder {
  return (
    typeof t === "object" &&
    t !== null &&
    "def" in t &&
    typeof (t as { build?: unknown }).build === "function"
  );
}

/**
 * Resolve a SeedSpawnTarget to a TaskMdShape for writing.
 *
 * Detection order:
 *   1. RawMarkdown   (tagged _type: 'raw-markdown')
 *   2. TemplateRef   (tagged _type: 'template-ref')
 *   3. string        → skill name (or extracted id from path)
 *   4. function      → call; string result → markdown, else TaskDefinition
 *   5. TaskDefinitionBuilder → .build() → taskDefToMdShape()
 *   6. Plain object with `id` string → TaskMdShape (covers TaskMdShape
 *      and TaskDefinition)
 */
export async function resolveSeedTarget(
  target: SeedSpawnTarget,
  opts: SeedSpawnOptions | undefined,
  ctx: SeedContext,
): Promise<TaskMdShape> {
  // 1. RawMarkdown
  if (
    typeof target === "object" &&
    target !== null &&
    (target as RawMarkdown)._type === "raw-markdown"
  ) {
    const raw = target as RawMarkdown;
    const shape = parseTaskMdString(raw.content);
    if (opts?.id) shape.id = opts.id;
    if (!shape.id)
      throw new Error(
        "rawMd() spawn requires an id (set in frontmatter or via opts.id)",
      );
    return shape;
  }

  // 2. TemplateRef
  if (
    typeof target === "object" &&
    target !== null &&
    (target as TemplateRef)._type === "template-ref"
  ) {
    const ref = target as TemplateRef;
    const templatePath = resolvePath(ctx.projectDir, ref.path);
    let raw = await readFileAsync(templatePath, "utf-8");

    // Substitute {{var}} placeholders before parsing
    if (ref.vars && Object.keys(ref.vars).length > 0) {
      raw = raw.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (!(key in ref.vars!)) {
          throw new Error(
            `Template '${ref.path}' references undefined variable '{{${key}}}'. ` +
              `Available vars: ${Object.keys(ref.vars!).join(", ")}`,
          );
        }
        const value = ref.vars![key];
        return value == null ? "" : String(value);
      });
    }

    const shape = parseTaskMdString(raw);
    if (opts?.id) shape.id = opts.id;
    if (ref.vars) shape.vars = { ...shape.vars, ...ref.vars };
    if (!shape.id)
      throw new Error(
        `template('${ref.path}') spawn requires an id (set in frontmatter or via opts.id)`,
      );
    return shape;
  }

  // 3. String → skill name
  if (typeof target === "string") {
    let extractedId: string | undefined;

    if (target.includes("/task/") || target.includes("/epics/")) {
      const match = target.match(
        /[\\/]([^\\/]+)[\\/](?:task\.ts|TASK\.md|SKILL\.md)$/,
      );
      if (match) extractedId = match[1];
    }

    const id = opts?.id ?? extractedId;
    if (!id) {
      throw new Error(
        `ctx.spawn('${target}', opts) requires opts.id when the target is a skill name or ID cannot be auto-extracted from path.`,
      );
    }

    const skillName = target.includes("/skills/")
      ? target.replace(/^.*[\\/]([^\\/]+)([\\/](?:TASK|SKILL)\.md)?$/, "$1")
      : undefined;

    return {
      id,
      title: opts?.label ?? id,
      skills: skillName ? [skillName] : undefined,
      agent: opts?.agent,
      body: opts?.prompt,
      inputs: opts?.inputs,
      outputs: opts?.outputs,
      vars: opts?.vars,
      tests: opts?.checks?.map((check) => ({
        ...check,
        description: check.description ?? check.id,
      })),
    };
  }

  // 4. Function → call it; string result → markdown, else TaskDefinition
  if (typeof target === "function") {
    const result = (target as (c: SeedContext) => unknown)(ctx);
    const resolved = result instanceof Promise ? await result : result;
    if (typeof resolved === "string") {
      const shape = parseTaskMdString(resolved);
      if (opts?.id) shape.id = opts.id;
      if (!shape.id)
        throw new Error(
          "(ctx) => string spawn requires an id (set in frontmatter or via opts.id)",
        );
      return shape;
    }
    // Factory returning TaskDefinition
    return taskDefToMdShape(resolved as TaskDefinition);
  }

  // 5. TaskDefinitionBuilder
  if (target instanceof TaskDefinitionBuilder || isBuilder(target)) {
    return taskDefToMdShape((target as TaskDefinitionBuilder).build());
  }

  // 6. Plain object with `id` — either TaskMdShape or TaskDefinition
  if (
    typeof target === "object" &&
    target !== null &&
    typeof (target as { id?: unknown }).id === "string"
  ) {
    // If it has TaskDefinition-specific fields, convert
    const obj = target as TaskDefinition & { seedFn?: unknown; planConfig?: unknown };
    if (
      obj.skill !== undefined ||
      obj.seedFn !== undefined ||
      obj.planConfig !== undefined
    ) {
      return taskDefToMdShape(obj as TaskDefinition);
    }
    // Treat as TaskMdShape directly
    return obj as unknown as TaskMdShape;
  }

  throw new Error("ctx.spawn() received an unrecognized target type");
}
