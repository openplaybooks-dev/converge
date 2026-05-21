/**
 * RFC 0021 — `applyManifest`: declarative spawn ingest.
 *
 * Reads a JSONL manifest, validates each row against `SpawnRowSchema`,
 * and for each row calls the existing spawn core to render the child
 * TASK.md and upsert into tasks.jsonl. Per-row failures land in a
 * structured result file; the parent's repair loop reads that file to
 * patch the offending rows and re-apply.
 *
 * Apply is the only mutator. It does not run tasks, mark them done, or
 * touch outputs — it only writes ledger rows and inventory TASK.md files.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

import { atomicWriteFileSync } from "../../checkpoint/atomic-write.ts";
import {
  parseTaskMdString,
  serializeTaskMd,
} from "../../config/task-md-definition.ts";
import {
  appendTaskUpsert,
  ensureRuntimeLedger,
  readRuntimeLedgerState,
  type RuntimeTask,
} from "../goal/runtime-ledger.ts";
import { assertSafeId } from "../goal/safe-id.ts";
import {
  parseManifestText,
  type ManifestParseError,
  type SpawnErrorCode,
  type SpawnRow,
} from "./manifest.ts";

export type { SpawnErrorCode, SpawnRow } from "./manifest.ts";

/**
 * Per-row outcome written to `spawn.plan.result.jsonl`.
 *
 * Distinguishing `ok: true` (new spawn) from `ok: true, idempotent: true`
 * (re-apply over a byte-identical TASK.md) lets the AI tell whether
 * apply made progress or simply confirmed a prior run.
 */
export type SpawnResult =
  | {
      id: string;
      ok: true;
      taskMdPath: string;
      template: string;
      appliedAt: string;
      /** True iff the row was already present and the rendered TASK.md
       *  matched byte-for-byte; no mutation happened. */
      idempotent?: boolean;
      /** RFC 0026: rendered outputs for collision detection. */
      outputs?: string[];
      /** RFC 0026: output_scope annotation for collision opt-out. */
      output_scope?: "per-child" | "shared";
    }
  | {
      id: string;
      ok: false;
      error: string;
      errorCode: SpawnErrorCode;
      template: string;
      missing?: string[];
      evidencePath?: string;
      /** Line number in the manifest where this row appeared (1-based). */
      lineNumber?: number;
    };

export interface ApplyOptions {
  manifestPath: string;
  workspace: string;
  /** When true: validate everything and write a result file but do not
   *  mutate the inventory or tasks.jsonl. */
  dry?: boolean;
  /** Default value of `no_inherit` for rows that don't set it. */
  noInheritDefault?: boolean;
  /** Optional override for where the result file goes. Defaults to
   *  `<manifestPath>` with `.jsonl` replaced by `.result.jsonl`. */
  resultPath?: string;
  /**
   * RFC 0030 — when the caller is `ingestSpawnDir` (RFC 0024 path) it
   * has already written EXPANDED.md per child under `<spawnRoot>/<id>/`.
   * Plumbing the path lets applyManifest:
   *   1. Compare idempotency against EXPANDED.md instead of the legacy
   *      inventory copy (which we want to stop writing).
   *   2. Skip the legacy `inventory/<pb>/spawned/<id>/TASK.md` write
   *      unless CONVERGE_LEGACY_SPAWNED_INVENTORY=1 is set.
   * Legacy callers (manual `converge apply`) omit this and still get
   * the old inventory-copy behaviour for backwards compatibility.
   */
  spawnRoot?: string;
}

export interface ApplyReport {
  manifestPath: string;
  resultPath: string;
  ok: number;
  failed: number;
  rows: SpawnResult[];
}

const RESERVED_SUFFIX = ".jsonl";

function defaultResultPath(manifestPath: string): string {
  if (manifestPath.endsWith(RESERVED_SUFFIX)) {
    return manifestPath.slice(0, -RESERVED_SUFFIX.length) + ".result.jsonl";
  }
  return manifestPath + ".result.jsonl";
}

