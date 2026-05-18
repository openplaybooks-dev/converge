/**
 * `converge goals <subcommand>` — inspect and mutate the playbook's goal
 * state. The goal-done sentinel directory (`.converge/artifacts/<pb>/goals/`)
 * is the source of truth.
 *
 * Subcommands:
 *   list     [--playbook X]                  JSON array with done:bool per goal
 *   next     [--playbook X]                  next buildable goal as JSON,
 *                                            or {"done":true}
 *   pending  [--playbook X]                  array of un-done goals (subset of list)
 *   done <id> [--playbook X] [--force]       re-validate goal checks; write
 *                                            sentinel only if all pass.
 *                                            --force skips re-validation.
 *   undone <id> [--playbook X]               remove the sentinel
 *
 * All subcommands accept --playbook (defaults to CONVERGE_PLAYBOOK env).
 * Operate against CONVERGE_WORKSPACE (defaults to cwd).
 */

import { join } from "node:path";
import {
  goalsSentinelDir,
  getPendingGoals,
  parsePlaybookGoals,
  readDoneGoalIds,
  removeGoalDoneSentinel,
  runGoalChecks,
  writeGoalDoneSentinel,
  type PlaybookGoal,
} from "@openplaybooks/converge-core/task/goal";

export interface GoalsCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1";
}

function fail(message: string, code = 2): never {
  console.error(`converge goals: ${message}`);
  process.exit(code);
}

function resolveContext(options: Record<string, unknown>): {
  workspace: string;
  playbook: string;
  playbookYml: string;
} {
  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const playbook =
    asString(options.playbook) ?? process.env.CONVERGE_PLAYBOOK;
  if (!playbook) {
    fail("--playbook is required (or set CONVERGE_PLAYBOOK env)");
  }
  const playbookYml = join(
    workspace,
    ".converge",
    "playbooks",
    playbook!,
    "playbook.yml",
  );
  return { workspace, playbook: playbook!, playbookYml };
}

function annotateGoals(
  goals: PlaybookGoal[],
  done: Set<string>,
): (PlaybookGoal & { done: boolean })[] {
  return goals.map((g) => ({ ...g, done: done.has(g.id) }));
}

export async function goalsCommand({
  positional,
  options,
}: GoalsCommandOptions): Promise<void> {
  const sub = positional[0];
  if (!sub) {
    fail(
      "usage: converge goals <list|next|pending|done|undone> [args] [--playbook X]",
    );
  }

  const ctx = resolveContext(options);

  switch (sub) {
    case "list": {
      const goals = parsePlaybookGoals(ctx.playbookYml);
      const done = readDoneGoalIds(ctx.workspace, ctx.playbook);
      console.log(JSON.stringify(annotateGoals(goals, done)));
      return;
    }
    case "pending": {
      const goals = parsePlaybookGoals(ctx.playbookYml);
      const done = readDoneGoalIds(ctx.workspace, ctx.playbook);
      const pending = getPendingGoals(goals, done).filter((g) => !g.done);
      console.log(JSON.stringify(pending));
      return;
    }
    case "next": {
      const goals = parsePlaybookGoals(ctx.playbookYml);
      const done = readDoneGoalIds(ctx.workspace, ctx.playbook);
      const pending = getPendingGoals(goals, done).filter((g) => !g.done);
      if (pending.length === 0) {
        console.log(JSON.stringify({ done: true }));
        return;
      }
      // Return the topologically-first buildable goal (singular), per the
      // command contract. Callers that want the full pending list should use
      // `converge goals pending`.
      console.log(JSON.stringify(pending[0]));
      return;
    }
    case "done": {
      const id = positional[1];
      if (!id) fail("usage: converge goals done <id> [--force]");
      const goals = parsePlaybookGoals(ctx.playbookYml);
      const goal = goals.find((g) => g.id === id);
      if (!goal) fail(`unknown goal id: ${id}`);
      const force = asBool(options.force);

      if (force) {
        // --force bypasses the re-validation gate. This is dangerous in
        // autonomous runs because it lets a verify task with shallow checks
        // declare a goal done without independent confirmation. Require an
        // explicit env var so casual misuse fails closed.
        if (process.env.CONVERGE_ALLOW_FORCE_DONE !== "1") {
          fail(
            `--force on 'goals done' bypasses re-validation. This is unsafe in\n` +
              `  autonomous runs. To use it, set CONVERGE_ALLOW_FORCE_DONE=1 first.\n` +
              `  Prefer fixing the failing check over forcing the sentinel.`,
            4,
          );
        }
        console.warn(
          `converge goals: WARNING — writing '${id}'.done WITHOUT re-validation (--force).`,
        );
      } else {
        const result = runGoalChecks(goal!, ctx.workspace);
        if (!result.passed) {
          console.error(`converge goals: '${id}' failed re-validation:`);
          for (const r of result.results) {
            if (r.passed) continue;
            console.error(`  ✗ ${r.id} (exit ${r.exitCode})`);
            if (r.stdout) console.error(r.stdout.split("\n").slice(-3).map(l => "    " + l).join("\n"));
            if (r.stderr) console.error(r.stderr.split("\n").slice(-3).map(l => "    " + l).join("\n"));
          }
          process.exit(1);
        }
      }

      writeGoalDoneSentinel(ctx.workspace, ctx.playbook, id);
      console.log(`marked done: ${id}`);
      return;
    }
    case "undone": {
      const id = positional[1];
      if (!id) fail("usage: converge goals undone <id>");
      const removed = removeGoalDoneSentinel(ctx.workspace, ctx.playbook, id);
      console.log(removed ? `removed sentinel: ${id}` : `no sentinel for: ${id}`);
      return;
    }
    default:
      fail(
        `unknown subcommand '${sub}' — expected one of list|next|pending|done|undone`,
      );
  }
}

/** Exposed for tests that want the sentinel dir path. */
export const _internals = { goalsSentinelDir };
