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
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  appendTaskUpsert,
  ensureRuntimeLedger,
  readRuntimeLedgerState,
  type RuntimeTask,
} from "@converge/core/task/goal/runtime-ledger.ts";

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
    if (looksLikePath(parentFlag)) return parentFlag;
    const found = tasks.find((t) => t.id === parentFlag);
    if (!found) {
      fail(
        `--parent: no task with id '${parentFlag}' found in tasks.jsonl. ` +
          `Pass a full taskPath instead, or run after the parent has been ` +
          `inventoried.`,
      );
    }
    return found.taskPath;
  }
  return envCurrentTaskPath;
}

/** Minimal YAML string quoting — JSON-quote whenever YAML would parse oddly. */
function yamlStr(value: string): string {
  if (
    value.length === 0 ||
    /[:#\[\]{}&*!|>'"%@`,]/.test(value) ||
    /^\s|\s$/.test(value) ||
    value.includes("\n") ||
    // Scalars that would otherwise round-trip as non-strings
    /^-?\d+(\.\d+)?$/.test(value) || // plain numbers
    /^0\d/.test(value) || // leading zero ("001" must round-trip as a string)
    /^(true|false|null|yes|no|on|off|~)$/i.test(value)
  ) {
    return JSON.stringify(value);
  }
  return value;
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

function assembleTaskMd(args: AssembleArgs): string {
  const fm: string[] = ["---"];
  fm.push(`id: ${yamlStr(args.id)}`);
  if (args.title) fm.push(`title: ${yamlStr(args.title)}`);
  if (args.description) fm.push(`description: ${yamlStr(args.description)}`);
  if (args.agent) fm.push(`agent: ${yamlStr(args.agent)}`);
  if (args.skills.length > 0) {
    fm.push("skills:");
    args.skills.forEach((s) => fm.push(`  - ${yamlStr(s)}`));
  }
  if (args.dependsOn.length > 0) {
    fm.push("depends_on:");
    args.dependsOn.forEach((d) => fm.push(`  - ${yamlStr(d)}`));
  }
  if (args.tags.length > 0) {
    fm.push("tags:");
    args.tags.forEach((t) => fm.push(`  - ${yamlStr(t)}`));
  }
  if (args.inputs.length > 0) {
    fm.push("inputs:");
    args.inputs.forEach((i) => fm.push(`  - ${yamlStr(i)}`));
  }
  if (args.outputs.length > 0) {
    fm.push("outputs:");
    args.outputs.forEach((o) => fm.push(`  - ${yamlStr(o)}`));
  }
  if (args.checks.length > 0) {
    fm.push("checks:");
    for (const c of args.checks) {
      fm.push(`  - id: ${yamlStr(c.id)}`);
      fm.push(`    cmd: ${yamlStr(c.cmd)}`);
    }
  }
  if (Object.keys(args.vars).length > 0) {
    fm.push("vars:");
    for (const [k, v] of Object.entries(args.vars)) {
      fm.push(`  ${k}: ${yamlStr(v)}`);
    }
  }
  fm.push("---");
  const bodyBlock = args.body ? `\n${args.body}\n` : "\n";
  return fm.join("\n") + "\n" + bodyBlock;
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

  // Compose-mode triggers
  const composeFlagPresent =
    bodyFlag !== undefined ||
    title !== undefined ||
    description !== undefined ||
    inputs.length > 0 ||
    outputs.length > 0 ||
    dependsOn.length > 0 ||
    tags.length > 0 ||
    checks.length > 0 ||
    Object.keys(vars).length > 0 ||
    agent !== undefined ||
    skills.length > 0;

  if (taskFile !== undefined && composeFlagPresent) {
    fail(
      "--task-file is mutually exclusive with --body and frontmatter flags. " +
        "Pick one: either provide a complete TASK.md via --task-file, or " +
        "compose one with --title/--input/--output/--check/--body/etc.",
    );
  }

  if (taskFile === undefined && !composeFlagPresent) {
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

  const parentTaskPath = resolveParent(
    asString(options.parent),
    process.env.CONVERGE_CURRENT_TASK_PATH,
    state.tasks,
  );

  const taskPath = `.converge/inventory/${playbook}/spawned/${id}`;
  const taskMdPath = `${taskPath}/TASK.md`;
  const absTaskMd = join(workspace, taskMdPath);

  const upsert = {
    id: id!,
    goalId,
    summary,
    status: "todo" as const,
    source: "spawned" as const,
    taskPath,
    parentTaskPath,
    playbook: playbook!,
    metadata: { spawnedBy: "cli" },
  };

  if (dry) {
    console.log(
      JSON.stringify(
        {
          dry: true,
          wouldWrite: taskMdPath,
          wouldAppend: upsert,
          taskMdPreview: taskMdContent,
          bodyBytes: taskMdContent.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  mkdirSync(dirname(absTaskMd), { recursive: true });
  writeFileSync(absTaskMd, taskMdContent, "utf-8");
  appendTaskUpsert(workspace, playbook!, upsert);

  console.log(`spawned: ${id} → ${taskMdPath}`);
}