function looksLikePath(value: string): boolean {
  return (
    value.includes("/") ||
    value.includes("\\") ||
    value.endsWith(".md") ||
    value.startsWith(".converge")
  );
}

/**
 * Resolve a template name or path to an absolute TASK.md path.
 *
 * Returns `null` when the template can't be located so the caller can
 * surface a `template-not-found` error instead of throwing — apply
 * reports per-row failures, it does not abort the whole run on one bad row.
 */
function resolveTemplate(
  fromValue: string,
  workspace: string,
  playbook: string,
): { path: string; available?: string[] } | null {
  if (looksLikePath(fromValue)) {
    const abs = isAbsolute(fromValue) ? fromValue : resolve(workspace, fromValue);
    if (!existsSync(abs)) return null;
    return { path: abs };
  }
  const conventionalPath = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "templates",
    fromValue,
    "TASK.md",
  );
  if (existsSync(conventionalPath)) return { path: conventionalPath };

  const templatesDir = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "templates",
  );
  let available: string[] = [];
  try {
    if (existsSync(templatesDir)) {
      available = readdirSync(templatesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    }
  } catch {
    // Best-effort listing.
  }
  return { path: "", available };
}

function collectInheritedVars(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith("CONVERGE_VAR_") || v === undefined) continue;
    const key = k.slice("CONVERGE_VAR_".length).toLowerCase();
    if (!key) continue;
    out[key] = v;
  }
  return out;
}

interface BuildVarsResult {
  vars: Record<string, unknown>;
  missing: string[];
}

function buildChildVars(opts: {
  templateVars: Record<string, unknown> | undefined;
  noInherit: boolean;
  explicitVars: Record<string, string | number | boolean>;
  childId: string;
  workspace: string;
  playbook: string;
}): BuildVarsResult {
  const hasContract =
    opts.templateVars !== undefined &&
    opts.templateVars !== null &&
    typeof opts.templateVars === "object" &&
    Object.keys(opts.templateVars).length > 0;

  const inherited = opts.noInherit ? {} : collectInheritedVars();
  const envWave = process.env.CONVERGE_TASK_WAVE;
  const isMissingDefault = (v: unknown): boolean =>
    v === null || v === undefined || v === "";

  // Workspace-relative exec dir — auto-injected when the template
  // declares `exec_dir` in its strict-mode vars block. Mirrors the
  // env var `CONVERGE_TASK_DIR` (which is absolute) for the in-body
  // reference: the frontmatter copy is workspace-relative because
  // every other path in TASK.md is too.
  const autoExecDir = `.converge/journal/${opts.playbook}/tasks/${opts.childId}/exec`;

  if (hasContract) {
    const declared = opts.templateVars as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const missing: string[] = [];

    for (const key of Object.keys(declared)) {
      const templateDefault = declared[key];

      let value: unknown = isMissingDefault(templateDefault)
        ? undefined
        : templateDefault;

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
        !(key in opts.explicitVars)
      ) {
        value = envWave;
      }

      // Auto-inject exec_dir when the template declares it but neither
      // the parent nor the manifest row supplied a value.
      if (
        key === "exec_dir" &&
        (value === undefined || value === "") &&
        !(key in opts.explicitVars)
      ) {
        value = autoExecDir;
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

  // PERMISSIVE mode (no template-declared contract).
  const out: Record<string, unknown> = {};

  if (!opts.noInherit) Object.assign(out, inherited);

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

interface RenderResult {
  content: string;
  missing: string[];
}

/**
 * Render `{{varName}}` placeholders in a string against the merged vars
 * map. Mirrors the existing `cli-spawn.ts` behavior so manifests pointed
 * at templates that previously worked under `seed: { mode: cli }` keep
 * working unchanged. `{{taskId}}` resolves to the manifest row's id.
 *
 * Unknown placeholders pass through untouched — runtime-resolved values
 * (e.g. `{{wave}}` filled in by the body's env) survive spawn-time without
 * forcing every key to be in the manifest.
 */
function renderMustache(
  text: string,
  vars: Record<string, unknown>,
  childId: string,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key === "taskId") return childId;
    if (key in vars) {
      const v = vars[key];
      return v === null || v === undefined ? match : String(v);
    }
    return match;
  });
}

