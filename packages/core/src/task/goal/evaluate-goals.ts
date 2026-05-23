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
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
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
  unmetDependencies?: string[];
  state?: "candidate" | "active" | "blocked" | "rejected" | "stalled";
}

export interface GoalState {
  results: GoalResult[];
  satisfied: PlaybookGoal[];
  remaining: PlaybookGoal[];
  buildable: PlaybookGoal[];
  blocked: Array<{ goal: PlaybookGoal; unmetDependencies: string[] }>;
  candidates: PlaybookGoal[];
  rejected: PlaybookGoal[];
  stalled: PlaybookGoal[];
  allSatisfied: boolean;
  evaluatedAt: string;
}

export interface GoalLedgerEvent {
  event: "goal.spawned" | "goal.updated";
  goal: PlaybookGoal;
  timestamp: string;
  sourceTaskId?: string;
}

export type GoalSpawnInput =
  Omit<PlaybookGoal, "checks"> & { checks?: PlaybookGoalCheck[] };

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
  return { goal, satisfied, checks, state: goalState(goal) };
}

function goalState(goal: PlaybookGoal): GoalResult["state"] {
  if (goal.status === "rejected") return "rejected";
  if (goal.status === "stalled") return "stalled";
  if (goal.status === "candidate" || goal.checks.length === 0) {
    return "candidate";
  }
  return "active";
}

/**
 * Evaluate all goals — run every check and categorize results.
 */
