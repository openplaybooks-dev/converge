/**
 * RFC 0024 — Spawn invocation discovery.
 *
 * Walk the spawner's cwd (`<taskDir>/spawn/`) one level deep. Each
 * subdirectory containing a `spawn.yml` becomes one child. The directory
 * name is the child's id. Subdirectories whose name starts with `_` are
 * skipped (body scratch); top-level files are ignored.
 *
 * Per-file YAML / shape errors don't abort discovery — they land as
 * structured `SpawnFileEvidence` entries so the caller (the preview
 * step) can render them in STATUS.md and reject the apply.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface SpawnInvocation {
  template: string;
  depends_on?: string[];
  params?: Record<string, unknown>;
  /** Optional free-text hint shown when the template is missing — surfaces
   *  the gap to the planner instead of inviting bespoke contract authoring. */
  note?: string;
}

export interface DiscoveredInvocation {
  id: string;
  spawnYmlPath: string;
  invocation: SpawnInvocation;
}

/**
 * Failure codes that surface per-file in `EVIDENCE.json` and per-row in
 * STATUS.md. Discovery-stage codes:
 *
 *   - `invalid-yaml`        — spawn.yml didn't parse
 *   - `invalid-shape`       — top-level wasn't a mapping
 *   - `missing-template`    — required `template:` key absent
 *   - `unknown-field`       — extra key beyond the documented schema
 *
 * Expansion-stage codes (in expand.ts):
 *   - `template-not-found`
 *   - `missing-required-param`
 *   - `unknown-param`
 *   - `param-type-mismatch`
 *
 * Stray-detection codes (in strays.ts):
 *   - `SPAWN_TASKMD_AUTHORED_BY_BODY`
 *   - `SPAWN_MANIFEST_AUTHORED_BY_BODY`
 */
export type SpawnFileErrorCode =
  | "invalid-yaml"
  | "invalid-shape"
  | "missing-template"
  | "unknown-field"
  | "template-not-found"
  | "missing-required-param"
  | "unknown-param"
  | "param-type-mismatch"
  | "duplicate-id"
  | "unknown-dependency"
  | "SPAWN_TASKMD_AUTHORED_BY_BODY"
  | "SPAWN_MANIFEST_AUTHORED_BY_BODY";

export interface SpawnFileEvidence {
  id: string;
  /** Path relative to the spawn root, with forward slashes; e.g.
   *  `hero-wire/spawn.yml`. */
  file: string;
  errorCode: SpawnFileErrorCode;
  message: string;
  /** Suggested fix shown verbatim in STATUS.md. */
  fix?: string;
  /** Optional "did you mean" hint when the error has a near-miss
   *  (Levenshtein-1 template / param name). */
  hint?: string;
  /** Set on `missing-required-param`. */
  expectedParams?: string[];
}

export interface DiscoveryResult {
  invocations: DiscoveredInvocation[];
  evidence: SpawnFileEvidence[];
}

const KNOWN_FIELDS = new Set(["template", "depends_on", "params", "note"]);

export function discoverInvocations(spawnRoot: string): DiscoveryResult {
  const out: DiscoveryResult = { invocations: [], evidence: [] };
  if (!existsSync(spawnRoot)) return out;

  let entries: string[];
  try {
    entries = readdirSync(spawnRoot);
  } catch {
    return out;
  }

  const ids: string[] = [];
  for (const name of entries) {
    if (name.startsWith("_")) continue;
    const childPath = join(spawnRoot, name);
    let st;
    try {
      st = statSync(childPath);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const spawnYmlPath = join(childPath, "spawn.yml");
    if (!existsSync(spawnYmlPath)) continue;
    ids.push(name);
  }
  ids.sort();

  for (const id of ids) {
    const spawnYmlPath = join(spawnRoot, id, "spawn.yml");
    const rel = `${id}/spawn.yml`;

    let raw: string;
    try {
      raw = readFileSync(spawnYmlPath, "utf-8");
    } catch (err) {
      out.evidence.push({
        id,
        file: rel,
        errorCode: "invalid-yaml",
        message: `cannot read spawn.yml: ${(err as Error).message}`,
      });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      out.evidence.push({
        id,
        file: rel,
        errorCode: "invalid-yaml",
        message: `YAML parse error: ${(err as Error).message}`,
      });
      continue;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      out.evidence.push({
        id,
        file: rel,
        errorCode: "invalid-shape",
        message:
          "spawn.yml must be a YAML mapping with `template:` at the top level",
      });
      continue;
    }

    const obj = parsed as Record<string, unknown>;

    const unknownKeys = Object.keys(obj).filter((k) => !KNOWN_FIELDS.has(k));
    if (unknownKeys.length > 0) {
      out.evidence.push({
        id,
        file: rel,
        errorCode: "unknown-field",
        message: `unknown field(s) in spawn.yml: ${unknownKeys.join(", ")}`,
        fix: `remove unknown field(s) (${unknownKeys.join(", ")}); the schema is exactly: template, depends_on, params, note`,
      });
      continue;
    }

    const template = obj.template;
    if (template === undefined || template === null || template === "") {
      out.evidence.push({
        id,
        file: rel,
        errorCode: "missing-template",
        message: "spawn.yml is missing required field `template:`",
        fix: "add a `template:` line naming an existing template (run `ls templates/` to list)",
      });
      continue;
    }
    if (typeof template !== "string") {
      out.evidence.push({
        id,
        file: rel,
        errorCode: "missing-template",
        message: "`template:` must be a string (template name)",
      });
      continue;
    }

    const dependsOn = (() => {
      const v = obj.depends_on;
      if (v === undefined || v === null) return undefined;
      if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
        return v as string[];
      }
      return undefined;
    })();

    const params = (() => {
      const v = obj.params;
      if (v === undefined || v === null) return undefined;
      if (typeof v !== "object" || Array.isArray(v)) return undefined;
      return v as Record<string, unknown>;
    })();

    const note = typeof obj.note === "string" ? obj.note : undefined;

    const invocation: SpawnInvocation = { template };
    if (dependsOn !== undefined) invocation.depends_on = dependsOn;
    if (params !== undefined) invocation.params = params;
    if (note !== undefined) invocation.note = note;

    out.invocations.push({ id, spawnYmlPath, invocation });
  }

  return out;
}
