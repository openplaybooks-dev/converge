/**
 * RFC 0024 — Expand discovered invocation → SpawnRow.
 *
 * Resolves the named template, validates params against the template's
 * declared contract, fills defaults, renders `{{paramName}}` placeholders
 * in the template's TASK.md text, and returns either:
 *
 *   - `{ row, expandedTaskMd }` — a `SpawnRow` ready to feed `applyManifest`
 *     plus the fully-rendered TASK.md (also written to `EXPANDED.md` for
 *     adjacency).
 *   - `{ evidence }`            — a structured per-file error for STATUS.md.
 *
 * Per-invocation errors never abort the run — they accumulate and surface
 * during preview.
 */
import { readFileSync } from "node:fs";

import type { SpawnRow } from "./manifest.ts";
import type {
  DiscoveredInvocation,
  SpawnFileEvidence,
} from "./discover.ts";
import { findTemplate, type TemplateDef, type TemplateParam } from "./templates.ts";

export interface ExpandedRow {
  row: SpawnRow;
  /** The template TASK.md text after `{{...}}` substitution. */
  expandedTaskMd: string;
}

export type ExpandResult = ExpandedRow | { evidence: SpawnFileEvidence };

/** Damerau-Levenshtein-1 isn't worth pulling in a dep for. Plain Levenshtein
 *  is enough to catch single-character typos in template / param names. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1]! + 1,
        prev[j]! + 1,
        prev[j - 1]! + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

function nearestName(needle: string, candidates: string[]): string | undefined {
  if (candidates.length === 0) return undefined;
  let best: string | undefined;
  let bestDist = Infinity;
  const threshold = Math.max(2, Math.floor(needle.length / 3));
  for (const c of candidates) {
    const d = levenshtein(needle, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist <= threshold ? best : undefined;
}

function coerceParamValue(
  raw: unknown,
  decl: TemplateParam,
):
  | { value: string | number | boolean }
  | { typeMismatch: { expected: string; actual: string } } {
  const expected = decl.type;
  if (expected === "string") {
    if (typeof raw === "string") return { value: raw };
    if (typeof raw === "number" || typeof raw === "boolean") {
      return { value: String(raw) };
    }
    return {
      typeMismatch: { expected: "string", actual: typeof raw },
    };
  }
  if (expected === "number") {
    if (typeof raw === "number" && Number.isFinite(raw)) return { value: raw };
    return {
      typeMismatch: { expected: "number", actual: typeof raw },
    };
  }
  if (expected === "boolean") {
    if (typeof raw === "boolean") return { value: raw };
    return {
      typeMismatch: { expected: "boolean", actual: typeof raw },
    };
  }
  // Unknown declared type — fall through as string.
  return { value: String(raw) };
}

function renderMustache(text: string, vars: Record<string, unknown>, taskId: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key === "taskId") return taskId;
    if (key in vars) {
      const v = vars[key];
      if (v === undefined || v === null) return match;
      return String(v);
    }
    return match;
  });
}

function fixYamlForMissingParam(paramName: string, decl: TemplateParam): string {
  const placeholder =
    decl.type === "number" ? "0" : decl.type === "boolean" ? "false" : "<value>";
  return `add under \`params:\`\n  ${paramName}: ${placeholder}`;
}

export function expandInvocation(
  inv: DiscoveredInvocation,
  templates: TemplateDef[],
): ExpandResult {
  const evidence = (
    errorCode: SpawnFileEvidence["errorCode"],
    message: string,
    extra?: Partial<SpawnFileEvidence>,
  ): { evidence: SpawnFileEvidence } => ({
    evidence: {
      id: inv.id,
      file: `${inv.id}/spawn.yml`,
      errorCode,
      message,
      ...extra,
    },
  });

  const tmpl = findTemplate(inv.invocation.template, templates);
  if (!tmpl) {
    const names = templates.map((t) => t.name);
    const hint = nearestName(inv.invocation.template, names);
    return evidence(
      "template-not-found",
      `template '${inv.invocation.template}' is not defined under templates/. available: ${
        names.length > 0 ? names.join(", ") : "(none)"
      }`,
      hint
        ? {
            hint: `did you mean: \`${hint}\`?`,
            fix: `change \`template: ${inv.invocation.template}\` → \`template: ${hint}\``,
          }
        : {},
    );
  }

  const providedParams = inv.invocation.params ?? {};
  const declaredNames = Object.keys(tmpl.params);

  // 1. Unknown-param check first — surfaces typos in param names before
  // we'd otherwise blame the user for missing the un-typo'd one.
  for (const k of Object.keys(providedParams)) {
    if (!(k in tmpl.params)) {
      const hint = nearestName(k, declaredNames);
      return evidence(
        "unknown-param",
        `template '${tmpl.name}' does not declare param \`${k}\`. declared: ${
          declaredNames.length > 0 ? declaredNames.join(", ") : "(none)"
        }`,
        hint
          ? {
              hint: `did you mean: \`${hint}\`?`,
              fix: `rename \`${k}: ...\` → \`${hint}: ...\` under \`params:\``,
            }
          : {},
      );
    }
  }

  // 2. Build the resolved param map. Walk declared params, pull from the
  // invocation first, then fall back to defaults; record any missing as
  // a single missing-required-param evidence entry (first one wins for
  // primary message; full list lands in expectedParams).
  const resolved: Record<string, string | number | boolean> = {};
  const missing: string[] = [];

  for (const [name, decl] of Object.entries(tmpl.params)) {
    if (name in providedParams) {
      const raw = providedParams[name];
      const c = coerceParamValue(raw, decl);
      if ("typeMismatch" in c) {
        return evidence(
          "param-type-mismatch",
          `param \`${name}\` expects ${c.typeMismatch.expected}; got ${c.typeMismatch.actual} (\`${String(
            raw,
          )}\`)`,
          {
            fix: `change \`${name}:\` to a ${c.typeMismatch.expected} value`,
          },
        );
      }
      resolved[name] = c.value;
      continue;
    }
    if (decl.default !== undefined) {
      resolved[name] = decl.default;
      continue;
    }
    if (decl.required) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    const first = missing[0]!;
    const decl = tmpl.params[first]!;
    return evidence(
      "missing-required-param",
      `template '${tmpl.name}' requires param \`${first}\` (and ${
        missing.length - 1
      } other${missing.length === 2 ? "" : "s"})`.replace(
        " (and 0 others)",
        "",
      ),
      {
        expectedParams: missing,
        fix: fixYamlForMissingParam(first, decl),
      },
    );
  }

  // 3. Render the template TASK.md text. We never write through to disk
  // here — applyManifest will do the file I/O. The renderer is dumb
  // mustache only (no conditionals, no loops, no helpers) per the RFC.
  const taskMdRaw = readFileSync(tmpl.taskMdPath, "utf-8");
  const expandedTaskMd = renderMustache(taskMdRaw, resolved, inv.id);

  const row: SpawnRow = {
    id: inv.id,
    template: tmpl.name,
  };
  if (Object.keys(resolved).length > 0) row.vars = resolved;
  if (inv.invocation.depends_on && inv.invocation.depends_on.length > 0) {
    row.after = inv.invocation.depends_on;
  }

  return { row, expandedTaskMd };
}
