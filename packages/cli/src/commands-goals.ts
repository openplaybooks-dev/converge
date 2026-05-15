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
  parsePlaybookGoals,
  pickNextGoal,
  readDoneGoalIds,
  removeGoalDoneSentinel,
  runGoalChecks,
  writeGoalDoneSentinel,
  type PlaybookGoal,
} from "@converge/core/task/goal/playbook-goals.ts";

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
      const pending = goals.filter((g) => !done.has(g.id));
      console.log(JSON.stringify(pending));
      return;
    }
    case "next": {
      const goals = parsePlaybookGoals(ctx.playbookYml);
      const done = readDoneGoalIds(ctx.workspace, ctx.playbook);
      const next = pickNextGoal(goals, done);
      if (!next) {
        console.log(JSON.stringify({ done: true }));
        return;
      }
      console.log(JSON.stringify(next));
      return;
    }
    case "done": {
      const id = positional[1];
      if (!id) fail("usage: converge goals done <id> [--force]");
      const goals = parsePlaybookGoals(ctx.playbookYml);
      const goal = goals.find((g) => g.id === id);
      if (!goal) fail(`unknown goal id: ${id}`);
      const force = asBool(options.force);

      if (!force) {
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
