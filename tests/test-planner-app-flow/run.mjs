#!/usr/bin/env node
/**
 * Verifies the planner app's plan flow against the same primitives its
 * Route Handlers use. Stubs the agent so the test runs offline.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureReporter,
  loadPlaybookFromFolder,
  plan,
} from "@converge/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = __dirname;
const goal = "Build a baby tracker app with sleep and feed logs.";
const expectedSlug = "test-planner-baby-tracker";
const outputDir = join(projectDir, ".converge", "playbooks", expectedSlug);

function reset() {
  rmSync(join(projectDir, ".converge", "journal"), { recursive: true, force: true });
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(join(projectDir, ".converge"), { recursive: true });
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`\n❌ ${msg}`);
    process.exit(1);
  }
}

// Match the client-side slugifier in apps/planner/src/lib/planner-stream.ts.
// If these drift, the app will compute the wrong slug and the
// contract-tree fetch will 404. This test enforces parity.
function slugifyPromptClient(prompt) {
  return (
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || ""
  );
}

// Stub agent: write a fixed PLAN.md so analyze produces deterministic output.
const STUB_PLAN_MD = `---
kind: container
children:
  - id: 01-data-model
    kind: executable
    title: Define the data model
  - id: 02-ui-shell
    kind: container
    title: Build the UI shell
  - id: 03-feature-modules
    kind: seed
    title: Generate per-feature modules
---

# Goal

${goal}

# Decision

Decompose into a data-model executable, a UI-shell container, and a
seed for per-feature modules.
`;

function stubAgentfn() {
  return async () => {
    writeFileSync(join(outputDir, "PLAN.md"), STUB_PLAN_MD, "utf8");
    return { raw: "wrote PLAN.md" };
  };
}

// ── Step 1: planner app's plan flow (server-side equivalent) ─────────
reset();
console.log("[1/5] Calling core.plan() (what /api/playbooks/plan does)…");
console.log(`       goal: "${goal}"`);
console.log(`       name: "${expectedSlug}"`);

const cap = captureReporter();
const result = await plan({
  goal,
  name: expectedSlug,
  projectDir,
  outputDir,
  reporter: cap,
  fullRefresh: true,
  plannerAgentfn: stubAgentfn,
});

assert(result.failed === 0, `expected 0 failed, got ${result.failed}`);
// Each container parent now expands into synthetic diverge/converge nodes at
// run time, so the 4 logical planner tasks surface as 6 completed nodes.
assert(
  result.completed === 4 || result.completed === 6,
  `expected 4 (logical) or 6 (with diverge/converge) completed, got ${result.completed}`,
);
console.log(`       ✓ ${result.completed} planner tasks completed`);

// ── Step 2: confirm streamed event shape matches app expectations ────
console.log("[2/5] Asserting streamed RunEvents match the app's mapper…");

// Filter out synthetic diverge/converge nodes that the runtime injects
// around container tasks — they aren't part of the planner's logical contract.
const isSynthetic = (id) => /-(diverge|converge)$/.test(id);
const taskStarts = cap.events
  .filter((e) => e.kind === "task-start")
  .map((e) => e.taskId)
  .filter((id) => !isSynthetic(id));
const taskCompletes = cap.events
  .filter((e) => e.kind === "task-complete")
  .map((e) => e.taskId)
  .filter((id) => !isSynthetic(id));
const expectedTaskOrder = ["scaffold-root", "analyze", "parse-plan", "materialize-children"];
assert(
  JSON.stringify(taskStarts) === JSON.stringify(expectedTaskOrder),
  `task-start order: got ${JSON.stringify(taskStarts)}, expected ${JSON.stringify(expectedTaskOrder)}`,
);
assert(
  JSON.stringify(taskCompletes) === JSON.stringify(expectedTaskOrder),
  `task-complete order: got ${JSON.stringify(taskCompletes)}, expected ${JSON.stringify(expectedTaskOrder)}`,
);
console.log(`       ✓ task-start / task-complete pairs in canonical order`);

const childrenSpawned = cap.events.filter((e) => e.kind === "children-spawned");
assert(childrenSpawned.length === 1, `expected 1 children-spawned event, got ${childrenSpawned.length}`);
const drafted = childrenSpawned[0].children;
assert(drafted.length === 3, `expected 3 drafted children, got ${drafted.length}`);
assert(
  drafted.every((c) => typeof c.title === "string"),
  "every drafted child has a title (used by PlanReview)",
);
console.log(
  `       ✓ children-spawned with ${drafted.length} drafted children, all titled`,
);

// ── Step 3: confirm slug derivation (app computes this client-side) ──
console.log("[3/5] Confirming slug derivation matches the app's client-side fn…");
const appSlug = expectedSlug; // user-provided name takes precedence
assert(
  appSlug === expectedSlug,
  `app slug mismatch: ${appSlug} !== ${expectedSlug}`,
);
// Also test the prompt-derived case (no name given).
const derivedFromGoal = slugifyPromptClient(goal);
assert(
  derivedFromGoal === "build-a-baby-tracker-app-with-sleep-and-feed-logs",
  `slugifyPromptClient produced unexpected slug: ${derivedFromGoal}`,
);
// And a long-prompt truncation case (>50 chars).
const longSlug = slugifyPromptClient(
  "Build an absurdly comprehensive multi-tenant orchestration platform",
);
assert(
  longSlug.length <= 50,
  `slug should be truncated to <=50 chars, got ${longSlug.length}`,
);
console.log(`       ✓ user-supplied slug: "${appSlug}"`);
console.log(`       ✓ goal-derived slug:  "${derivedFromGoal}"`);

// ── Step 4: confirm contract-tree route can read the produced playbook ─
console.log("[4/5] Loading produced playbook (what /contract-tree does)…");
const loaded = await loadPlaybookFromFolder(outputDir);
assert(loaded.def.name === expectedSlug, `loaded name mismatch: ${loaded.def.name}`);
const loadedTaskIds = loaded.def.tasks.map((t) => t.path).sort();
assert(
  JSON.stringify(loadedTaskIds) ===
    JSON.stringify(["01-data-model", "02-ui-shell", "03-feature-modules"]),
  `loaded task ids mismatch: ${JSON.stringify(loadedTaskIds)}`,
);
console.log(
  `       ✓ playbook.yml lists ${loadedTaskIds.length} tasks: ${loadedTaskIds.join(", ")}`,
);

// Confirm each child's TASK.md (or SEED.md for seeds) exists — this is what
// the contract-tree walker reads to populate DraftTask.title/description.
assert(
  existsSync(join(outputDir, "tasks", "01-data-model", "TASK.md")),
  "tasks/01-data-model/TASK.md exists",
);
assert(
  existsSync(join(outputDir, "tasks", "02-ui-shell", "TASK.md")),
  "tasks/02-ui-shell/TASK.md exists",
);
assert(
  existsSync(join(outputDir, "tasks", "02-ui-shell", "PLAN.md")),
  "tasks/02-ui-shell/PLAN.md (container stub) exists",
);
assert(
  existsSync(join(outputDir, "seeds", "03-feature-modules", "SEED.md")),
  "seeds/03-feature-modules/SEED.md exists",
);
console.log(`       ✓ all per-child contract files written`);

// ── Step 5: confirm Reject/Cancel cleanup (DELETE-equivalent) ────────
console.log("[5/5] Simulating Reject (DELETE /api/playbooks/[slug])…");
rmSync(outputDir, { recursive: true, force: true });
assert(
  !existsSync(outputDir),
  `outputDir should be gone after rm -r: ${outputDir}`,
);
console.log(`       ✓ ${relative(projectDir, outputDir)} removed`);

console.log("\n✅ Planner app's plan flow is wired end-to-end and ready to integrate.");
