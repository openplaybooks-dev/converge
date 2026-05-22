/**
 * Shared task rendering utilities.
 *
 * Provides `renderChildTaskMd` and `buildChildVars` — the same rendering
 * logic used by `spawnOne` (CLI) and `syncLedgerToDag` (core) so both paths
 * produce identical TASK.md content from the same template+params inputs.
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { parseTaskMdString, serializeTaskMd } from "../../config/task-md-definition.ts";
import { assertSafeId } from "../goal/safe-id.ts";

export interface BuildChildVarsOptions {
  templateVars: Record<string, unknown> | undefined;
  noInherit: boolean;
  explicitVars: Record<string, string>;
  envWave?: string;
  inheritedVars?: Record<string, string>;
}

export interface BuildChildVarsResult {
  vars: Record<string, unknown>;
  missing: string[];
}

/**
 * Build the merged vars map for a spawned child.
 *
 * Two modes — determined by whether the template declares `vars:`:
 *
 * STRICT mode (template declares `vars:` block):
 *   The declared keys form a typed contract. Only those keys flow into
 *   the child. Each declared key gets its value from this precedence
 *   chain (lowest → highest):
 *     1. Template's declared default (the right-hand side of `vars: { k: v }`)
 *     2. Parent's CONVERGE_VAR_<KEY> env (unless noInherit)
 *     3. Auto-injected wave (only for key 'wave' from CONVERGE_TASK_WAVE)
 *     4. Spec-level --var overrides (caller's explicit intent)
 *
 *   A key with NO default (declared as `key:` with no value, or `null`)
 *   is REQUIRED. If no value reaches it after the chain, spawn fails
 *   with a precise "missing required var" error pointing at the template.
 *
 *   Parent vars NOT in the template's declaration are dropped silently —
 *   they don't leak into the child. This makes the child template
 *   self-documenting and safe to refactor.
 *
 * PERMISSIVE mode (template has no `vars:` block):
 *   Today's behavior — every parent CONVERGE_VAR_* flows in, plus
 *   auto-wave, plus --var. No filtering, no validation. Use when the
 *   child is a generic forwarder or needs whatever context is in scope.
 *
 * Returns { vars, missing }. `missing` is the list of required keys
 * that had no value; non-empty means the caller should fail the spawn.
 */
export function buildChildVars(opts: BuildChildVarsOptions): BuildChildVarsResult {
  const hasContract =
    opts.templateVars !== undefined &&
    opts.templateVars !== null &&
    typeof opts.templateVars === "object" &&
    Object.keys(opts.templateVars).length > 0;

  const inherited = opts.noInherit ? {} : (opts.inheritedVars ?? collectInheritedVars());
  const envWave = opts.envWave;

  const isMissingDefault = (v: unknown): boolean =>
    v === null || v === undefined || v === "";

  if (hasContract) {
    const declared = opts.templateVars as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const missing: string[] = [];

    for (const key of Object.keys(declared)) {
      const templateDefault = declared[key];

      let value: unknown =
        isMissingDefault(templateDefault) ? undefined : templateDefault;

      const envKey = `CONVERGE_VAR_${key.toUpperCase()}`;
      if (inherited[key.toLowerCase()] !== undefined) {
        value = inherited[key.toLowerCase()];
      } else if (process.env[envKey] !== undefined) {
        value = process.env[envKey];
      }

      if (
        key === "wave" &&
        envWave !== undefined &&
        envWave !== "" &&
        !("wave" in opts.explicitVars)
      ) {
        value = envWave;
      }

      if (key in opts.explicitVars) {
        value = opts.explicitVars[key];
      }

      if (value === undefined || value === "") {
        missing.push(key);
      } else {
        out[key] = value;
      }
    }

    return { vars: out, missing };
  }

  const out: Record<string, unknown> = {};

  if (!opts.noInherit) {
    Object.assign(out, inherited);
  }
  if (
    envWave !== undefined &&
    envWave !== "" &&
    !("wave" in opts.explicitVars)
  ) {
    out.wave = envWave;
  }
  for (const [k, v] of Object.entries(opts.explicitVars)) {
    out[k] = v;
  }

  return { vars: out, missing: [] };
}