function renderCheckArray(
  checks: unknown,
  vars: Record<string, unknown>,
  childId: string,
): unknown {
  if (!Array.isArray(checks)) return checks;
  return checks.map((check) => {
    if (!check || typeof check !== "object") return check;
    const out: Record<string, unknown> = {
      ...(check as Record<string, unknown>),
    };
    if (typeof out.cmd === "string") {
      out.cmd = renderMustache(out.cmd, vars, childId);
    }
    if (typeof out.description === "string") {
      out.description = renderMustache(out.description, vars, childId);
    }
    return out;
  });
}

function renderChildTaskMd(opts: {
  templatePath: string;
  childId: string;
  vars: Record<string, string | number | boolean>;
  noInherit: boolean;
  workspace: string;
  playbook: string;
}): RenderResult {
  const raw = readFileSync(opts.templatePath, "utf-8");
  const shape = parseTaskMdString(raw);

  const templateVars =
    shape.vars && typeof shape.vars === "object" ? shape.vars : undefined;
  const { vars: mergedVars, missing } = buildChildVars({
    templateVars,
    noInherit: opts.noInherit,
    explicitVars: opts.vars,
    childId: opts.childId,
    workspace: opts.workspace,
    playbook: opts.playbook,
  });

  // Render {{var}} placeholders across the parts of the task definition
  // that bodies, checks, the converge prompt, and the cache predicate
  // actually read. RFC 0034: depends_on is auto-chained alphabetically by
  // the DAG builder — not written to TASK.md frontmatter.
  //
  // Inputs/outputs/tags MUST be rendered too: the cache predicate at
  // run/index.ts:738 calls `existsSync(join(projectDir, output))` on each
  // declared output, so a literal "{{screenId}}" in outputs would make
  // the cache check fail forever. Tags are rendered for consistency and
  // so per-child tag filtering via `--select tag:screen-landing` works.
  const renderStr = (s: unknown): unknown =>
    typeof s === "string" ? renderMustache(s, mergedVars, opts.childId) : s;
  const renderStrArr = (arr: unknown): unknown =>
    Array.isArray(arr)
      ? arr.map((item) => renderStr(item))
      : arr;

  const renderedTitle = renderStr(shape.title);
  const renderedBody = renderStr(shape.body);
  const renderedInputs = renderStrArr(shape.inputs);
  const renderedOutputs = renderStrArr(shape.outputs);
  const renderedTags = renderStrArr(shape.tags);
  const renderedChecks = renderCheckArray(
    shape.checks,
    mergedVars,
    opts.childId,
  ) as typeof shape.checks;

  const content = serializeTaskMd({
    ...shape,
    id: opts.childId,
    title: renderedTitle as typeof shape.title,
    body: renderedBody as typeof shape.body,
    inputs: renderedInputs as typeof shape.inputs,
    outputs: renderedOutputs as typeof shape.outputs,
    output_scope: shape.output_scope,
    tags: renderedTags as typeof shape.tags,
    checks: renderedChecks,
    vars: Object.keys(mergedVars).length > 0 ? mergedVars : undefined,
  });
  return { content, missing };
}

function validateTaskMdFrontmatter(content: string): string | null {
  if (!content.startsWith("---")) return null;
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    return "frontmatter starts with `---` but is not closed by a matching `---` delimiter on its own line";
  }
  try {
    const parsed = parseYaml(m[1]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "frontmatter must parse to a mapping (key: value pairs)";
    }
    const obj = parsed as Record<string, unknown>;
    for (const key of [
      "outputs",
      "inputs",
      "checks",
      "tags",
      "skills",
    ] as const) {
      if (
        obj[key] !== undefined &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        return `frontmatter key '${key}' must be a YAML list (got ${typeof obj[key]})`;
      }
    }
    return null;
  } catch (err: any) {
    return `YAML parse error: ${err?.message ?? String(err)}`;
  }
}

