/**
 * Seed Target Utilities
 *
 * Pure helpers for normalizing SeedSpawnTarget → TaskMdShape.
 * Extracted from the (removed) V1 SeedExecutor so consumers that only need
 * target resolution (e.g. goal-planner) don't depend on executor internals.
 */

import type {
  SeedSpawnTarget,
  SeedSpawnOptions,
  SeedContext,
  TaskDefinition,
  Check,
  RawMarkdown,
  TemplateRef,
} from "../config/task-definition.ts";
import { TaskDefinitionBuilder } from "../config/task-definition.ts";
import type { TaskMdShape } from "../config/task-md-definition.ts";
import { parseTaskMdString } from "../config/task-md-definition.ts";

/**
 * Convert a TaskDefinition to a TaskMdShape for uniform serialization.
 */
export function taskDefToMdShape(def: TaskDefinition): TaskMdShape {
  const skills = def.skill
    ? Array.isArray(def.skill)
      ? def.skill
      : [def.skill]
    : undefined;

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

  const checks = Array.isArray(def.checks)
    ? (def.checks as Check[]).map((c) => ({
        id: c.id,
        cmd: c.cmd,
        description: c.description,
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
    checks,
    depends_on: def.depends_on,
    blocking: def.blocking,
    tags: def.tags,
    vars: def.vars,
    plan,
    materialization: def.materialization,
    body: typeof def.prompt === "string" ? def.prompt : undefined,
  };
}

function isBuilder(t: unknown): t is TaskDefinitionBuilder {
  return (
    typeof t === "object" &&
    t !== null &&
    "def" in t &&
    typeof (t as any).build === "function"
  );
}

/**
 * Resolve a SeedSpawnTarget to a TaskMdShape for writing.
 */
export async function resolveSeedTarget(
  target: SeedSpawnTarget,
  opts: SeedSpawnOptions | undefined,
  ctx: SeedContext,
): Promise<TaskMdShape> {
  if (
    typeof target === "object" &&
    target !== null &&
    (target as any)._type === "raw-markdown"
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

  if (
    typeof target === "object" &&
    target !== null &&
    (target as any)._type === "template-ref"
  ) {
    const ref = target as TemplateRef;
    const { readFile: readFileAsync } = await import("node:fs/promises");
    const { resolve: resolvePath } = await import("node:path");
    const templatePath = resolvePath(ctx.projectDir, ref.path);
    let raw = await readFileAsync(templatePath, "utf-8");

    if (ref.vars && Object.keys(ref.vars).length > 0) {
      raw = raw.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
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
      checks: opts?.checks,
    };
  }

  if (typeof target === "function") {
    const result = (target as Function)(ctx);
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
    return taskDefToMdShape(resolved as TaskDefinition);
  }

  if (target instanceof TaskDefinitionBuilder || isBuilder(target)) {
    return taskDefToMdShape((target as TaskDefinitionBuilder).build());
  }

  if (
    typeof target === "object" &&
    target !== null &&
    typeof (target as any).id === "string"
  ) {
    const obj = target as any;
    if (
      obj.skill !== undefined ||
      obj.seedFn !== undefined ||
      obj.planConfig !== undefined
    ) {
      return taskDefToMdShape(obj as TaskDefinition);
    }
    return obj as TaskMdShape;
  }

  throw new Error("ctx.spawn() received an unrecognized target type");
}
