/**
 * Red — `converge run --resume` should NOT auto-revalidate completed tasks
 * when their TASK.md mtime changes. Today's behavior re-validates, making
 * this test fail.
 */
import { describe, it, expect, afterAll } from "vitest";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { recheckEditedCompletedTasks } from "../../src/autonomous-run.ts";

let workDir: string;

describe("converge run --resume", () => {
  afterAll(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  it("does not auto-revalidate completed tasks on --resume (RED — currently re-validates)", async () => {
    // Clear CONVERGE_PLAYBOOK so journal paths use the "default" playbook.
    const savedPlaybook = process.env.CONVERGE_PLAYBOOK;
    delete process.env.CONVERGE_PLAYBOOK;
    try {
      workDir = join(tmpdir(), `converge-test-no-reval-${Date.now()}`);

      // Journal structure mirrors playbook tree:
      //   journal/default/tasks/<epicId>/tasks/<taskId>/checkpoint.json
      const epicId = "minimal-playbook";
      const taskId = "trivial-task";
      const journalTaskDir = join(
        workDir,
        ".converge",
        "journal",
        "default",
        "tasks",
        epicId,
        "tasks",
        taskId,
      );
      mkdirSync(journalTaskDir, { recursive: true });

      // Write a completed checkpoint with an old lastUpdated timestamp
      const checkpoint = {
        type: "task",
        id: taskId,
        status: "complete",
        lastUpdated: new Date(Date.now() - 60000).toISOString(),
        createdAt: new Date(Date.now() - 120000).toISOString(),
        currentAttempt: 1,
        attempts: [
          {
            attempt: 1,
            startedAt: new Date(Date.now() - 120000).toISOString(),
            completedAt: new Date(Date.now() - 60000).toISOString(),
            outcome: "success",
            durationMs: 5000,
          },
        ],
      };
      writeFileSync(
        join(journalTaskDir, "checkpoint.json"),
        JSON.stringify(checkpoint, null, 2),
      );

      // TASK.md with a check whose command always fails (exit 1).
      // recheckEditedCompletedTasks re-runs checks; the failing check
      // causes it to reset the task to pending.
      writeFileSync(
        join(journalTaskDir, "TASK.md"),
        [
          "---",
          "checks:",
          "  - id: always-fails",
          "    cmd: exit 1",
          "---",
          "# trivial-task",
          "",
        ].join("\n"),
      );

      const resetCount = await recheckEditedCompletedTasks(workDir);

      // Assertion: no tasks should be reset to pending.
      // Current behavior: revalidation finds the TASK.md was edited,
      // re-runs the check (which fails), resets to pending.
      // The test asserts 0 — RED.
      expect(resetCount).toBe(0);
    } finally {
      process.env.CONVERGE_PLAYBOOK = savedPlaybook;
    }
  });
});