function resolveParentFromEnv(
  envCurrentTaskPath: string | undefined,
  tasks: RuntimeTask[],
): string | undefined {
  if (!envCurrentTaskPath) return undefined;
  const segs = envCurrentTaskPath.replace(/\\/g, "/").split("/").filter(Boolean);
  const last = segs[segs.length - 1];
  if (last && last.endsWith(".md")) return segs[segs.length - 2];
  const parentId = last || envCurrentTaskPath;
  if (tasks.some((t) => t.id === parentId)) return parentId;
  return parentId;
}

interface ApplyOneResult {
  result: SpawnResult;
  /** When the row succeeded as a fresh spawn, the taskUpsert record we
   *  appended to tasks.jsonl. Used by the result-file writer. */
}

function applyOneRow(
  row: SpawnRow,
  ctx: {
    workspace: string;
    playbook: string;
    dry: boolean;
    noInheritDefault: boolean;
    /** RFC 0030: when set, EXPANDED.md at `<spawnRoot>/<row.id>/` is the
     *  canonical contract; the legacy inventory copy is skipped unless
     *  `CONVERGE_LEGACY_SPAWNED_INVENTORY=1` is set. */
    spawnRoot?: string;
  },
): SpawnResult {
  // 1. assertSafeId — refuse `..`, `/`, control chars before composing paths.
  try {
    assertSafeId(row.id, "<id>");
  } catch (err) {
    return {
      id: row.id,
      ok: false,
      error: (err as Error).message,
      errorCode: "unsafe-id",
      template: row.template,
    };
  }

  // 2. Resolve template (return template-not-found, not throw).
  const resolved = resolveTemplate(row.template, ctx.workspace, ctx.playbook);
  if (!resolved || !resolved.path) {
    const hint = resolved?.available?.length
      ? ` available: ${resolved.available.join(", ")}`
      : "";
    return {
      id: row.id,
      ok: false,
      error: `template '${row.template}' not found.${hint}`,
      errorCode: "template-not-found",
      template: row.template,
    };
  }

  ensureRuntimeLedger(ctx.workspace, ctx.playbook, undefined);
  const state = readRuntimeLedgerState(ctx.workspace, ctx.playbook);

  const parentId = resolveParentFromEnv(
    process.env.CONVERGE_CURRENT_TASK_PATH,
    state.tasks,
  );

  // 3. Render the child TASK.md to compute the candidate content.
  const explicitVars: Record<string, string | number | boolean> = {};
  if (row.vars) {
    for (const [k, v] of Object.entries(row.vars)) {
      explicitVars[k] = v;
    }
  }

  let rendered: RenderResult;
  try {
    rendered = renderChildTaskMd({
      templatePath: resolved.path,
      childId: row.id,
      vars: explicitVars,
      noInherit: row.no_inherit ?? ctx.noInheritDefault,
      workspace: ctx.workspace,
      playbook: ctx.playbook,
    });
  } catch (err) {
    return {
      id: row.id,
      ok: false,
      error: `template '${row.template}' has invalid frontmatter: ${
        (err as Error)?.message ?? err
      }`,
      errorCode: "malformed-frontmatter",
      template: row.template,
    };
  }

  if (rendered.missing.length > 0) {
    return {
      id: row.id,
      ok: false,
      error:
        `missing required vars [${rendered.missing.join(", ")}] declared in template ` +
        `'${row.template}'. Pass them via vars: in the manifest row, or set them on the ` +
        `parent task's vars: so they inherit.`,
      errorCode: "missing-vars",
      template: row.template,
      missing: rendered.missing,
    };
  }

  const validationError = validateTaskMdFrontmatter(rendered.content);
  const inventoryPath = `.converge/inventory/${ctx.playbook}/spawned/${row.id}`;
  const taskMdPath = `${inventoryPath}/TASK.md`;
  const absTaskMd = join(ctx.workspace, taskMdPath);

  // RFC 0030: when caller provided spawnRoot, EXPANDED.md is the
  // canonical contract per-child. Compare idempotency against it
  // instead of the legacy inventory copy. The inventory copy is
  // deprecated and only written when the env var is set (default off).
  const expandedMdPath = ctx.spawnRoot
    ? join(ctx.spawnRoot, row.id, "EXPANDED.md")
    : null;
  const writeLegacyInventory =
    !ctx.spawnRoot || process.env.CONVERGE_LEGACY_SPAWNED_INVENTORY === "1";

  // 4. Idempotency: if the row id is already in tasks.jsonl, the caller
  //    is re-applying. Two probe modes:
  //    - RFC 0030 path (spawnRoot set): EXPANDED.md is the canonical
  //      contract. If it exists AND was written by the same template
  //      AND with the same params hash (recorded in row metadata),
  //      the re-apply is idempotent. Different params → duplicate-id.
  //    - Legacy path: byte-compare the rendered content against the
  //      inventory copy on disk.
  //    Either way, mismatch → duplicate-id error.
  const renderedContentHash = createHash("sha256")
    .update(rendered.content)
    .digest("hex");
  const existing = state.tasks.find((t) => t.id === row.id);
  if (existing) {
    if (
      expandedMdPath &&
      existsSync(expandedMdPath) &&
      existing.metadata &&
      (existing.metadata as Record<string, unknown>).template === row.template &&
      (existing.metadata as Record<string, unknown>).renderedHash === renderedContentHash
    ) {
      // RFC 0030 idempotency: same id, same template, same rendered
      // content (params produce identical output). We trust the
      // framework: same invocation → same contract.
      return {
        id: row.id,
        ok: true,
        taskMdPath,
        template: row.template,
        appliedAt: new Date().toISOString(),
        idempotent: true,
      };
    }
    if (existsSync(absTaskMd)) {
      const onDisk = readFileSync(absTaskMd, "utf-8");
      if (onDisk === rendered.content) {
        return {
          id: row.id,
          ok: true,
          taskMdPath,
          template: row.template,
          appliedAt: new Date().toISOString(),
          idempotent: true,
        };
      }
    }
    return {
      id: row.id,
      ok: false,
      error:
        `duplicate task id: ${row.id}. A task with this id already exists ` +
        `in tasks.jsonl with different rendered content. Either remove the ` +
        `row from the manifest, or rename it to a fresh id.`,
      errorCode: "duplicate-id",
      template: row.template,
    };
  }

  if (ctx.dry) {
    if (validationError !== null) {
      return {
        id: row.id,
        ok: false,
        error: `malformed TASK.md frontmatter: ${validationError}`,
        errorCode: "malformed-frontmatter",
        template: row.template,
      };
    }
    return {
      id: row.id,
      ok: true,
      taskMdPath,
      template: row.template,
      appliedAt: new Date().toISOString(),
    };
  }

  // RFC 0030: the legacy inventory write happens only when no spawnRoot
  // was provided (manual `converge apply` callers) OR when the env var
  // CONVERGE_LEGACY_SPAWNED_INVENTORY=1 forces it on. The new RFC 0024
  // path (`ingestSpawnDir`) provides spawnRoot and writes EXPANDED.md
  // itself — that's the canonical contract.
  if (writeLegacyInventory) {
    mkdirSync(dirname(absTaskMd), { recursive: true });
    writeFileSync(absTaskMd, rendered.content, "utf-8");
  }

  if (validationError !== null) {
    const rejectedPath = `${absTaskMd}.rejected`;
    const evidencePath = `${absTaskMd}.EVIDENCE.json`;
    try {
      if (writeLegacyInventory) renameSync(absTaskMd, rejectedPath);
    } catch {
      // best-effort
    }
    try {
      writeFileSync(
        evidencePath,
        JSON.stringify(
          {
            kind: "definition",
            taskMdPath: absTaskMd,
            rejectedPath,
            parseError: validationError,
            detectedAt: new Date().toISOString(),
            taskId: row.id,
            template: row.template,
            actual: {
              firstBytes: rendered.content.slice(0, 400),
              byteLength: rendered.content.length,
            },
          },
          null,
          2,
        ),
        "utf-8",
      );
    } catch {
      // best-effort
    }
    return {
      id: row.id,
      ok: false,
      error: `malformed TASK.md frontmatter: ${validationError}`,
      errorCode: "malformed-frontmatter",
      template: row.template,
      evidencePath: relative(ctx.workspace, evidencePath).replace(/\\/g, "/"),
    };
  }

  // RFC 0031: Unified task row with taskRef + params.
  // Prefer EXPANDED.md (RFC 0024 path); fall back to the inventory copy
  // for legacy callers that still write it.
  const canonicalTaskPath =
    ctx.spawnRoot && !writeLegacyInventory
      ? relative(ctx.workspace, join(ctx.spawnRoot, row.id, "EXPANDED.md")).replace(/\\/g, "/")
      : taskMdPath;

  appendTaskUpsert(ctx.workspace, ctx.playbook, {
    id: row.id,
    taskPath: canonicalTaskPath,
    taskRef: { kind: "template", name: row.template },
    params: explicitVars as Record<string, unknown>,
    goalId: "inventory",
    summary: row.id,
    status: "todo",
    source: "spawned",
    parent: parentId,
    playbook: ctx.playbook,
    metadata: {
      spawnedBy: "apply",
      template: row.template,
      // RFC 0030: stored so re-apply with different params is detected
      // as a duplicate-id error rather than a silent no-op.
      renderedHash: renderedContentHash,
    },
  });

  return {
    id: row.id,
    ok: true,
    taskMdPath: canonicalTaskPath,
    template: row.template,
    appliedAt: new Date().toISOString(),
  };
}

