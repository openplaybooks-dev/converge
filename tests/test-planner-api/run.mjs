#!/usr/bin/env node
/**
 * End-to-end test of `core.plan(...)` with a stub agent.
 *
 * The real planner's `analyze` task calls an LLM that writes PLAN.md.
 * Here we inject a stub `agentfn` that writes a fixed PLAN.md so the
 * whole flow is deterministic and runnable in CI without an API key.
 *
 * What we're verifying:
 *   1. core.plan() returns a RunResult with all 4 planner tasks
 *      completing successfully.
 *   2. The captured event stream matches the shape the planner app's
 *      runPlanner (apps/planner/src/lib/planner-stream.ts) expects:
 *        - task-start/task-complete per planner phase
 *        - one children-spawned event with the drafted children
 *        - run-complete at the end
 *   3. The on-disk artifacts (playbook.yml + tasks/<id>/TASK.md +
 *      PLAN.md + seed stubs) are correctly written.
 *   4. The produced playbook is loadable via loadPlaybookFromFolder.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureReporter,
  loadPlaybookFromFolder,
  plan,
} from "@converge/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = __dirname;
const slug = "test-baby-tracker";
const outputDir = join(projectDir, ".converge", "playbooks", slug);

// ── Setup: clean slate ────────────────────────────────────────────────
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

// ── Stub agent ────────────────────────────────────────────────────────
// `runAnalyze` calls `agentfn({ prompt, ... })()` and expects PLAN.md to
// exist after the call returns. The stub fulfils that contract by
// writing a fixed PLAN.md and ignoring the prompt.
const STUB_PLAN_MD = `---
kind: container
children:
  - id: 01-requirements
    kind: executable
    title: Capture requirements
  - id: 02-architecture
    kind: container
    title: Design the architecture
  - id: 03-implementation
    kind: seed
    title: Generate implementation
---

# Goal

Build a baby tracker app with sleep and feed logs.

# Decision

Decompose into one requirements pass, an architecture container, and a
seed-driven implementation phase that fans out per feature.
`;

function stubAgentfn(opts) {
  // Return a callable that, when invoked, writes the fixed PLAN.md.
  // Signature mirrors the real agentfn factory.
  return async () => {
    writeFileSync(join(outputDir, "PLAN.md"), STUB_PLAN_MD, "utf8");
    return { raw: "wrote PLAN.md", data: undefined };
  };
}

// ── Step 1: call core.plan() ──────────────────────────────────────────
reset();
console.log("[1/5] Calling core.plan() with a stub agent…");
console.log(
  `       outputDir: ${relative(projectDir, outputDir)}`,
);

const cap = captureReporter();
const result = await plan({
  goal: "Build a baby tracker app with sleep and feed logs.",
  name: slug,
  projectDir,
  outputDir,
  reporter: cap,
  fullRefresh: true,
  plannerAgentfn: stubAgentfn,
});

// ── Step 2: RunResult shape ───────────────────────────────────────────
console.log("[2/5] Asserting RunResult shape…");
console.log(
  `       runId: ${result.runId}  completed: ${result.completed}  failed: ${result.failed}`,
);
if (result.failed > 0) {
  console.error("\n--- events (for diagnosis) ---");
  for (const e of cap.events) console.error("  " + JSON.stringify(e));
  console.error("--- end events ---\n");
}
assert(result.failed === 0, `expected 0 failures, got ${result.failed}`);
// Container parents now expand into synthetic diverge/converge nodes at run
// time; 4 logical planner tasks materialize as 6 completed nodes.
assert(
  result.completed === 4 || result.completed === 6,
  `expected 4 (logical) or 6 (with diverge/converge) completed tasks, got ${result.completed}`,
);
assert(typeof result.runId === "string", "runId is a string");

// ── Step 3: event sequence ────────────────────────────────────────────
console.log("[3/5] Asserting event sequence the app depends on…");
const kinds = cap.events.map((e) => e.kind);

const isSynthetic = (id) => /-(diverge|converge)$/.test(id);
const taskStarts = cap.events
  .filter((e) => e.kind === "task-start")
  .filter((e) => !isSynthetic(e.taskId));
const taskCompletes = cap.events
  .filter((e) => e.kind === "task-complete")
  .filter((e) => !isSynthetic(e.taskId));
assert(
  taskStarts.length === 4,
  `expected 4 task-start events, got ${taskStarts.length}: ${taskStarts.map((e) => e.taskId).join(", ")}`,
);
assert(
  taskCompletes.length === 4,
  `expected 4 task-complete events, got ${taskCompletes.length}: ${taskCompletes.map((e) => e.taskId).join(", ")}`,
);

const taskOrder = taskStarts.map((e) => e.taskId);
assert(
  JSON.stringify(taskOrder) ===
    JSON.stringify([
      "scaffold-root",
      "analyze",
      "parse-plan",
      "materialize-children",
    ]),
  `task-start order unexpected: ${JSON.stringify(taskOrder)}`,
);
console.log(
  `       ${taskStarts.length} task-start / ${taskCompletes.length} task-complete pairs ✓`,
);

const childrenSpawned = cap.events.filter((e) => e.kind === "children-spawned");
assert(
  childrenSpawned.length === 1,
  `expected exactly 1 children-spawned event, got ${childrenSpawned.length}`,
);
assert(
  childrenSpawned[0].parentId === "parse-plan",
  `children-spawned should come from parse-plan, got ${childrenSpawned[0].parentId}`,
);
const drafted = childrenSpawned[0].children;
assert(
  drafted.length === 3,
  `expected 3 drafted children, got ${drafted.length}`,
);
assert(
  drafted[0].id === "01-requirements" &&
    drafted[1].id === "02-architecture" &&
    drafted[2].id === "03-implementation",
  `drafted ids unexpected: ${JSON.stringify(drafted)}`,
);
assert(
  drafted[0].title === "Capture requirements",
  "drafted child title carried through",
);
console.log(
  `       1 children-spawned with ${drafted.length} drafted children ✓`,
);

assert(kinds.includes("run-complete"), "run-complete present");
console.log(`       run-complete present ✓`);

// ── Step 4: on-disk artifacts ─────────────────────────────────────────
console.log("[4/5] Asserting on-disk artifacts…");
assert(existsSync(join(outputDir, "playbook.yml")), "playbook.yml exists");
console.log(`       playbook.yml ✓`);
assert(existsSync(join(outputDir, "PLAN.md")), "PLAN.md exists");
console.log(`       PLAN.md ✓`);
assert(
  existsSync(join(outputDir, "tasks", "01-requirements", "TASK.md")),
  "tasks/01-requirements/TASK.md exists",
);
console.log(`       tasks/01-requirements/TASK.md ✓`);
assert(
  existsSync(join(outputDir, "tasks", "02-architecture", "TASK.md")),
  "tasks/02-architecture/TASK.md exists",
);
assert(
  existsSync(join(outputDir, "tasks", "02-architecture", "PLAN.md")),
  "container child gets a PLAN.md stub",
);
console.log(`       tasks/02-architecture/TASK.md + PLAN.md ✓`);
assert(
  existsSync(join(outputDir, "seeds", "03-implementation", "SEED.md")),
  "seeds/03-implementation/SEED.md exists",
);
assert(
  existsSync(join(outputDir, "seeds", "03-implementation", "index.js")),
  "seeds/03-implementation/index.js exists",
);
console.log(`       seeds/03-implementation/SEED.md + index.js ✓`);

// ── Step 5: round-trip the produced playbook ──────────────────────────
console.log("[5/5] Round-trip: load the produced playbook…");
const loaded = await loadPlaybookFromFolder(outputDir);
assert(
  loaded.def.name === slug,
  `loaded name ${loaded.def.name} !== ${slug}`,
);
const loadedTaskIds = loaded.def.tasks.map((t) => t.path);
// playbook.yml's tasks list contains all three children. The
// `loadPlaybookFromFolder` helper just reads the YAML — it doesn't
// distinguish seeds from regular tasks. The runtime distinguishes
// them at execute time.
assert(
  loadedTaskIds.length === 3,
  `expected 3 tasks in playbook.yml, got ${loadedTaskIds.length}: ${loadedTaskIds.join(", ")}`,
);
console.log(
  `       loadPlaybookFromFolder reads ${loadedTaskIds.length} tasks (${loadedTaskIds.join(", ")}) ✓`,
);

console.log("\n✅ All planner-API smoke checks passed.");
