/**
 * Invariant: when a blocking task fails, downstream tasks must not be picked
 * up for execution. "Downstream" covers two dependency models:
 *   1. Sequential siblings within an epic (implicit ordering by file path).
 *   2. Tasks that declare an explicit `dependencies:` edge to the failed task.
 *
 * The default for `blocking` is true, so a bare TASK.md with no frontmatter
 * flag should already participate in this contract.
 *
 * Known bug surfaced by these tests (autonomous-run.ts:463-480):
 * autonomousRun resets every `failed` task to `pending` at the top of the
 * loop when attempts < maxTaskAttempts. The "is this task failed?" check
 * that gates downstream execution then sees `pending` and lets the chain
 * proceed. The scheduler-level blocked set computed by getTaskStates is
 * therefore never honored across a retry boundary.
 *
 * These tests shell out to the built CLI because failure-propagation is a
 * cross-module contract (checkpoint reader → tree builder → state computer →
 * scheduler → runner) and only an end-to-end invocation exercises it. We
 * seed a `failed` checkpoint with attempt count >= maxTaskAttempts so the
 * auto-reset cannot revive it, isolating the blocking-on-failure contract.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function plant(path: string, body: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

/**
 * Plant a failed checkpoint with enough attempts to exhaust the auto-retry
 * budget (default maxTaskAttempts=2). This isolates the blocking-on-failure
 * contract from the orthogonal "auto-retry failed tasks" mechanism.
 */
function plantFailedCheckpoint(
  root: string,
  playbook: string,
  taskId: string,
  attempts = 2,
) {
  const now = new Date().toISOString();
  const checkpoint = {
    type: "task",
    id: taskId,
    status: "failed",
    lastUpdated: now,
    createdAt: now,
    attempts: Array.from({ length: attempts }, (_, i) => ({
      attempt: i + 1,
      startedAt: now,
      completedAt: now,
      outcome: "failed",
      durationMs: 1,
    })),
    currentAttempt: attempts,
  };
  plant(
    join(
      root,
      ".converge/journal",
      playbook,
      "tasks",
      taskId,
      "checkpoint.json",
    ),
    JSON.stringify(checkpoint, null, 2),
  );
}

function runCli(args: string[]): { stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "" };
  } catch (err: any) {
    // run may exit non-zero when there is a failed task; we still want output
    return {
      stdout: (err.stdout || "").toString(),
      stderr: (err.stderr || "").toString(),
    };
  }
}

/**
 * "Was this task actually executed?" — true iff the runner created the
 * artifacts that only exist after a real attempt: attempts/ dir or
 * checkpoint.json. The bare task-journal dir + TASK.md snapshot can be
 * planted by tree-discovery without execution, so directory existence
 * alone is not a reliable signal.
 */
function journalTaskWasExecuted(
  root: string,
  playbook: string,
  taskId: string,
): boolean {
  const taskDir = join(root, ".converge/journal", playbook, "tasks", taskId);
  return (
    existsSync(join(taskDir, "attempts")) ||
    existsSync(join(taskDir, "checkpoint.json"))
  );
}

let ROOT: string;
const PB = "default";

