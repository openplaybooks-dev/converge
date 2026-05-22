/**
 * `converge spawn` — register a new task in `tasks.jsonl` and write its
 * journal TASK.md from a template.
 *
 * The one and only shape:
 *
 *     converge spawn <id> <template>
 *
 * Two positionals, both always required. `<template>` is resolved to
 * `.converge/playbooks/<pb>/templates/<template>/TASK.md`. The duplicate
 * token in the singleton case (`spawn child-alpha child-alpha`) is
 * deliberate — it forces the AI to consciously name the template, which
 * eliminates "where does this resolve?" guessing.
 *
 * Smart defaults pulled from the runtime env (set by the executor when
 * the spawn call originates inside a task body):
 *
 *   CONVERGE_PLAYBOOK           — provides the playbook (no flag needed)
 *   CONVERGE_CURRENT_TASK_PATH  — provides the parent (no flag needed)
 *   CONVERGE_TASK_WAVE          — auto-injected as vars.wave
 *   CONVERGE_VAR_<KEY>          — parent's vars; inherited into child
 *
 * Optional flags (use sparingly — defaults cover the common case):
 *
 *     --var key=value            repeatable; explicit per-child overrides
 *     --after <sibling-id>       repeatable; sibling depends_on
 *     --no-inherit               opt out of parent's CONVERGE_VAR_*
 *     --dry                      preview as JSON; no mutation
 *
 * Batch mode (for thousands of children — one JSONL line per spawn):
 *
 *     converge spawn --batch <file.jsonl>
 *     cat spec.jsonl | converge spawn --batch -
 *
 *     Each JSONL line: {"id":"r1","template":"row","vars":{"row":1}}
 *     Per-row errors land in stderr; batch continues.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  appendTaskUpsert,
  ensureRuntimeLedger,
  readRuntimeLedgerState,
  type RuntimeTask,
  type TaskRef,
} from "@openplaybooks/converge-core/task/goal";
import {
  parseTaskMdString,
  serializeTaskMd,
} from "@openplaybooks/converge-core/config";
import { assertSafeId } from "@openplaybooks/converge-core/task/goal";
import {
  renderChildTaskMd,
  validateTaskMdFrontmatter,
  collectInheritedVars,
} from "@openplaybooks/converge-core/task/spawn";

export interface SpawnCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

function asMulti(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

function fail(message: string): never {
  console.error(`converge spawn: ${message}`);
  process.exit(2);
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
 * Resolve a `--from` value to an absolute TASK.md path.
 *
 * Two shapes:
 *   1. Template name (no slash, no .md) → look up
 *      `.converge/playbooks/<pb>/templates/<name>/TASK.md`
 *   2. Path (has slash or ends .md) → use verbatim, relative to workspace
 */
function resolveTemplate(
  fromValue: string,
  workspace: string,
  playbook: string,
): string {
  if (looksLikePath(fromValue)) {
    const abs = isAbsolute(fromValue) ? fromValue : resolve(workspace, fromValue);
    if (!existsSync(abs)) fail(`template file not found: ${abs}`);
    return abs;
  }
  // Convention: templates/<name>/TASK.md under the active playbook.
  const conventionalPath = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "templates",
    fromValue,
    "TASK.md",
  );
  if (existsSync(conventionalPath)) return conventionalPath;

  // Helpful error: list what's actually under templates/ so the AI can
  // self-correct without having to ls the directory itself.
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
    // Best-effort listing — if we can't read templates/, just say what
    // we looked for. The AI can grep itself.
  }
  fail(
    `template '${fromValue}' not found at ${conventionalPath}` +
      (available.length > 0
        ? `\n  available templates under ${templatesDir}:\n    ${available.join("\n    ")}`
        : `\n  (no templates/ directory at ${templatesDir})`),
  );
}

function resolveParent(
  parentFlag: string | undefined,
  envCurrentTaskPath: string | undefined,
  tasks: RuntimeTask[],
): string | undefined {
  if (parentFlag) {
    if (looksLikePath(parentFlag)) {
      const segs = parentFlag.replace(/\\/g, "/").split("/").filter(Boolean);
      const last = segs[segs.length - 1];
      if (last && last.endsWith(".md")) return segs[segs.length - 2];
      return last || parentFlag;
    }
    const found = tasks.find((t) => t.id === parentFlag);
    if (!found) {
      fail(
        `--parent: no task with id '${parentFlag}' found in tasks.jsonl. ` +
          `Pass a valid task id.`,
      );
    }
    return found.id;
  }
  if (envCurrentTaskPath) {
    const segs = envCurrentTaskPath
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean);
    const last = segs[segs.length - 1];
    if (last && last.endsWith(".md")) return segs[segs.length - 2];
    return last || envCurrentTaskPath;
  }
  return undefined;
}

