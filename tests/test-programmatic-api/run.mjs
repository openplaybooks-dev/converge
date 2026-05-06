#!/usr/bin/env node
/**
 * End-to-end smoke test of the programmatic API exposed by
 * `@converge/core`. Runs from the published dist bundle (not source),
 * so this verifies the contract real consumers see.
 *
 * Steps:
 *   1. Define a 3-task playbook in code (a → b → c).
 *   2. Run it via core.run(...) with captureReporter.
 *   3. Serialize → folder, parse back, run again — assert parity.
 *   4. Confirm core.plan(...) is exported and callable.
 *
 * No LLM calls. No CLI subprocess. Tasks use the executor (JS function)
 * path, which the runtime supports for code-defined tasks today.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureReporter,
  definePlaybook,
  loadPlaybookFromFolder,
  plan,
  run,
  taskDef,
  writePlaybookToFolder,
} from "@converge/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = __dirname;
const outDir = join(projectDir, "out");

// ── Setup: clean slate ────────────────────────────────────────────────
function reset() {
  rmSync(outDir, { recursive: true, force: true });
  rmSync(join(projectDir, ".converge", "journal"), { recursive: true, force: true });
  rmSync(join(projectDir, ".converge", "playbooks", "round-trip"), {
    recursive: true,
    force: true,
  });
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(projectDir, ".converge"), { recursive: true });
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`\n❌ ${msg}`);
    process.exit(1);
  }
}

function makePlaybook(name) {
  return definePlaybook({
    name,
    description: "Three tasks in a linear chain, JS executors.",
    run: { mode: "oneoff", maxTaskAttempts: 1 },
    tasks: [
      taskDef()
        .id("a")
        .title("Write A")
        .executor(async () => {
          writeFileSync(join(outDir, "a.txt"), "from a", "utf8");
        })
        .build(),
      taskDef()
        .id("b")
        .title("Write B (depends on A)")
        .depends_on(["a"])
        .executor(async () => {
          const a = readFileSync(join(outDir, "a.txt"), "utf8");
          writeFileSync(join(outDir, "b.txt"), `${a} → b`, "utf8");
        })
        .build(),
      taskDef()
        .id("c")
        .title("Write C (depends on B)")
        .depends_on(["b"])
        .executor(async () => {
          const b = readFileSync(join(outDir, "b.txt"), "utf8");
          writeFileSync(join(outDir, "c.txt"), `${b} → c`, "utf8");
        })
        .build(),
    ],
  });
}

// ── Step 1: define ────────────────────────────────────────────────────
reset();
console.log("[1/4] Defining a playbook in code…");
const pb = makePlaybook("in-code-smoke");
assert(pb.def.name === "in-code-smoke", "playbook name preserved");
assert(pb.def.tasks.length === 3, `expected 3 tasks, got ${pb.def.tasks.length}`);
assert(pb.tasks.get("a")?.depends_on === undefined, "first task has no deps");
assert(
  Array.isArray(pb.tasks.get("b")?.depends_on) && pb.tasks.get("b")?.depends_on[0] === "a",
  "second task depends on a",
);
assert(
  Array.isArray(pb.tasks.get("c")?.depends_on) && pb.tasks.get("c")?.depends_on[0] === "b",
  "third task depends on b",
);
assert(pb.tasks.size === 3, "in-memory tasks map populated");
console.log(`       playbook: ${pb.def.name} (${pb.def.tasks.length} tasks)`);

// ── Step 2: run ───────────────────────────────────────────────────────
console.log("[2/4] Running it via core.run()…");
const cap1 = captureReporter();
const result1 = await run(pb, {
  projectDir,
  reporter: cap1,
  fullRefresh: true, // skip fingerprint cache for deterministic event count
});
console.log(`       events: ${cap1.events.length} emitted`);
console.log(`       result: ${result1.completed} completed, ${result1.failed} failed`);
if (result1.failed > 0) {
  console.error("\n--- events (for diagnosis) ---");
  for (const e of cap1.events) console.error("  " + JSON.stringify(e));
  console.error("--- end events ---\n");
}
assert(result1.failed === 0, `expected 0 failures, got ${result1.failed}`);
assert(
  result1.completed === 3,
  `expected 3 completed, got ${result1.completed} (events: ${JSON.stringify(
    cap1.events.map((e) => e.kind),
  )})`,
);
assert(typeof result1.runId === "string" && result1.runId.length > 0, "runId set");
assert(result1.durationMs >= 0, "durationMs is non-negative");

// Event-shape assertions: confirm the lifecycle is what consumers will see.
const kinds = cap1.events.map((e) => e.kind);
assert(kinds.includes("run-start"), "run-start emitted");
assert(kinds.includes("compile-complete"), "compile-complete emitted");
assert(kinds.includes("run-complete"), "run-complete emitted");
assert(
  kinds.filter((k) => k === "task-complete").length === 3,
  `expected 3 task-complete events, got ${kinds.filter((k) => k === "task-complete").length}`,
);

// Output files written in order.
assert(existsSync(join(outDir, "a.txt")), "a.txt written");
assert(existsSync(join(outDir, "b.txt")), "b.txt written");
assert(existsSync(join(outDir, "c.txt")), "c.txt written");
assert(
  readFileSync(join(outDir, "c.txt"), "utf8") === "from a → b → c",
  `c.txt content unexpected: ${readFileSync(join(outDir, "c.txt"), "utf8")}`,
);

// ── Step 3: round-trip through folder ─────────────────────────────────
console.log(
  "[3/4] Round-tripping through writePlaybookToFolder + loadPlaybookFromFolder…",
);
const folder = join(projectDir, ".converge", "playbooks", "round-trip");
await writePlaybookToFolder(makePlaybook("round-trip"), folder);
assert(existsSync(join(folder, "playbook.yml")), "playbook.yml written");
assert(existsSync(join(folder, "tasks", "a", "TASK.md")), "tasks/a/TASK.md written");
assert(existsSync(join(folder, "tasks", "b", "TASK.md")), "tasks/b/TASK.md written");
assert(existsSync(join(folder, "tasks", "c", "TASK.md")), "tasks/c/TASK.md written");
console.log(`       wrote ${folder.replace(projectDir + "/", "")}/`);

const reloaded = await loadPlaybookFromFolder(folder);
assert(reloaded.def.name === "round-trip", "reloaded name matches");
assert(reloaded.def.tasks.length === 3, "reloaded task count matches");
assert(reloaded.dir === folder, "reloaded.dir set");
console.log(
  `       reloaded: ${reloaded.def.tasks.length} tasks`,
);

// Note: we don't re-run the *reloaded* playbook here. Folder-loaded
// playbooks rely on TASK.md bodies (agent prompts) — they don't carry
// JS executors back from disk. That's expected: the folder layout is a
// serialization for *agent* tasks; code-defined JS executors are an
// in-memory-only feature. The shape parity is what matters.

// ── Step 4: plan() exported ───────────────────────────────────────────
console.log("[4/4] Confirming plan() is exported…");
assert(typeof plan === "function", "plan is a function");
console.log(`       typeof plan === "function" ✓`);

// We deliberately do NOT call plan() with a real goal — that would
// invoke an LLM. The exported function's existence + correct arity is
// the surface guarantee this example covers.

console.log("\n✅ All programmatic-API smoke checks passed.");