export function evaluateGoals(
  goals: PlaybookGoal[],
  cwd: string,
): GoalState {
  const results = goals.map((g) => {
    const state = goalState(g);
    if (state !== "active") {
      return { goal: g, satisfied: false, checks: [], state };
    }
    return evaluateGoal(g, cwd);
  });

  const satisfied = results
    .filter((r) => r.state === "active" && r.satisfied)
    .map((r) => r.goal);
  const satisfiedIds = new Set(satisfied.map((g) => g.id));

  const remaining = results
    .filter((r) => r.state === "active" && !r.satisfied)
    .map((r) => r.goal);

  const blocked: Array<{ goal: PlaybookGoal; unmetDependencies: string[] }> = [];
  const buildable: PlaybookGoal[] = [];
  for (const goal of remaining) {
    const unmetDependencies = (goal.depends_on ?? []).filter(
      (dep) => !satisfiedIds.has(dep),
    );
    if (unmetDependencies.length > 0) {
      blocked.push({ goal, unmetDependencies });
    } else {
      buildable.push(goal);
    }
  }

  const candidates = results
    .filter((r) => r.state === "candidate")
    .map((r) => r.goal);
  const rejected = results
    .filter((r) => r.state === "rejected")
    .map((r) => r.goal);
  const stalled = results
    .filter((r) => r.state === "stalled")
    .map((r) => r.goal);

  const resultsWithDeps = results.map((r) => {
    const b = blocked.find((entry) => entry.goal.id === r.goal.id);
    return b
      ? { ...r, state: "blocked" as const, unmetDependencies: b.unmetDependencies }
      : r;
  });

  return {
    results: resultsWithDeps,
    satisfied,
    remaining,
    buildable,
    blocked,
    candidates,
    rejected,
    stalled,
    allSatisfied: remaining.length === 0,
    evaluatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

const GOAL_STATE_FILENAME = "goal-state.json";
const GOAL_LEDGER_FILENAME = "goals.jsonl";

/**
 * Build the path where goal state is persisted for a given journal epic.
 */
export function goalStatePath(journalDir: string, epicId: string): string {
  return join(journalDir, epicId, GOAL_STATE_FILENAME);
}

export function goalLedgerPath(journalDir: string, epicId: string): string {
  return join(journalDir, epicId, GOAL_LEDGER_FILENAME);
}

/**
 * Load persisted goal state from disk.
 * Returns null if no state file exists or it can't be parsed.
 */
function loadGoalState(filePath: string): GoalState | null {
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

export function loadSpawnedGoals(filePath: string): PlaybookGoal[] {
  if (!existsSync(filePath)) return [];

  const byId = new Map<string, PlaybookGoal>();
  const lines = readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    const event = parsed as Partial<GoalLedgerEvent>;
    if (event.event !== "goal.spawned" && event.event !== "goal.updated") {
      continue;
    }
    const goal = normalizeGoal(event.goal);
    if (!goal) continue;
    const previous = byId.get(goal.id);
    byId.set(goal.id, previous ? mergeGoal(previous, goal) : goal);
  }

  return [...byId.values()];
}

export function mergeGoals(
  declaredGoals: PlaybookGoal[] | undefined,
  spawnedGoals: PlaybookGoal[],
): PlaybookGoal[] {
  const byId = new Map<string, PlaybookGoal>();
  for (const goal of declaredGoals ?? []) {
    const normalized = normalizeGoal(goal);
    if (normalized) byId.set(normalized.id, normalized);
  }
  for (const goal of spawnedGoals) {
    const previous = byId.get(goal.id);
    byId.set(goal.id, previous ? mergeGoal(previous, goal) : goal);
  }
  return [...byId.values()];
}

export function loadAllGoals(
  declaredGoals: PlaybookGoal[] | undefined,
  journalDir: string,
  epicId: string,
): PlaybookGoal[] {
  return mergeGoals(
    declaredGoals,
    loadSpawnedGoals(goalLedgerPath(journalDir, epicId)),
  );
}

export function spawnGoal(
  journalDir: string,
  epicId: string,
  input: GoalSpawnInput,
  sourceTaskId?: string,
): PlaybookGoal {
  return appendGoalEvent(
    "goal.spawned",
    journalDir,
    epicId,
    input,
    sourceTaskId,
  );
}

export function updateGoal(
  journalDir: string,
  epicId: string,
  input: GoalSpawnInput,
  sourceTaskId?: string,
): PlaybookGoal {
  return appendGoalEvent(
    "goal.updated",
    journalDir,
    epicId,
    input,
    sourceTaskId,
  );
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
  const mergedGoals = loadAllGoals(goals, journalDir, epicId);

  if (mergedGoals.length === 0) {
    return {
      results: [],
      satisfied: [],
      remaining: [],
      buildable: [],
      blocked: [],
      candidates: [],
      rejected: [],
      stalled: [],
      allSatisfied: true,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const state = evaluateGoals(mergedGoals, cwd);
  const statePath = goalStatePath(journalDir, epicId);
  saveGoalState(statePath, state);
  return state;
}

function normalizeGoal(goal: GoalSpawnInput | PlaybookGoal | undefined): PlaybookGoal | null {
  if (!goal || typeof goal !== "object") return null;
  if (!goal.id || !goal.description) return null;
  return {
    id: String(goal.id),
    description: String(goal.description),
    parent: goal.parent ? String(goal.parent) : undefined,
    depends_on: Array.isArray(goal.depends_on)
      ? goal.depends_on.map(String)
      : undefined,
    status: goal.status,
    source: goal.source,
    metadata: goal.metadata,
    checks: Array.isArray(goal.checks)
      ? goal.checks
          .filter((check) => check && check.id && check.cmd)
          .map((check) => ({
            id: String(check.id),
            description: check.description
              ? String(check.description)
              : undefined,
            cmd: String(check.cmd),
          }))
      : [],
  };
}

function appendGoalEvent(
  eventName: GoalLedgerEvent["event"],
  journalDir: string,
  epicId: string,
  input: GoalSpawnInput,
  sourceTaskId?: string,
): PlaybookGoal {
  const goal = normalizeGoal(input);
  if (!goal) {
    throw new Error("ctx.goals.spawn requires a goal with id and description");
  }

  const filePath = goalLedgerPath(journalDir, epicId);
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const event: GoalLedgerEvent = {
    event: eventName,
    goal: {
      ...goal,
      status: goal.status ?? (goal.checks.length > 0 ? "active" : "candidate"),
      source: {
        ...(goal.source ?? {}),
        type: goal.source?.type ?? "seed",
        spawned_by: sourceTaskId,
      },
    },
    timestamp: new Date().toISOString(),
    sourceTaskId,
  };
  appendFileSync(filePath, JSON.stringify(event) + "\n", "utf8");
  return event.goal;
}

function mergeGoal(existing: PlaybookGoal, update: PlaybookGoal): PlaybookGoal {
  return {
    ...existing,
    ...update,
    depends_on: update.depends_on ?? existing.depends_on,
    checks: update.checks.length > 0 ? update.checks : existing.checks,
    source: { ...(existing.source ?? {}), ...(update.source ?? {}) },
    metadata: { ...(existing.metadata ?? {}), ...(update.metadata ?? {}) },
  };
}