/**
 * Collect the parent's CONVERGE_VAR_* env vars into a record.
 */
export function collectInheritedVars(): Record<string, string> {
  const inherited: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith("CONVERGE_VAR_") || v === undefined) continue;
    const key = k.slice("CONVERGE_VAR_".length).toLowerCase();
    if (!key) continue;
    inherited[key] = v;
  }
  return inherited;
}

export interface RenderChildTaskMdOptions {
  templatePath: string;
  childId: string;
  dependsOn: string[];
  inheritedExplicitVars: Record<string, string>;
  noInherit: boolean;
}

export interface RenderChildTaskMdResult {
  content: string;
  missing: string[];
}

/**
 * Render a child's TASK.md from a template by overlaying:
 *   - the child's own id (replaces the template's id)
 *   - the merged vars (template ∪ inherited ∪ auto-wave ∪ explicit)
 *   - the depends_on list (sibling ordering via --after / --depends-on)
 *
 * Returns the rendered TASK.md string ready to write into the journal.
 */
export function renderChildTaskMd(
  opts: RenderChildTaskMdOptions,
  envWave?: string,
): RenderChildTaskMdResult {
  const raw = readFileSync(opts.templatePath, "utf-8");
  let shape;
  try {
    shape = parseTaskMdString(raw);
  } catch (err) {
    throw new Error(
      `template '${opts.templatePath}' has invalid frontmatter: ${
        (err as Error)?.message ?? err
      }`,
    );
  }

  const templateVars =
    shape.vars && typeof shape.vars === "object" ? shape.vars : undefined;
  const { vars: mergedVars, missing } = buildChildVars({
    templateVars,
    noInherit: opts.noInherit,
    explicitVars: opts.inheritedExplicitVars,
    envWave,
  });

  const mergedDeps = (() => {
    if (opts.dependsOn.length === 0) return shape.depends_on;
    const existing = shape.depends_on ?? [];
    const merged = [...existing];
    for (const d of opts.dependsOn) if (!merged.includes(d)) merged.push(d);
    return merged;
  })();

  // Simple {{placeholder}} replacement in the body.
  // No Handlebars dependency — just replace {{key}} with mergedVars[key].
  const templateBody = shape.body ?? "";
  const compiledBody = templateBody.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in mergedVars) {
      return String(mergedVars[key]);
    }
    return match; // Leave unresolved placeholders as-is
  });

  const content = serializeTaskMd({
    ...shape,
    id: opts.childId,
    depends_on: mergedDeps,
    vars: Object.keys(mergedVars).length > 0 ? mergedVars : undefined,
    body: compiledBody,
  });

  return { content, missing };
}

/**
 * Validate that a rendered TASK.md has well-formed YAML frontmatter.
 * Returns null on success, or a string describing the failure.
 */
export function validateTaskMdFrontmatter(content: string): string | null {
  if (!content.startsWith("---")) return null;
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    return "frontmatter starts with `---` but is not closed by a matching `---` delimiter on its own line";
  }
  const fm = m[1];
  try {
    const parsed = parseYaml(fm);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "frontmatter must parse to a mapping (key: value pairs)";
    }
    const obj = parsed as Record<string, unknown>;
    for (const key of [
      "outputs",
      "inputs",
      "checks",
      "depends_on",
      "tags",
      "skills",
    ] as const) {
      if (
        obj[key] !== undefined &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        return `frontmatter key '${key}' must be a YAML list (got ${typeof obj[key]}: ${JSON.stringify(obj[key]).slice(0, 120)})`;
      }
    }
    return null;
  } catch (err: any) {
    return `YAML parse error: ${err?.message ?? String(err)}`;
  }
}