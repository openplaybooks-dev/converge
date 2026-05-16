/**
 * `converge spawn task` — register a new task in `tasks.jsonl` and write its
 * journal TASK.md. Two ways to provide the TASK.md content:
 *
 *   1. **File mode** — point `--task-file` at a complete TASK.md (frontmatter
 *      and body) and the CLI writes it to the journal verbatim. Use this when
 *      you've already composed the TASK.md (e.g. the AI dropped one under
 *      `.converge/tmp/`):
 *
 *      converge spawn task --id epoch-001 \
 *        --task-file .converge/tmp/epoch-001.md
 *
 *   2. **Compose mode** — pass each TASK.md field as a flag and the CLI builds
 *      the frontmatter for you. Body is inline via `--body`, or empty:
 *
 *      converge spawn task --id build-pipeline \
 *        --title "Build pipeline" \
 *        --description "Compile and run the data fetcher" \
 *        --input idea.md --output data/markets.db \
 *        --depends-on bootstrap \
 *        --check "build|pnpm build" \
 *        --check "db-has-markets|sqlite3 data/markets.db 'SELECT 1'" \
 *        --var epoch=001 \
 *        --body "## Steps\n\nFetch markets, persist to SQLite, exit 0."
 *
 * The two modes are mutually exclusive: file mode rejects frontmatter flags
 * and `--body`; compose mode rejects `--task-file`.
 *
 * Required env (the runner sets these on every task it dispatches):
 *   CONVERGE_WORKSPACE          — project root containing .converge/
 *   CONVERGE_PLAYBOOK           — playbook name
 *   CONVERGE_CURRENT_TASK_PATH  — optional; the currently-executing task's
 *                                 directory. Used as the spawned row's
 *                                 `parentTaskPath` when `--parent` is omitted.
 *
 * Flags:
 *   --id <id>                  required; new task's stable identifier
 *   --summary <text>           one-line description for the ledger row
 *                              (defaults to --title, then --id)
 *   --goal-id <id>             goal this task contributes to (default "inventory")
 *   --parent <id|path>         attach to any existing task by id or full path
 *                              (overrides CONVERGE_CURRENT_TASK_PATH)
 *   --dry                      validate + preview as JSON; no mutation
 *
 *   File mode:
 *     --task-file <path>       complete TASK.md (frontmatter + body)
 *
 *   Compose mode (any one triggers frontmatter assembly):
 *     --body <text>            inline markdown body
 *     --title <text>
 *     --description <text>
 *     --input <path>           repeatable
 *     --output <path>          repeatable
 *     --depends-on <id>        repeatable
 *     --tag <name>             repeatable
 *     --check "<id>|<cmd>"     repeatable; first '|' separates id from cmd
 *     --var key=value          repeatable
 *     --agent <name>
 *     --skill <name>           repeatable
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  appendTaskUpsert,
  ensureRuntimeLedger,
  readRuntimeLedgerState,
  type RuntimeTask,
} from "@converge/core/task/goal/runtime-ledger.ts";
import {
  parseTaskMdString,
  serializeTaskMd,
} from "@converge/core/config/task-md-definition.ts";
import { assertSafeId } from "@converge/core/task/goal/safe-id.ts";

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
    value.startsWith(".converge")
  );
}

function resolveParent(
  parentFlag: string | undefined,
  envCurrentTaskPath: string | undefined,
  tasks: RuntimeTask[],
): string | undefined {
  if (parentFlag) {
    if (looksLikePath(parentFlag)) {
      // If given a path, extract just the task ID (last path segment)
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
  // Fall back to CONVERGE_CURRENT_TASK_PATH so the runner can chain spawned
  // children to whichever task is currently executing without every caller
  // having to thread the parent id manually.
  if (envCurrentTaskPath) {
    const segs = envCurrentTaskPath.replace(/\\/g, "/").split("/").filter(Boolean);
    const last = segs[segs.length - 1];
    if (last && last.endsWith(".md")) return segs[segs.length - 2];
    return last || envCurrentTaskPath;
  }
  return undefined;
}

function parseCheckFlag(raw: string): { id: string; cmd: string } {
  const i = raw.indexOf("|");
  if (i <= 0 || i === raw.length - 1) {
    fail(`--check must be in the form "<id>|<cmd>"; got: ${raw}`);
  }
  return { id: raw.slice(0, i).trim(), cmd: raw.slice(i + 1) };
}

function parseVarFlag(raw: string): [string, string] {
  const i = raw.indexOf("=");
  if (i <= 0 || i === raw.length - 1) {
    fail(`--var must be in the form "key=value"; got: ${raw}`);
  }
  return [raw.slice(0, i).trim(), raw.slice(i + 1)];
}

interface AssembleArgs {
  id: string;
  title?: string;
  description?: string;
  inputs: string[];
  outputs: string[];
  dependsOn: string[];
  tags: string[];
  checks: { id: string; cmd: string }[];
  vars: Record<string, string>;
  agent?: string;
  skills: string[];
  body: string;
}

/**
 * Build a complete TASK.md from compose-mode flags.
 *
 * Delegates to `serializeTaskMd` from core — uses the `yaml` library to
 * emit the frontmatter, so special characters (colons, pipes, brackets,
 * backslashes, newlines, multi-line strings) round-trip safely. Replaces
 * the previous hand-written per-field string concatenation that required
 * a custom `yamlStr` quoter for every field.
 */
