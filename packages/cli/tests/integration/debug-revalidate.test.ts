/**
 * Red — `converge debug --revalidate` should report check failures
 * without auto-reverting completed task checkpoints.
 */
import { describe, it, expect, afterAll } from "vitest";
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

let workDir: string;

describe("converge debug --revalidate", () => {
  afterAll(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  it("reports failing checks but does NOT auto-revert completed tasks (RED — debug not implemented)", () => {
    workDir = join(tmpdir(), `converge-test-debug-reval-${Date.now()}`);

    // Minimal project config
    mkdirSync(join(workDir, ".converge"), { recursive: true });
    writeFileSync(join(workDir, ".converge", "project.yaml"), "name: test\n");

    // Playbook with trivial-task that declares an output + check
    const playbookTaskDir = join(
      workDir,
      ".converge",
      "playbooks",
      "default",
      "tasks",
      "trivial-task",
    );
    mkdirSync(playbookTaskDir, { recursive: true });
    writeFileSync(
      join(workDir, ".converge", "playbooks", "default", "playbook.yml"),
      "name: default\ntasks:\n  - name: trivial-task\n",
    );
    writeFileSync(
      join(playbookTaskDir, "TASK.md"),
      [
        "---",
        "outputs:",
        "  - output.txt",
        "checks:",
        "  - id: output-exists",
        "    cmd: test -f output.txt",
        "---",
        "# trivial-task",
        "",
      ].join("\n"),
    );

    // Journal with a completed checkpoint and the output file present
    const journalTaskDir = join(
      workDir,
      ".converge",
      "journal",
      "default",
      "tasks",
      "trivial-task",
    );
    mkdirSync(journalTaskDir, { recursive: true });
    writeFileSync(
      join(journalTaskDir, "TASK.md"),
      [
        "---",
        "outputs:",
        "  - output.txt",
        "checks:",
        "  - id: output-exists",
        "    cmd: test -f output.txt",
        "---",
        "# trivial-task",
        "",
      ].join("\n"),
    );
    writeFileSync(join(journalTaskDir, "output.txt"), "done");

    const checkpoint = {
      type: "task",
      id: "trivial-task",
      status: "complete",
      lastUpdated: new Date().toISOString(),
      createdAt: new Date(Date.now() - 60000).toISOString(),
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

    // Delete the output file — checks should now fail
    rmSync(join(journalTaskDir, "output.txt"));

    // Run debug --revalidate
    const result = spawnSync("node", [CLI, "debug", "--revalidate", "--dir", workDir], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Assert exit code 1 (some check failed)
    expect(result.status).toBe(1);

    // Assert stderr contains "trivial-task" + "fail"
    const stderr = result.stderr || "";
    expect(stderr).toContain("trivial-task");
    expect(stderr).toContain("fail");

    // Assert checkpoint is still "complete" (no auto-revert)
    const ckptAfter = JSON.parse(
      readFileSync(join(journalTaskDir, "checkpoint.json"), "utf-8"),
    );
    expect(ckptAfter.status).toBe("complete");
  });
});
