/**
 * Goal helpers for `converge goals` / `converge tasks` CLI commands.
 *
 * Parses the `goals:` block of a playbook.yml using the bundled `yaml`
 * package and exposes a small re-validation runner for `goals done`.
 *
 * Goal schema (only fields the framework cares about — additional keys are
 * tolerated and ignored):
 *
 *   goals:
 *     - id: bootstrap
 *       description: >-
 *         ...
 *       depends_on: [other-goal]   # optional
 *       checks:
 *         - id: check-id
 *           cmd: "shell command"
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

export interface PlaybookGoalCheck {
  id: string;
  cmd: string;
}

export interface PlaybookGoal {
  id: string;
  description: string;
  depends_on?: string[];
  checks: PlaybookGoalCheck[];
}

export interface GoalCheckResult {
  id: string;
  passed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  cmd: string;
}

export interface RunGoalChecksResult {
  goalId: string;
  passed: boolean;
  results: GoalCheckResult[];
}

function toArrayOfStrings(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string").map((v) => String(v));
  }
  return [];
}

function coerceScalar(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function toChecks(value: unknown): PlaybookGoalCheck[] {
  if (!Array.isArray(value)) return [];
  const out: PlaybookGoalCheck[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = coerceScalar(rec.id);
    const cmd = coerceScalar(rec.cmd);
    if (!id || cmd === undefined) continue;
    out.push({ id, cmd });
  }
  return out;
}

/**
 * Parse the `goals:` block from a playbook.yml file. Returns an empty
 * array if the file has no `goals:` key.
 */
export function parsePlaybookGoals(filepath: string): PlaybookGoal[] {
  if (!existsSync(filepath)) {
    throw new Error(`playbook.yml not found at ${filepath}`);
  }
  const raw = readFileSync(filepath, "utf-8");
  const doc = parseYaml(raw) as Record<string, unknown> | null;
  const goalsRaw = doc?.goals;
  if (!Array.isArray(goalsRaw)) return [];

  const out: PlaybookGoal[] = [];
  for (const item of goalsRaw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = rec.id;
    if (typeof id !== "string" || id.length === 0) continue;
    out.push({
      id,
      description:
        typeof rec.description === "string" ? rec.description.trim() : "",
      depends_on: toArrayOfStrings(rec.depends_on),
      checks: toChecks(rec.checks),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Sentinel directory helpers                                          */
/* ------------------------------------------------------------------ */

export function goalsSentinelDir(
  projectDir: string,
  playbookName: string,
): string {
  return join(projectDir, ".converge", "inventory", playbookName, "goals");
}

export function readDoneGoalIds(
  projectDir: string,
  playbookName: string,
): Set<string> {
  const dir = goalsSentinelDir(projectDir, playbookName);
  if (!existsSync(dir)) return new Set();
  const out = new Set<string>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".done")) {
      out.add(entry.name.replace(/\.done$/, ""));
    }
  }
  return out;
}

export function writeGoalDoneSentinel(
  projectDir: string,
  playbookName: string,
  goalId: string,
): void {
  const dir = goalsSentinelDir(projectDir, playbookName);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${goalId}.done`), "", "utf-8");
}

export function removeGoalDoneSentinel(
  projectDir: string,
  playbookName: string,
  goalId: string,
): boolean {
  const path = join(goalsSentinelDir(projectDir, playbookName), `${goalId}.done`);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Re-validation runner for `converge goals done`                      */
/* ------------------------------------------------------------------ */

/**
 * Re-run every `cmd:` in a goal's checks list. Used by `converge goals
 * done` to gate sentinel-writing on real, live verification. Commands run
 * with `bash -lc`, cwd=projectDir.
 */
export function runGoalChecks(
  goal: PlaybookGoal,
  projectDir: string,
  opts: { timeoutMs?: number } = {},
): RunGoalChecksResult {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const results: GoalCheckResult[] = [];
  let allPassed = true;
  for (const check of goal.checks) {
    const proc = spawnSync("bash", ["-lc", check.cmd], {
      cwd: projectDir,
      encoding: "utf-8",
      timeout: timeoutMs,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const passed = proc.status === 0;
    if (!passed) allPassed = false;
    results.push({
      id: check.id,
      passed,
      exitCode: proc.status ?? -1,
      stdout: (proc.stdout ?? "").toString(),
      stderr: (proc.stderr ?? "").toString(),
      cmd: check.cmd,
    });
  }
  return { goalId: goal.id, passed: allPassed, results };
}

/**
 * Return all goals not yet done. The AI decides which to tackle — there is
 * no fixed dependency order. Annotates each goal with its done status.
 */
export function getPendingGoals(
  goals: PlaybookGoal[],
  doneGoalIds: Set<string>,
): Array<PlaybookGoal & { done: boolean }> {
  return goals.map((g) => ({ ...g, done: doneGoalIds.has(g.id) }));
}