function assembleTaskMd(args: AssembleArgs): string {
  return serializeTaskMd({
    id: args.id,
    title: args.title,
    description: args.description,
    agent: args.agent,
    skills: args.skills.length > 0 ? args.skills : undefined,
    depends_on: args.dependsOn.length > 0 ? args.dependsOn : undefined,
    tags: args.tags.length > 0 ? args.tags : undefined,
    inputs: args.inputs.length > 0 ? args.inputs : undefined,
    outputs: args.outputs.length > 0 ? args.outputs : undefined,
    checks:
      args.checks.length > 0
        ? args.checks.map((c) => ({
            id: c.id,
            cmd: c.cmd,
            description: c.id,
            type: "cmd" as const,
          }))
        : undefined,
    vars: Object.keys(args.vars).length > 0 ? args.vars : undefined,
    body: args.body || undefined,
  });
}

/**
 * Validate that a rendered TASK.md has well-formed YAML frontmatter.
 * Returns null on success, or a string describing the failure.
 *
 * This is the spawn-time gate that prevents phantom work items: if the
 * frontmatter is corrupted (e.g. a templating bug leaked shell metacharacters
 * into a YAML scalar), reject loudly here so the id never reaches the ledger.
 */
function validateTaskMdFrontmatter(content: string): string | null {
  // TASK.md without any frontmatter is legal — parseTaskMd treats the whole
  // file as body. Only reject when a `---` delimiter is present, signaling
  // the author intended frontmatter but produced invalid YAML.
  if (!content.startsWith("---")) {
    return null;
  }
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
    // Reject the specific corruption we've seen in the wild: outputs/inputs/
    // checks declared as a scalar instead of a list, usually because a
    // templating bug spliced a string into the YAML at the list position.
    for (const key of ["outputs", "inputs", "checks", "depends_on", "tags", "skills"] as const) {
      if (obj[key] !== undefined && obj[key] !== null && !Array.isArray(obj[key])) {
        return `frontmatter key '${key}' must be a YAML list (got ${typeof obj[key]}: ${JSON.stringify(obj[key]).slice(0, 120)})`;
      }
    }
    return null;
  } catch (err: any) {
    return `YAML parse error: ${err?.message ?? String(err)}`;
  }
}