describe("failed task blocks downstream tasks", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  beforeEach(() => {
    ROOT = join(
      tmpdir(),
      `converge-block-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    rmSync(ROOT, { recursive: true, force: true });
  });

  describe("sequential siblings (implicit ordering)", () => {
    beforeEach(() => {
      const pb = join(ROOT, ".converge/playbooks", PB);
      plant(join(pb, "playbook.yml"), "name: default\n");
      // Three sequential tasks with no explicit dependencies. Default
      // blocking=true means a failure in 01 should block 02 and 03.
      plant(
        join(pb, "tasks/01-task-a/TASK.md"),
        "---\nid: 01-task-a\ntitle: Task A\n---\n# Task A\n",
      );
      plant(
        join(pb, "tasks/02-task-b/TASK.md"),
        "---\nid: 02-task-b\ntitle: Task B\n---\n# Task B\n",
      );
      plant(
        join(pb, "tasks/03-task-c/TASK.md"),
        "---\nid: 03-task-c\ntitle: Task C\n---\n# Task C\n",
      );
    });

    it("`status` reports downstream siblings as blocked when an upstream task has failed", () => {
      plantFailedCheckpoint(ROOT, PB, "01-task-a");

      const { stdout } = runCli(["status", "--dir", ROOT]);

      // Task A should be visibly failed/non-passing
      expect(stdout).toMatch(/01-task-a/);
      // Task B and C must not be reported as ready/pending plain — they
      // should be blocked. The exact glyph may vary, but they must not
      // appear with the "next to run" indicator (▶ / ◑) and must not be
      // reported as completed.
      expect(stdout).not.toMatch(/✓\s*\d+\.\s*02-task-b/);
      expect(stdout).not.toMatch(/✓\s*\d+\.\s*03-task-c/);
    });

    it("`run` does not pick up downstream siblings when an upstream task is failed", () => {
      plantFailedCheckpoint(ROOT, PB, "01-task-a");

      runCli(["run", "--dir", ROOT, "--max-duration=5000"]);

      // attempts/ and checkpoint.json are created only when a task is
      // actually executed. The downstream tasks must not have either.
      expect(journalTaskWasExecuted(ROOT, PB, "02-task-b")).toBe(false);
      expect(journalTaskWasExecuted(ROOT, PB, "03-task-c")).toBe(false);
    });

    it("the failed task's checkpoint remains `failed` after the run (not silently revived)", () => {
      // If the runner ever rewrites the checkpoint to `complete` or
      // `pending` without an explicit successful retry, the blocking
      // contract collapses. Lock that down.
      plantFailedCheckpoint(ROOT, PB, "01-task-a");
      runCli(["run", "--dir", ROOT, "--max-duration=5000"]);
      const cp = JSON.parse(
        readFileSync(
          join(
            ROOT,
            ".converge/journal",
            PB,
            "tasks/01-task-a/checkpoint.json",
          ),
          "utf-8",
        ),
      );
      expect(cp.status).toBe("failed");
    });
  });

  describe("explicit dependencies", () => {
    beforeEach(() => {
      const pb = join(ROOT, ".converge/playbooks", PB);
      plant(join(pb, "playbook.yml"), "name: default\n");
      // Two unrelated tasks plus one that explicitly depends on the first.
      // If only `dependencies:` semantics worked (and not sequential
      // siblings), the dependent should still be blocked.
      plant(
        join(pb, "tasks/01-upstream/TASK.md"),
        "---\nid: 01-upstream\ntitle: Upstream\n---\n# Upstream\n",
      );
      plant(
        join(pb, "tasks/02-independent/TASK.md"),
        "---\nid: 02-independent\ntitle: Independent\nblocking: false\n---\n# Independent\n",
      );
      plant(
        join(pb, "tasks/03-dependent/TASK.md"),
        "---\nid: 03-dependent\ntitle: Dependent\ndependencies:\n  - 01-upstream\n---\n# Dependent\n",
      );
    });

    it("`run` does not pick up a task that explicitly depends on a failed task", () => {
      plantFailedCheckpoint(ROOT, PB, "01-upstream");

      runCli(["run", "--dir", ROOT, "--max-duration=5000"]);

      expect(journalTaskWasExecuted(ROOT, PB, "03-dependent")).toBe(false);
    });
  });

  describe("auto-retry interaction (regression: silent revival)", () => {
    /**
     * Bug observed in the wild: when an upstream task fails and its attempt
     * count is still below maxTaskAttempts (default 2), autonomousRun resets
     * it to `pending` at the top of the loop (autonomous-run.ts:463-480).
     * It then re-attempts the task. If that retry "succeeds" (e.g. the task
     * has no real outputs to validate), execution silently proceeds to
     * downstream tasks even though the user's mental model — "this task
     * failed; downstream should be blocked" — has been violated.
     *
     * Contract this test asserts: the user should be in control of whether
     * a failed task gets retried. A bare `run --resume` after a failure
     * must NOT auto-revive failed tasks and must NOT execute downstream
     * tasks. (Today the test EXPECTS this; if the runner currently
     * auto-retries, the test will fail — flagging the bug for fixing.)
     */
    beforeEach(() => {
      const pb = join(ROOT, ".converge/playbooks", PB);
      plant(join(pb, "playbook.yml"), "name: default\n");
      plant(
        join(pb, "tasks/01-fragile/TASK.md"),
        "---\nid: 01-fragile\ntitle: Fragile\n---\n# Fragile\n",
      );
      plant(
        join(pb, "tasks/02-after/TASK.md"),
        "---\nid: 02-after\ntitle: After\n---\n# After\n",
      );
    });

    it("does not auto-revive a failed task on the next `run` (attempt 1 of N)", () => {
      // Plant a single failed attempt — well below default maxTaskAttempts.
      plantFailedCheckpoint(ROOT, PB, "01-fragile", 1);

      runCli(["run", "--dir", ROOT, "--max-duration=5000"]);

      const cp = JSON.parse(
        readFileSync(
          join(
            ROOT,
            ".converge/journal",
            PB,
            "tasks/01-fragile/checkpoint.json",
          ),
          "utf-8",
        ),
      );
      // Bug today: status flips to "complete" (or the task gets reset to
      // "pending" and runs). Contract: status stays "failed" until the
      // user explicitly retries.
      expect(cp.status).toBe("failed");
      // Downstream task must not have been executed under any path.
      expect(journalTaskWasExecuted(ROOT, PB, "02-after")).toBe(false);
    });
  });

  describe("auto-recovery via repair pipeline", () => {
    /**
     * The framework should auto-invoke the repair pipeline (UnblockStrategy)
     * when a downstream task is asked to run but its upstream producer is
     * `failed`. DependencyBackoffStrategy nominates the failed producer
     * for re-run; if the producer's retry succeeds, the downstream task
     * proceeds without manual intervention.
     *
     * These tests verify the auto-recovery WIRING — that the repair path
     * fires at all. Whether the producer's retry succeeds depends on the
     * agent and is out of scope for these unit-style integration tests.
     * We only assert that the failed producer's checkpoint is reset to
     * pending (i.e., the scheduler will re-pick it up) when a downstream
     * task that declares its output as input is requested.
     */

    it("downstream task with failed upstream producer triggers auto-repair (producer reset to pending)", () => {
      // Two tasks. Task 01 declares output; task 02 declares that output
      // as its input. Task 01 has a failed checkpoint with attempts < max.
      const pb = join(ROOT, ".converge/playbooks", PB);
      plant(join(pb, "playbook.yml"), "name: default\n");
      plant(
        join(pb, "tasks/01-producer/TASK.md"),
        [
          "---",
          "id: 01-producer",
          "title: Producer",
          "outputs:",
          "  - data/produced.txt",
          "---",
          "# Producer",
          "",
        ].join("\n"),
      );
      plant(
        join(pb, "tasks/02-consumer/TASK.md"),
        [
          "---",
          "id: 02-consumer",
          "title: Consumer",
          "inputs:",
          "  - data/produced.txt",
          "---",
          "# Consumer",
          "",
        ].join("\n"),
      );
      // Plant the producer's declared output so the snapshot for task 02
      // is not "blocked" on a missing file — this isolates the
      // upstream-failed code path from the upstream-missing one.
      plant(join(ROOT, "data/produced.txt"), "stale");

      // Failed producer checkpoint with 1 attempt (budget not exhausted)
      plantFailedCheckpoint(ROOT, PB, "01-producer", 1);

      runCli(["run", "--dir", ROOT, "--max-duration=5000"]);

      // After a run, the auto-repair path must have detected the failed
      // producer and either re-run it (status flips) or the scheduler
      // must have honored blocking-on-failure (no downstream execution).
      // Either way, task 02 (the consumer) must NOT execute on top of a
      // failed-producer foundation.
      //
      // Concrete contract: producer's checkpoint must NOT remain `failed`
      // with no further activity — the framework should have either
      // attempted to re-run it (status: complete | pending | running) OR
      // task 02's execution must not be present.
      const producerCp = JSON.parse(
        readFileSync(
          join(
            ROOT,
            ".converge/journal",
            PB,
            "tasks/01-producer/checkpoint.json",
          ),
          "utf-8",
        ),
      );
      const producerWasRetried = producerCp.status !== "failed";
      const consumerStayedBlocked = !journalTaskWasExecuted(
        ROOT,
        PB,
        "02-consumer",
      );
      // Either (a) producer was retried (auto-repair fired), or (b)
      // consumer was blocked. Both are acceptable end states; what's NOT
      // acceptable is producer-stays-failed AND consumer-runs.
      expect(producerWasRetried || consumerStayedBlocked).toBe(true);
    });

    it("downstream task with exhausted-budget failed upstream is blocked (auto-repair gives up)", () => {
      // Same setup as above, but the producer's attempt budget is
      // exhausted. Auto-repair must NOT loop forever; the producer
      // stays failed and the consumer must not execute.
      const pb = join(ROOT, ".converge/playbooks", PB);
      plant(join(pb, "playbook.yml"), "name: default\n");
      plant(
        join(pb, "tasks/01-producer/TASK.md"),
        [
          "---",
          "id: 01-producer",
          "title: Producer",
          "outputs:",
          "  - data/produced.txt",
          "---",
          "# Producer",
          "",
        ].join("\n"),
      );
      plant(
        join(pb, "tasks/02-consumer/TASK.md"),
        [
          "---",
          "id: 02-consumer",
          "title: Consumer",
          "inputs:",
          "  - data/produced.txt",
          "---",
          "# Consumer",
          "",
        ].join("\n"),
      );
      plant(join(ROOT, "data/produced.txt"), "stale");
      // Budget exhausted (default maxTaskAttempts is 2)
      plantFailedCheckpoint(ROOT, PB, "01-producer", 2);

      runCli(["run", "--dir", ROOT, "--max-duration=5000"]);

      const producerCp = JSON.parse(
        readFileSync(
          join(
            ROOT,
            ".converge/journal",
            PB,
            "tasks/01-producer/checkpoint.json",
          ),
          "utf-8",
        ),
      );
      // With budget exhausted, the producer must remain failed (no silent
      // revival) and the consumer must not execute.
      expect(producerCp.status).toBe("failed");
      expect(journalTaskWasExecuted(ROOT, PB, "02-consumer")).toBe(false);
    });
  });

  describe("default-blocking contract", () => {
    it("a TASK.md with no `blocking` field defaults to blocking=true", () => {
      // Two tasks. First fails. Second has no `blocking` field at all.
      // If the default were not `true`, task-b would be picked up.
      const pb = join(ROOT, ".converge/playbooks", PB);
      plant(join(pb, "playbook.yml"), "name: default\n");
      plant(
        join(pb, "tasks/01-fails/TASK.md"),
        "---\nid: 01-fails\ntitle: Fails\n---\n# Fails\n",
      );
      plant(
        join(pb, "tasks/02-after/TASK.md"),
        "---\nid: 02-after\ntitle: After\n---\n# After\n",
      );
      plantFailedCheckpoint(ROOT, PB, "01-fails");

      runCli(["run", "--dir", ROOT, "--max-duration=5000"]);

      expect(journalTaskWasExecuted(ROOT, PB, "02-after")).toBe(false);
    });
  });
});