function parseVarFlag(raw: string): [string, string] {
  const i = raw.indexOf("=");
  if (i <= 0 || i === raw.length - 1) {
    fail(`--var must be in the form "key=value"; got: ${raw}`);
  }
  return [raw.slice(0, i).trim(), raw.slice(i + 1)];
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
function buildChildVars(opts: {
  templateVars: Record<string, unknown> | undefined;
  noInherit: boolean;
  explicitVars: Record<string, string>;
}): { vars: Record<string, unknown>; missing: string[] } {
  const hasContract =
    opts.templateVars !== undefined &&
    opts.templateVars !== null &&
    typeof opts.templateVars === "object" &&
    Object.keys(opts.templateVars).length > 0;

  const inherited = opts.noInherit ? {} : collectInheritedVars();
  const envWave = process.env.CONVERGE_TASK_WAVE;

  // Treat a declared value as "no default" when it's null, undefined, or
  // an empty string. The author's intent: "I require this key but have
  // no default — caller must supply it."
  const isMissingDefault = (v: unknown): boolean =>
    v === null || v === undefined || v === "";

  if (hasContract) {
    // STRICT mode — only the declared keys, applied through the precedence chain.
    const declared = opts.templateVars as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const missing: string[] = [];

    for (const key of Object.keys(declared)) {
      const templateDefault = declared[key];

      let value: unknown =
        // 1. Template's declared default (may be missing-default sentinel)
        isMissingDefault(templateDefault) ? undefined : templateDefault;

      // 2. Parent's env (only for the declared key)
      const envKey = `CONVERGE_VAR_${key.toUpperCase()}`;
      if (inherited[key.toLowerCase()] !== undefined) {
        value = inherited[key.toLowerCase()];
      } else if (process.env[envKey] !== undefined) {
        value = process.env[envKey];
      }

      // 3. Auto-wave for the specific 'wave' key
      if (
        key === "wave" &&
        envWave !== undefined &&
        envWave !== "" &&
        !("wave" in opts.explicitVars)
      ) {
        value = envWave;
      }

      // 4. Explicit --var override (caller's intent always wins)
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

  // PERMISSIVE mode — original behavior, no contract.
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
  id: string;
  fromValue: string; // template name (resolves to templates/<name>/TASK.md)
  vars: Record<string, string>;
  dependsOn: string[];
  noInherit: boolean;
  dry: boolean;
  workspace: string;
}

interface SpawnOneResult {
  id: string;
  taskMdPath: string;
  ok: boolean;
  error?: string;
}

/**
 * Spawn one task. Used by both the positional path (`converge spawn <id>`)
 * and the batch path (`converge spawn --batch <file>`).
 *
 * Throws on caller-fault errors (bad flags, missing template); returns
 * a structured result for per-row errors during batch mode.
 */
function spawnOne(args: SpawnOneArgs): SpawnOneResult {
  try {
    assertSafeId(args.id, "<id>");
  } catch (err) {
    return { id: args.id, taskMdPath: "", ok: false, error: (err as Error).message };
  }

  const playbook = process.env.CONVERGE_PLAYBOOK;
  if (!playbook) {
    return {
      id: args.id,
      taskMdPath: "",
      ok: false,
      error:
        "CONVERGE_PLAYBOOK env not set. Spawn is meant to be called from inside a running task body where the framework sets this automatically.",
    };
  }

  const templatePath = resolveTemplate(args.fromValue, args.workspace, playbook);

  ensureRuntimeLedger(args.workspace, playbook, undefined);
  const state = readRuntimeLedgerState(args.workspace, playbook);
  if (state.tasks.some((t) => t.id === args.id)) {
    return {
      id: args.id,
      taskMdPath: "",
      ok: false,
      error: `duplicate task id: ${args.id}`,
    };
  }

  const parentId = resolveParent(
    undefined, // no --parent flag; framework infers from current task
    process.env.CONVERGE_CURRENT_TASK_PATH,
    state.tasks,
  );

  const { content: taskMdContent, missing: missingVars } = renderChildTaskMd({
    templatePath,
    childId: args.id,
    dependsOn: args.dependsOn,
    inheritedExplicitVars: args.vars,
    noInherit: args.noInherit,
  }, process.env.CONVERGE_TASK_WAVE);

  // Strict-mode contract: if the template declares vars: and any
  // required key wasn't filled, refuse the spawn with a precise error
  // pointing at the template + the missing keys. This is the framework's
  // "child declares what it accepts" guarantee — caller can't silently
  // ship a child that expects $sprint_id and got nothing.
  if (missingVars.length > 0) {
    return {
      id: args.id,
      taskMdPath: "",
      ok: false,
      error:
        `missing required vars [${missingVars.join(", ")}] declared in template ` +
        `'${args.fromValue}' (${templatePath}). ` +
        `Pass them via --var key=value, or set them on the parent task's vars: so they inherit. ` +
        `To opt out of strict-mode entirely, remove the vars: block from the template.`,
    };
  }

  const validationError = validateTaskMdFrontmatter(taskMdContent);
  const journalPath = `.converge/journal/${playbook}/spawned/${args.id}`;
  const taskMdPath = `${journalPath}/TASK.md`;
  const absTaskMd = join(args.workspace, taskMdPath);

  const upsert = {
    id: args.id,
    taskPath: taskMdPath,
    taskRef: { kind: "template", name: args.fromValue } as TaskRef,
    params: { template: args.fromValue, vars: args.vars },
    goalId: "inventory",
    summary: args.id,
    status: "todo" as const,
    source: "spawned" as const,
    parent: parentId,
    playbook,
    metadata: {
      spawnedBy: "cli" as const,
      template: args.fromValue,
    },
  };

  if (args.dry) {
    console.log(
      JSON.stringify(
        {
          dry: true,
          wouldWrite: taskMdPath,
          wouldUpsert: upsert,
          taskMdPreview: taskMdContent,
          bodyBytes: taskMdContent.length,
          frontmatterValid: validationError === null,
          frontmatterError: validationError,
        },
        null,
        2,
      ),
    );
    if (validationError !== null) {
      return {
        id: args.id,
        taskMdPath,
        ok: false,
        error: validationError,
      };
    }
    return { id: args.id, taskMdPath, ok: true };
  }

  mkdirSync(dirname(absTaskMd), { recursive: true });
  writeFileSync(absTaskMd, taskMdContent, "utf-8");

  if (validationError !== null) {
    // Preserve evidence: rename to .rejected, write structured EVIDENCE.json
    const rejectedPath = `${absTaskMd}.rejected`;
    const evidencePath = `${absTaskMd}.EVIDENCE.json`;
    try {
      renameSync(absTaskMd, rejectedPath);
    } catch (renameErr) {
      console.error(
        `converge spawn: warning — could not rename ${absTaskMd} to .rejected: ${
          (renameErr as Error)?.message ?? renameErr
        }`,
      );
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
            taskId: args.id,
            template: args.fromValue,
            actual: {
              firstBytes: taskMdContent.slice(0, 400),
              byteLength: taskMdContent.length,
            },
            suggestedFix:
              "Inspect the template's frontmatter; ensure list-valued keys (outputs, inputs, checks, depends_on, tags, skills) are YAML lists.",
          },
          null,
          2,
        ),
        "utf-8",
      );
    } catch (evidenceErr) {
      console.error(
        `converge spawn: warning — could not write evidence to ${evidencePath}: ${
          (evidenceErr as Error)?.message ?? evidenceErr
        }`,
      );
    }
    return {
      id: args.id,
      taskMdPath,
      ok: false,
      error: `malformed TASK.md frontmatter: ${validationError}`,
    };
  }

  appendTaskUpsert(args.workspace, playbook, upsert);
  return { id: args.id, taskMdPath, ok: true };
}

