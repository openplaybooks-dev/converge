/**
 * Goal Evaluation Utility
 *
 * Lightweight goal evaluation — runs shell checks to determine which goals
 * are satisfied and which remain. Used by goal-driven epoch loops.
 *
 * Each goal has one or more checks. A goal is satisfied when ALL its checks
 * pass (exit 0). Goal state is persisted to goal-state.json for cross-epoch
 * tracking and convergence gating.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type { PlaybookGoal, PlaybookGoalCheck } from "../playbook/types.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CheckResult {
  checkId: string;
  cmd: string;
  exitCode: number | null;
  passed: boolean;
  error: string | null;
}

export interface GoalResult {
  goal: PlaybookGoal;
  satisfied: boolean;
  checks: CheckResult[];
}

export interface GoalState {
  results: GoalResult[];
  satisfied: PlaybookGoal[];
  remaining: PlaybookGoal[];
  allSatisfied: boolean;
  evaluatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Evaluation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Run a single check command.
 */
function runCheck(check: PlaybookGoalCheck, cwd: string): CheckResult {
  try {
    execSync(check.cmd, {
      cwd,
      timeout: 120_000,
      stdio: "pipe",
      env: { ...process.env },
    });
    return { checkId: check.id, cmd: check.cmd, exitCode: 0, passed: true, error: null };
  } catch (err: any) {
    const exitCode = err.status ?? (err.code === "ETIMEDOUT" ? 124 : 1);
    const error = err.stderr
      ? err.stderr.toString().slice(0, 500)
      : err.message?.slice(0, 500) ?? "check failed";
    return { checkId: check.id, cmd: check.cmd, exitCode, passed: false, error };
  }
}

/**
 * Evaluate a single goal — runs all its checks. The goal is satisfied
 * only when every check passes.
 */
function evaluateGoal(goal: PlaybookGoal, cwd: string): GoalResult {
  const checks = goal.checks.map((c) => runCheck(c, cwd));
  const satisfied = checks.every((c) => c.passed);
  return { goal, satisfied, checks };
}

/**
 * Evaluate all goals — run every check and categorize results.
 */
export function evaluateGoals(
  goals: PlaybookGoal[],
  cwd: string,
): GoalState {
  const results = goals.map((g) => evaluateGoal(g, cwd));
  const satisfied = results.filter((r) => r.satisfied).map((r) => r.goal);
  const remaining = results.filter((r) => !r.satisfied).map((r) => r.goal);

  return {
    results,
    satisfied,
    remaining,
    allSatisfied: remaining.length === 0,
    evaluatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

const GOAL_STATE_FILENAME = "goal-state.json";

/**
 * Build the path where goal state is persisted for a given journal epic.
 */
export function goalStatePath(journalDir: string, epicId: string): string {
  return join(journalDir, epicId, GOAL_STATE_FILENAME);
}

/**
 * Load persisted goal state from disk.
 * Returns null if no state file exists or it can't be parsed.
 */
export function loadGoalState(filePath: string): GoalState | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as GoalState;
  } catch {
    return null;
  }
}

/**
 * Persist goal state to disk.
 */
export function saveGoalState(
  filePath: string,
  state: GoalState,
): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Evaluate goals and persist the result.
 * Returns the state. If no goals are declared, returns a no-op state.
 */
export function evaluateAndPersist(
  goals: PlaybookGoal[] | undefined,
  cwd: string,
  journalDir: string,
  epicId: string,
): GoalState {
  if (!goals || goals.length === 0) {
    return {
      results: [],
      satisfied: [],
      remaining: [],
      allSatisfied: true,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const state = evaluateGoals(goals, cwd);
  const statePath = goalStatePath(journalDir, epicId);
  saveGoalState(statePath, state);
  return state;
}
