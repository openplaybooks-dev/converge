/**
 * `converge tasks <subcommand>` — inspect and mutate the task inventory.
 * Reads/writes .converge/inventory/<pb>/tasks.jsonl via the framework's
 * runtime-ledger helpers.
 *
 * Subcommands:
 *   list  [--source spawned|static|backlog] [--status STATUS] [--playbook X]
 *   status <id> [--playbook X]
 *   wait <id> [--timeout S] [--interval N] [--playbook X]
 *   wait-many --ids-file <path> [--timeout S] [--interval N] [--playbook X]
 *   mark <id> --status STATUS [--reasoning TEXT] [--playbook X]
 *   reset <id> | --status STATUS | --all [--dry] [--playbook X]
 */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  appendTaskStatus,
  readRuntimeLedgerState,
  type RuntimeTask,
  type TaskRuntimeStatus,
} from "@openplaybooks/converge-core/task/goal";

export interface TasksCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

const TERMINAL_STATUSES: ReadonlyArray<TaskRuntimeStatus> = [
  "done",
  "awaiting-review",
  "dropped",
  "blocked",
] as const;
const VALID_STATUSES: ReadonlyArray<TaskRuntimeStatus> = [
  "todo",
  "doing",
  "awaiting-review",
  "done",
  "blocked",
  "dropped",
] as const;

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) {
    return Number(v);
  }
  return fallback;
}

function fail(message: string, code = 2): never {
  console.error(`converge tasks: ${message}`);
  process.exit(code);
}

function resolveContext(options: Record<string, unknown>): {
  workspace: string;
  playbook: string;
} {
  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const playbook = asString(options.playbook) ?? process.env.CONVERGE_PLAYBOOK;
  if (!playbook) {
    fail("--playbook is required (or set CONVERGE_PLAYBOOK env)");
  }
  return { workspace, playbook: playbook! };
}