/**
 * Batch mode entry. Reads JSONL from a file (or stdin if `-`).
 * Each line is a spawn spec; all are registered (or rejected) in
 * sequence. Per-row failures are reported but do not stop the batch.
 */
async function runBatch(opts: {
  source: string;
  workspace: string;
  dry: boolean;
  noInheritDefault: boolean;
}): Promise<void> {
  let content: string;
  if (opts.source === "-") {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    content = Buffer.concat(chunks).toString("utf-8");
  } else {
    const abs = isAbsolute(opts.source)
      ? opts.source
      : resolve(opts.workspace, opts.source);
    if (!existsSync(abs)) fail(`batch file not found: ${abs}`);
    content = readFileSync(abs, "utf-8");
  }

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("//"));

  let okCount = 0;
  let errCount = 0;
  for (let i = 0; i < lines.length; i++) {
    let entry: any;
    try {
      entry = JSON.parse(lines[i]);
    } catch (err) {
      console.error(
        `converge spawn: batch[${i}] JSON parse error: ${
          (err as Error)?.message ?? err
        }`,
      );
      errCount++;
      continue;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      console.error(`converge spawn: batch[${i}] must be a JSON object`);
      errCount++;
      continue;
    }
    if (typeof entry.id !== "string" || typeof entry.template !== "string") {
      console.error(
        `converge spawn: batch[${i}] requires 'id' (string) and 'template' (string)`,
      );
      errCount++;
      continue;
    }
    const vars: Record<string, string> = {};
    if (entry.vars && typeof entry.vars === "object") {
      for (const [k, v] of Object.entries(entry.vars)) {
        vars[k] = String(v);
      }
    }
    const dependsOn = Array.isArray(entry.after) ? entry.after.map(String) : [];

    const result = spawnOne({
      id: entry.id,
      fromValue: entry.template,
      vars,
      dependsOn,
      noInherit: entry.no_inherit === true || opts.noInheritDefault,
      dry: opts.dry,
      workspace: opts.workspace,
    });

    if (result.ok) {
      okCount++;
      console.log(`spawned: ${result.id} → ${result.taskMdPath}`);
    } else {
      errCount++;
      console.error(`converge spawn: batch[${i}] ${result.id} failed — ${result.error}`);
    }
  }

  console.log(`batch complete: ${okCount} ok, ${errCount} failed`);
  if (errCount > 0 && okCount === 0) process.exit(3);
}