function manifestErrorToResult(err: ManifestParseError): SpawnResult {
  return {
    id: err.id ?? `<line ${err.lineNumber}>`,
    ok: false,
    error: err.error,
    errorCode: err.errorCode,
    template: "",
    lineNumber: err.lineNumber,
  };
}

/**
 * Apply a manifest. Reads the file, validates each row, and dispatches
 * per row. Always writes a result file (atomic) so the parent's repair
 * loop has an addressable surface even if some rows failed.
 *
 * Throws only on caller-fault errors that have no row to attach them to:
 * missing CONVERGE_PLAYBOOK env, unreadable manifest file. Per-row
 * failures (template-not-found, duplicate-id, missing-vars, etc.) land
 * in the result file and the report's `failed` count.
 */
export async function applyManifest(opts: ApplyOptions): Promise<ApplyReport> {
  const playbook = process.env.CONVERGE_PLAYBOOK;
  if (!playbook) {
    throw new Error(
      "CONVERGE_PLAYBOOK env not set. `converge apply` is meant to run inside a task body where the framework sets this; for operator use, pass --playbook=<name>.",
    );
  }

  const manifestAbs = isAbsolute(opts.manifestPath)
    ? opts.manifestPath
    : resolve(opts.workspace, opts.manifestPath);
  if (!existsSync(manifestAbs)) {
    throw new Error(`manifest file not found: ${manifestAbs}`);
  }

  const manifestText = readFileSync(manifestAbs, "utf-8");
  const { rows, errors } = parseManifestText(manifestText);

  const results: SpawnResult[] = [];
  for (const err of errors) results.push(manifestErrorToResult(err));

  for (const row of rows) {
    const result = applyOneRow(row, {
      workspace: opts.workspace,
      playbook,
      dry: opts.dry === true,
      noInheritDefault: opts.noInheritDefault === true,
      spawnRoot: opts.spawnRoot,
    });
    results.push(result);
  }

  // Write the result file atomically.
  const resultPath = opts.resultPath ?? defaultResultPath(manifestAbs);
  const body =
    results.length > 0
      ? results.map((r) => JSON.stringify(r)).join("\n") + "\n"
      : "";
  mkdirSync(dirname(resultPath), { recursive: true });
  atomicWriteFileSync(resultPath, body);

  let ok = 0;
  let failed = 0;
  for (const r of results) {
    if (r.ok) ok++;
    else failed++;
  }

  return {
    manifestPath: manifestAbs,
    resultPath,
    ok,
    failed,
    rows: results,
  };
}