function findTask(
  workspace: string,
  playbook: string,
  id: string,
): RuntimeTask | undefined {
  const state = readRuntimeLedgerState(workspace, playbook);
  return state.tasks.find((t) => t.id === id);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTerminal(status: string | undefined): boolean {
  return (
    status === "done" ||
    status === "awaiting-review" ||
    status === "dropped" ||
    status === "blocked"
  );
}

async function waitOne(
  workspace: string,
  playbook: string,
  id: string,
  intervalSec: number,
  timeoutSec: number,
): Promise<number> {
  const start = Date.now();
  while (true) {
    const task = findTask(workspace, playbook, id);
    const status = task?.status ?? "missing";
    if (status === "done") {
      console.log(`[wait] ${id} -> done`);
      return 0;
    }
    if (status === "awaiting-review" || status === "dropped" || status === "blocked") {
      console.log(`[wait] ${id} -> ${status}`);
      return 1;
    }
    console.log(`[wait] ${id} (status=${status})`);
    if ((Date.now() - start) / 1000 >= timeoutSec) {
      console.error(`[wait] ${id} timed out after ${timeoutSec}s`);
      return 2;
    }
    await sleep(intervalSec * 1000);
  }
}

/**
 * An id is a *phantom* when it appears in --ids-file but:
 *   1. has no entry in tasks.jsonl (never reached the ledger), AND
 *   2. has no journal directory under .converge/journal/<playbook>/tasks/.
 *
 * This is the fingerprint of a spawn that wrote to work-items.json but
 * failed before the task was registered — almost always a malformed
 * TASK.md frontmatter that the spawn-time gate (or upstream) rejected.
 * Without this check, wait-many would block forever or time out silently
 * and the verify task would record a false `passed: true`.
 */
function isPhantom(
  workspace: string,
  playbook: string,
  id: string,
  inLedger: boolean,
): boolean {
  if (inLedger) return false;
  const journalDir = join(
    workspace,
    ".converge",
    "journal",
    playbook,
    "tasks",
    id,
  );
  return !existsSync(journalDir);
}

async function waitMany(
  workspace: string,
  playbook: string,
  ids: string[],
  intervalSec: number,
  timeoutSec: number,
): Promise<number> {
  const start = Date.now();
  // Phantom ids never settle on their own. Give them one extra poll cycle
  // to allow a late-arriving spawn to catch up, then fail loudly.
  let phantomTolerance = 1;
  while (true) {
    const state = readRuntimeLedgerState(workspace, playbook);
    const byId = Object.fromEntries(state.tasks.map((t) => [t.id, t]));
    let done = 0;
    let failed = 0;
    let pending = 0;
    const phantoms: string[] = [];
    for (const id of ids) {
      const t = byId[id];
      const status = t?.status ?? "missing";
      if (status === "done") {
        done++;
      } else if (status === "dropped" || status === "blocked") {
        failed++;
      } else {
        if (status === "missing" && isPhantom(workspace, playbook, id, false)) {
          phantoms.push(id);
        }
        pending++;
      }
    }
    console.log(
      `[wait-many] done=${done}/${ids.length} failed=${failed} pending=${pending}` +
        (phantoms.length > 0 ? ` phantoms=${phantoms.length}` : ""),
    );
    if (pending === 0) return failed > 0 ? 1 : 0;
    if (phantoms.length > 0) {
      if (phantomTolerance > 0) {
        phantomTolerance--;
      } else {
        console.error(
          `[wait-many] ${phantoms.length} phantom id(s) in work-items.json never reached the journal:`,
        );
        for (const id of phantoms) console.error(`  - ${id}`);
        console.error(
          `  These ids were spawned but no TASK.md/ledger entry was created.\n` +
            `  Likely a malformed TASK.md rejected by 'converge spawn task' (see\n` +
            `  .converge/inventory/${playbook}/spawned/<id>/TASK.md.rejected for evidence).`,
        );
        return 3;
      }
    }
    if ((Date.now() - start) / 1000 >= timeoutSec) {
      console.error(`[wait-many] timed out after ${timeoutSec}s`);
      return 2;
    }
    await sleep(intervalSec * 1000);
  }
}

function printTaskTable(tasks: RuntimeTask[]): void {
  const cols = [
    { key: "id", label: "ID", width: 28 },
    { key: "status", label: "STATUS", width: 9 },
    { key: "source", label: "SOURCE", width: 8 },
    { key: "title", label: "TITLE", width: 50 },
  ] as const;

  const header = cols.map((c) => c.label.padEnd(c.width)).join("  ");
  const sep = cols.map((c) => "─".repeat(c.width)).join("──");
  console.log(header);
  console.log(sep);

  for (const t of tasks) {
    const id = (t.id ?? "").padEnd(cols[0].width).substring(0, cols[0].width);
    const status = (t.status ?? "").padEnd(cols[1].width).substring(0, cols[1].width);
    const source = ((t.source ?? "playbook") as string).padEnd(cols[2].width).substring(0, cols[2].width);
    const title = ((t.title ?? t.id ?? "") as string).padEnd(cols[3].width).substring(0, cols[3].width);
    console.log(`${id}  ${status}  ${source}  ${title}`);
  }
  console.log(`\n${tasks.length} task(s).`);
}

export async function tasksCommand({
  positional,
  options,
}: TasksCommandOptions): Promise<void> {
  const sub = positional[0];
  if (!sub) {
    fail(
      "usage: converge tasks <list|status|wait|wait-many|mark|reset> [args] [--playbook X]",
    );
  }
  const ctx = resolveContext(options);

  switch (sub) {
    case "list": {
      const state = readRuntimeLedgerState(ctx.workspace, ctx.playbook);
      const source = asString(options.source);
      const status = asString(options.status);
      let rows = state.tasks;
      if (source) rows = rows.filter((t) => t.source === source);
      if (status) rows = rows.filter((t) => t.status === status);
      if (rows.length === 0) {
        console.log("No tasks found.");
        return;
      }
      // Human-readable table when stdout is a TTY; JSON when piped.
      if (process.stdout.isTTY) {
        printTaskTable(rows);
      } else {
        console.log(JSON.stringify(rows));
      }
      return;
    }
    case "status": {
      const id = positional[1];
      if (!id) fail("usage: converge tasks status <id>");
      const task = findTask(ctx.workspace, ctx.playbook, id);
      console.log(task?.status ?? "missing");
      return;
    }
    case "wait": {
      const id = positional[1];
      if (!id) fail("usage: converge tasks wait <id> [--timeout S] [--interval N]");
      const interval = asNumber(options.interval, 20);
      const timeout = asNumber(options.timeout, 3600);
      const code = await waitOne(ctx.workspace, ctx.playbook, id, interval, timeout);
      process.exit(code);
    }
    case "wait-many": {
      const idsFile = asString(options["ids-file"]);
      if (!idsFile)
        fail(
          "usage: converge tasks wait-many --ids-file <path> [--timeout S] [--interval N]",
        );
      const path = join(ctx.workspace, idsFile!);
      if (!existsSync(path)) fail(`ids-file not found: ${path}`);
      let ids: string[];
      try {
        const parsed = JSON.parse(readFileSync(path, "utf-8"));
        if (!Array.isArray(parsed)) fail("ids-file must contain a JSON array of strings");
        ids = parsed.map(String);
      } catch (err: any) {
        fail(`ids-file parse error: ${err.message}`);
      }
      const interval = asNumber(options.interval, 20);
      const timeout = asNumber(options.timeout, 7200);
      const code = await waitMany(ctx.workspace, ctx.playbook, ids, interval, timeout);
      process.exit(code);
    }
    case "mark": {
      const id = positional[1];
      if (!id) fail("usage: converge tasks mark <id> --status STATUS [--reasoning TEXT]");
      const status = asString(options.status);
      if (!status) fail("--status is required");
      if (!VALID_STATUSES.includes(status as TaskRuntimeStatus)) {
        fail(`invalid status '${status}'; expected one of ${VALID_STATUSES.join(", ")}`);
      }
      const reasoning = asString(options.reasoning);
      const metadata: Record<string, unknown> = { mutator: "cli" };
      if (reasoning) metadata.reasoning = reasoning;
      appendTaskStatus(
        ctx.workspace,
        ctx.playbook,
        id,
        status as TaskRuntimeStatus,
        metadata,
      );
      console.log(`${id} -> ${status}${reasoning ? ` (${reasoning})` : ""}`);
      return;
    }
    case "reset": {
      const id = positional[1];
      const statusFilter = asString(options.status);
      const sourceFilter = asString(options.source);
      const allFlag = options.all === true || options.all === "true";
      const dryFlag = options.dry === true || options.dry === "true";

      if (!id && !statusFilter && !sourceFilter && !allFlag) {
        fail("usage: converge tasks reset <id> | --status STATUS | --source SOURCE | --all [--dry]");
      }

      const state = readRuntimeLedgerState(ctx.workspace, ctx.playbook);
      let rows = state.tasks;

      if (id) {
        rows = rows.filter((t) => t.id === id);
      }
      if (statusFilter) {
        rows = rows.filter((t) => t.status === statusFilter);
      }
      if (sourceFilter) {
        rows = rows.filter((t) => (t.source ?? "playbook") === sourceFilter);
      }
      if (allFlag) {
        rows = rows.filter((t) => t.status !== "done");
      }

      if (rows.length === 0) {
        console.log("No matching tasks to reset.");
        return;
      }

      if (dryFlag) {
        console.log(`Would reset ${rows.length} task(s):`);
        for (const t of rows) {
          console.log(`  ${t.id} (${t.status}, source=${t.source ?? "playbook"})`);
        }
        return;
      }

      // Clear journal attempt directories for each task
      const journalDir = join(ctx.workspace, ".converge", "journal", ctx.playbook, "tasks");
      let cleared = 0;
      for (const t of rows) {
        const attemptDir = join(journalDir, t.id, "attempts");
        if (existsSync(attemptDir)) {
          try {
            rmSync(attemptDir, { recursive: true, force: true });
            cleared++;
          } catch {
            // Best-effort cleanup
          }
        }
        // Reset status in ledger
        appendTaskStatus(ctx.workspace, ctx.playbook, t.id, "todo", { mutator: "cli", action: "reset" });
      }

      console.log(`Reset ${rows.length} task(s) to todo, cleared ${cleared} journal attempt dir(s).`);
      return;
    }
    default:
      fail(
        `unknown subcommand '${sub}' — expected one of list|status|wait|wait-many|mark`,
      );
  }
}

const _internals = { isTerminal, TERMINAL_STATUSES };