export async function spawnCommand({
  positional,
  options,
}: SpawnCommandOptions): Promise<void> {
  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const dry = asBool(options.dry);
  const noInherit = asBool(options["no-inherit"]);

  // Status subcommand: `converge spawn status [--task=<id>] [--playbook=<pb>] [--json]`
  if (positional[0] === "status") {
    const { spawnStatusCommand } = await import("./commands-spawn-status.ts");
    await spawnStatusCommand({
      playbook: asString(options.playbook),
      task: asString(options.task),
      json: asBool(options.json),
    });
    return;
  }

  // Batch mode: `converge spawn --batch <file|->`
  const batchSource = asString(options.batch);
  if (batchSource !== undefined) {
    return runBatch({
      source: batchSource,
      workspace,
      dry,
      noInheritDefault: noInherit,
    });
  }

  // Reject removed flags loudly so callers using the old shape get a
  // clear error instead of a silent "template not found".
  for (const removed of ["from", "parent", "playbook", "title", "summary", "goal-id", "depends-on"] as const) {
    if (options[removed] !== undefined) {
      fail(
        `--${removed} is no longer supported. Use:\n` +
          "  converge spawn <id> <template> [--var k=v] [--after <sibling>] [--no-inherit]",
      );
    }
  }

  // Single-spawn shape: `converge spawn <id> <template>`
  const id = positional[0];
  const template = positional[1];
  if (!id || !template) {
    fail(
      "usage: converge spawn <id> <template> [--var k=v] [--after <sibling>] [--no-inherit]\n" +
        "       converge spawn --batch <file.jsonl|->",
    );
  }

  const vars: Record<string, string> = {};
  for (const raw of asMulti(options.var)) {
    const [k, v] = parseVarFlag(raw);
    vars[k] = v;
  }

  const dependsOn = asMulti(options.after);

  const result = spawnOne({
    id,
    fromValue: template,
    vars,
    dependsOn,
    noInherit,
    dry,
    workspace,
  });

  if (!result.ok) {
    console.error(`converge spawn: ${result.id} failed — ${result.error}`);
    process.exit(3);
  }
  console.log(`spawned: ${result.id} → ${result.taskMdPath}`);
}
