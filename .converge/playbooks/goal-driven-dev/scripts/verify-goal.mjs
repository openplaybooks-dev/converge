#!/usr/bin/env node
/**
 * verify-goal.mjs <goalId>
 *
 * Run all checks for a single goal. Reads goals.jsonl, finds the goal
 * by id, executes each check command, reports pass/fail.
 * Exit 0 if ALL checks pass, exit 1 if any fail.
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const goalId = process.argv[2];
if (!goalId) {
  console.error("Usage: verify-goal.mjs <goalId>");
  process.exit(2);
}

const projectDir = process.env.PROJECT_DIR || process.cwd();
const goalsPath = join(projectDir, ".converge", "artifacts", "goal-driven-dev", "goals.jsonl");

let goals;
try {
  const raw = readFileSync(goalsPath, "utf8").trim();
  goals = raw.split("\n").map((l) => JSON.parse(l));
} catch {
  console.error(`Cannot read goals from ${goalsPath}`);
  process.exit(2);
}

const goal = goals.find((g) => g.id === goalId);
if (!goal) {
  console.error(`Goal "${goalId}" not found in goals.jsonl`);
  process.exit(2);
}

if (!goal.checks || goal.checks.length === 0) {
  console.log(`Goal "${goalId}" has no checks — considered passing.`);
  process.exit(0);
}

let failed = 0;
for (const check of goal.checks) {
  try {
    execSync(check.cmd, { cwd: projectDir, timeout: 30_000, stdio: "pipe" });
    console.log(`  ✓ ${check.id}`);
  } catch (e) {
    failed++;
    const msg = e.stderr?.toString().slice(0, 200) || e.message?.slice(0, 200) || "failed";
    console.log(`  ✗ ${check.id}: ${msg}`);
  }
}

console.log(`\n${goal.checks.length - failed}/${goal.checks.length} checks passed`);
process.exit(failed > 0 ? 1 : 0);
