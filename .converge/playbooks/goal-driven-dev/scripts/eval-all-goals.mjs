#!/usr/bin/env node
/**
 * eval-all-goals.mjs
 *
 * Run all checks for all goals. Reads goals.jsonl, executes every check,
 * writes goal-state.json. Exit 0 if ALL goals pass.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const projectDir = process.env.PROJECT_DIR || process.cwd();
const goalsPath = join(projectDir, ".converge", "artifacts", "goal-driven-dev", "goals.jsonl");
const statePath = join(projectDir, ".converge", "artifacts", "goal-driven-dev", "goal-state.json");

let goals;
try {
  const raw = readFileSync(goalsPath, "utf8").trim();
  goals = raw ? raw.split("\n").map((l) => JSON.parse(l)) : [];
} catch {
  console.error(`Cannot read goals from ${goalsPath}`);
  process.exit(2);
}

if (goals.length === 0) {
  console.log("No goals found.");
  process.exit(0);
}

const results = [];
let allPassed = true;

for (const goal of goals) {
  const checks = goal.checks || [];
  const checkResults = [];
  let goalPassed = true;

  for (const check of checks) {
    try {
      execSync(check.cmd, { cwd: projectDir, timeout: 30_000, stdio: "pipe" });
      checkResults.push({ id: check.id, passed: true });
    } catch (e) {
      checkResults.push({ id: check.id, passed: false, error: e.stderr?.toString().slice(0, 200) || e.message?.slice(0, 200) });
      goalPassed = false;
      allPassed = false;
    }
  }

  const status = goalPassed ? "✓" : "✗";
  console.log(`${status} ${goal.id}: ${checkResults.filter((c) => c.passed).length}/${checks.length} checks`);
  results.push({ goalId: goal.id, passed: goalPassed, checks: checkResults });
}

// Write state
const stateDir = join(projectDir, ".converge", "artifacts", "goal-driven-dev");
if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
writeFileSync(statePath, JSON.stringify({ results, allPassed, evaluatedAt: new Date().toISOString() }, null, 2));

console.log(`\n${results.filter((r) => r.passed).length}/${goals.length} goals passed`);
process.exit(allPassed ? 0 : 1);
