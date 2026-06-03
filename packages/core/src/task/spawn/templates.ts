/**
 * Template registry.
 *
 * A template is a directory under `<playbook>/templates/<name>/` containing:
 *
 *   - `TASK.md`     — the contract (required; with `{{param}}` interpolation)
 *   - `PARAMS.yml`  — optional explicit param schema (overrides inference)
 *   - `EXAMPLES.yml` — optional canonical invocations + selection guidance
 *
 * When `PARAMS.yml` is absent, params are inferred from `{{param}}`
 * references in TASK.md — each is required, type string.
 *
 * The registry is read at expansion time; the AI never edits templates.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export type TemplateParamType = "string" | "number" | "boolean";

export interface TemplateParam {
  type: TemplateParamType;
  required?: boolean;
  default?: string | number | boolean;
}

export interface TemplateExamples {
  examples?: Array<{
    name?: string;
    when_to_pick?: string;
    params?: Record<string, unknown>;
  }>;
  not_for?: string[];
}

export interface TemplateDef {
  name: string;
  taskMdPath: string;
  params: Record<string, TemplateParam>;
  /** Raw EXAMPLES.yml content (when present) — read by the planning skill,
   *  not by the framework itself. */
  examples?: TemplateExamples;
}

/**
 * Params provided by the framework — never declared on a template and
 * never required from the invocation. `taskId` is filled from the child's
 * directory name; bodies use it via `{{taskId}}`.
 */
const RESERVED_PARAMS = new Set(["taskId"]);

function inferParamsFromTaskMd(taskMdPath: string): Record<string, TemplateParam> {
  const text = readFileSync(taskMdPath, "utf-8");
  const out: Record<string, TemplateParam> = {};
  const re = /\{\{(\w+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = m[1]!;
    if (RESERVED_PARAMS.has(key)) continue;
    if (key in out) continue;
    out[key] = { type: "string", required: true };
  }
  return out;
}

/**
 * Parse `PARAMS.yml`. Expected shape:
 *
 *     params:
 *       foo: { type: string, required: true }
 *       bar: { type: number, default: 100 }
 *
 * Only entries under the `params:` key are read; everything else is
 * silently ignored so authors can keep notes alongside.
 */
function parseParamsYml(path: string): Record<string, TemplateParam> {
  const raw = readFileSync(path, "utf-8");
  const parsed = parseYaml(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  const root = parsed as Record<string, unknown>;
  const params = root.params;
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return {};
  }
  const out: Record<string, TemplateParam> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const v = value as Record<string, unknown>;
    const type = v.type === "number" || v.type === "boolean" ? v.type : "string";
    const entry: TemplateParam = { type };
    if (typeof v.required === "boolean") entry.required = v.required;
    if (v.default !== undefined) entry.default = v.default as string | number | boolean;
    out[key] = entry;
  }
  return out;
}

function parseExamplesYml(path: string): TemplateExamples | undefined {
  const raw = readFileSync(path, "utf-8");
  const parsed = parseYaml(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  return parsed as TemplateExamples;
}

export function loadTemplates(playbookDir: string): TemplateDef[] {
  const root = join(playbookDir, "templates");
  if (!existsSync(root)) return [];

  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }

  const out: TemplateDef[] = [];
  for (const name of entries) {
    const dir = join(root, name);
    let st;
    try {
      st = statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;

    const taskMdPath = join(dir, "TASK.md");
    if (!existsSync(taskMdPath)) continue;

    // PARAMS.yml wins over inference — authors use it to declare types
    // and defaults the `{{...}}` scan can't see.
    const paramsYmlPath = join(dir, "PARAMS.yml");
    const params = existsSync(paramsYmlPath)
      ? parseParamsYml(paramsYmlPath)
      : inferParamsFromTaskMd(taskMdPath);

    const examplesYmlPath = join(dir, "EXAMPLES.yml");
    const examples = existsSync(examplesYmlPath)
      ? parseExamplesYml(examplesYmlPath)
      : undefined;

    const def: TemplateDef = { name, taskMdPath, params };
    if (examples) def.examples = examples;
    out.push(def);
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function findTemplate(
  name: string,
  templates: TemplateDef[],
): TemplateDef | undefined {
  return templates.find((t) => t.name === name);
}
