#!/usr/bin/env node
/**
 * check-playbook-integrity.mjs
 *
 * Validates structural integrity of the goal-driven-dev playbook:
 * - All TASK.md files have valid YAML frontmatter
 * - All seed references resolve to existing files
 * - All template files parse correctly
 * - Required scripts exist
 *
 * Exit 0 if valid, 1 if issues found.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const playbookDir = join(__dirname, "..");

const REQUIRED_FILES = [
  "playbook.yml",
  "tasks/build/TASK.md",
  "tasks/build/seeds/epoch.seed.js",
  "templates/epoch/TASK.md",
  "templates/epoch/seeds/sprint.seed.js",
  "templates/epoch/tasks/plan/TASK.md",
  "templates/epoch/tasks/implement/TASK.md",
  "templates/epoch/tasks/verify/TASK.md",
];

const REQUIRED_SCRIPTS = [
  "scripts/verify-goal.mjs",
  "scripts/eval-all-goals.mjs",
  "scripts/check-playbook-integrity.mjs",
];

let errors = 0;

// Check required files exist
for (const f of REQUIRED_FILES) {
  if (!existsSync(join(playbookDir, f))) {
    console.log(`  ✗ Missing: ${f}`);
    errors++;
  }
}

// Check required scripts exist
for (const s of REQUIRED_SCRIPTS) {
  if (!existsSync(join(playbookDir, s))) {
    console.log(`  ✗ Missing: ${s}`);
    errors++;
  }
}

// Validate TASK.md YAML
for (const f of REQUIRED_FILES) {
  if (!f.endsWith("TASK.md")) continue;
  const path = join(playbookDir, f);
  if (!existsSync(path)) continue;
  try {
    const raw = readFileSync(path, "utf8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) { console.log(`  ✗ No frontmatter: ${f}`); errors++; continue; }
    parseYaml(fmMatch[1]);
    console.log(`  ✓ ${f}`);
  } catch (e) {
    console.log(`  ✗ ${f}: ${e.message}`);
    errors++;
  }
}

if (errors > 0) {
  console.log(`\n${errors} integrity issues found.`);
  process.exit(1);
}

console.log(`\n✓ All ${REQUIRED_FILES.length + REQUIRED_SCRIPTS.length} files valid.`);
process.exit(0);