export async function spawnCommand({
  positional,
  options,
}: SpawnCommandOptions): Promise<void> {
  const kind = positional[0];
  if (kind !== "task") {
    fail(
      "usage: converge spawn task --id <id> " +
        "(--task-file <path> | --body <text> | --title <text> [+ frontmatter flags]) " +
        "[--summary <text>] [--goal-id <id>] [--parent <id|path>] [--dry]",
    );
  }

  const id = asString(options.id);
  if (!id) fail("--id is required");
  // Validate the id against the canonical grammar before it touches any
  // filesystem path. Without this guard, `--id ../escape` (or a hallucinated
  // id from an autonomous agent) could write outside the inventory tree.
  try {
    assertSafeId(id, "--id");
  } catch (err) {
    fail((err as Error).message);
  }

  const title = asString(options.title);
  const description = asString(options.description);
  const inputs = asMulti(options.input);
  const outputs = asMulti(options.output);
  const dependsOn = asMulti(options["depends-on"]);
  const tags = asMulti(options.tag);
  const checks = asMulti(options.check).map(parseCheckFlag);
  const vars: Record<string, string> = {};
  for (const raw of asMulti(options.var)) {
    const [k, v] = parseVarFlag(raw);
    vars[k] = v;
  }
  const agent = asString(options.agent);
  const skills = asMulti(options.skill);

  const summary = asString(options.summary) ?? title ?? id!;
  const dry = asBool(options.dry);

  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const playbook = process.env.CONVERGE_PLAYBOOK;
  if (!playbook) fail("CONVERGE_PLAYBOOK environment variable is not set");

  const goalId =
    asString(options["goal-id"]) ?? asString(options.goalId) ?? "inventory";

  const bodyFlag = asString(options.body);
  const taskFile = asString(options["task-file"]);

  // Wiring flags (composable with --task-file): --depends-on, --parent
  // Content flags (mutually exclusive with --task-file): --title, --body, --input, etc.
  const wiringFlagPresent = dependsOn.length > 0;
  const contentFlagPresent =
    bodyFlag !== undefined ||
    title !== undefined ||
    description !== undefined ||
    inputs.length > 0 ||
    outputs.length > 0 ||
    tags.length > 0 ||
    checks.length > 0 ||
    Object.keys(vars).length > 0 ||
    agent !== undefined ||
    skills.length > 0;

  if (taskFile !== undefined && contentFlagPresent) {
    fail(
      "--task-file is mutually exclusive with content flags (--title, --body, --input, --output, --check, etc.). " +
        "Wiring flags (--depends-on, --parent) are composable with --task-file.",
    );
  }

  if (taskFile === undefined && !contentFlagPresent && !wiringFlagPresent) {
    fail(
      "specify the task content: --task-file <path>, --body <text>, or at " +
        "least one frontmatter flag (--title, --output, --check, ...).",
    );
  }

  let taskMdContent: string;
  if (taskFile !== undefined) {
    const abs = isAbsolute(taskFile) ? taskFile : resolve(workspace, taskFile);
    if (!existsSync(abs)) fail(`task file not found: ${abs}`);
    taskMdContent = readFileSync(abs, "utf-8");
    // Merge wiring flags (--depends-on) into file-mode frontmatter
    if (wiringFlagPresent) {
      taskMdContent = mergeWiringFlags(taskMdContent, { dependsOn });
    }
  } else {
    taskMdContent = assembleTaskMd({
      id: id!,
      title,
      description,
      inputs,
      outputs,
      dependsOn,
      tags,
      checks,
      vars,
      agent,
      skills,
      body: (bodyFlag ?? "").trim(),
    });
  }

  ensureRuntimeLedger(workspace, playbook!, undefined);
  const state = readRuntimeLedgerState(workspace, playbook!);
  if (state.tasks.some((t) => t.id === id)) {
    fail(`duplicate task id: ${id}`);
  }

  const parentId = resolveParent(
    asString(options.parent),
    process.env.CONVERGE_CURRENT_TASK_PATH,
    state.tasks,
  );

  const inventoryPath = `.converge/inventory/${playbook}/spawned/${id}`;
  const taskMdPath = `${inventoryPath}/TASK.md`;
  const absTaskMd = join(workspace, taskMdPath);

  const upsert = {
    id: id!,
    taskPath: taskMdPath, // inventory/spawned/<id>/TASK.md
    goalId,
    summary,
    status: "todo" as const,
    source: "spawned" as const,
    parent: parentId,
    playbook: playbook!,
    metadata: { spawnedBy: "cli" },
  };

  // Spawn-time YAML gate — reject malformed frontmatter before the id can
  // reach the ledger. A templating bug that polluted the rendered content
  // (e.g. shell metacharacters leaked into a YAML list slot) is caught here
  // rather than surfacing later as a phantom work item.
  const validationError = validateTaskMdFrontmatter(taskMdContent);

  if (dry) {
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
    if (validationError !== null) process.exit(3);
    return;
  }

  mkdirSync(dirname(absTaskMd), { recursive: true });
  writeFileSync(absTaskMd, taskMdContent, "utf-8");

  if (validationError !== null) {
    // Preserve evidence for forensics AND for AI self-repair: rename to
    // .rejected and write a structured EVIDENCE.json sibling. The evidence
    // packet is the framework's canonical fail-feedback shape — what was
    // expected, what was found, suggested fix. Repair AI reads this.
    const rejectedPath = `${absTaskMd}.rejected`;
    const evidencePath = `${absTaskMd}.EVIDENCE.json`;
    try {
      renameSync(absTaskMd, rejectedPath);
    } catch (renameErr) {
      // Rename failed (target may exist, permissions, etc.). The original
      // file at absTaskMd is still on disk — operator can inspect it.
      // Surface the rename failure on stderr so it's not invisible.
      console.error(
        `converge spawn: warning — could not rename ${absTaskMd} to .rejected: ${
          (renameErr as Error)?.message ?? renameErr
        }`,
      );
    }
    try {
      const evidence = {
        kind: "definition",
        taskMdPath: absTaskMd,
        rejectedPath,
        parseError: validationError,
        detectedAt: new Date().toISOString(),
        taskId: id,
        expected: {
          format:
            "TASK.md with `---` delimited YAML frontmatter, then markdown body.",
          requiredKeys: ["id"],
          listValuedKeys: [
            "outputs",
            "inputs",
            "checks",
            "depends_on",
            "tags",
            "skills",
          ],
        },
        actual: {
          firstBytes: taskMdContent.slice(0, 400),
          byteLength: taskMdContent.length,
        },
        suggestedFix:
          "Re-emit the TASK.md frontmatter with each list-valued key followed by `  - item` bullets, and ensure scalar values containing colons, pipes, or backslashes are quoted.",
      };
      writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), "utf-8");
    } catch (evidenceErr) {
      // EVIDENCE.json is the AI-feedback packet the self-repair flow
      // reads. Failing to write it loses the diagnostic — surface to
      // stderr so the operator can investigate (out-of-disk, permission,
      // etc.) and provide the parser error manually if needed.
      console.error(
        `converge spawn: warning — could not write evidence to ${evidencePath}: ${
          (evidenceErr as Error)?.message ?? evidenceErr
        }`,
      );
    }
    console.error(
      `converge spawn: rejected ${id} — malformed TASK.md frontmatter\n` +
        `  reason: ${validationError}\n` +
        `  preserved at: ${rejectedPath}\n` +
        `  evidence at: ${evidencePath}\n` +
        `  no entry added to tasks.jsonl.`,
    );
    process.exit(3);
  }

  appendTaskUpsert(workspace, playbook!, upsert);

  console.log(`spawned: ${id} → ${taskMdPath}`);
}

/**
 * Merge wiring flags (--depends-on) into a TASK.md file's frontmatter.
 *
 * Parses the frontmatter as YAML, merges the new depends_on entries, and
 * re-serializes via `serializeTaskMd`. The previous string-concat
 * implementation could corrupt the frontmatter when dependency ids
 * contained YAML special chars (colons, pipes, brackets) — replacing it
 * with a real parse/serialize cycle eliminates that class of bug.
 *
 * Falls back to returning the input unchanged if the frontmatter can't be
 * parsed (so callers can still inspect the rejected bytes via the
 * spawn-time validator).
 */
function mergeWiringFlags(
  content: string,
  wiring: { dependsOn: string[] },
): string {
  if (wiring.dependsOn.length === 0) return content;
  try {
    const shape = parseTaskMdString(content);
    if (!shape.id) return content;
    const existing = shape.depends_on ?? [];
    const merged = [...existing];
    for (const d of wiring.dependsOn) {
      if (!merged.includes(d)) merged.push(d);
    }
    return serializeTaskMd({ ...shape, depends_on: merged });
  } catch (err) {
    // If the frontmatter doesn't parse, leave the bytes alone — the
    // spawn-time validator will surface the failure with full context.
    // We surface a debug log so an operator wondering "why didn't
    // depends_on get merged?" has a breadcrumb.
    if (process.env.CONVERGE_DEBUG) {
      console.warn(
        `   Debug: mergeWiringFlags could not parse frontmatter, leaving content unchanged: ${
          (err as Error)?.message ?? err
        }`,
      );
    }
    return content;
  }
}
