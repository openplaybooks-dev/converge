/**
 * Tests for the pre-flight check linter.
 */

import { describe, it, expect } from "vitest";
import { lintChecks } from "../../src/task/playbook/check-linter.ts";

describe("lintChecks", () => {
  it("flags a tautology — passes on empty AND positive control", async () => {
    // `wc -w | awk '{exit ($1<=600?0:1)}'` is the canonical tautology bug:
    // when the file is missing, wc errors and awk gets no input, exiting 0.
    // When the file exists with placeholder content (~800 words), 800 > 600
    // would normally fail this check — but with our 800-word placeholder,
    // upper-bound checks like `<=600` still pass when the file is empty.
    // We use a clearer example: `test true` always succeeds.
    const report = await lintChecks([
      {
        taskId: "tasks/whatever",
        outputs: ["out.txt"],
        checks: [
          {
            id: "always-true",
            cmd: "true",
            description: "always passes",
          },
        ],
      },
    ]);

    expect(report.hasErrors).toBe(true);
    const result = report.results[0];
    expect(result.status).toBe("tautology");
    expect(result.detail).toMatch(/passes on BOTH/);
  });

  it("accepts a well-formed check that fails on empty control", async () => {
    const report = await lintChecks([
      {
        taskId: "tasks/well-formed",
        outputs: ["foo.txt"],
        checks: [
          {
            id: "file-exists",
            cmd: "test -f foo.txt",
            description: "foo.txt exists",
          },
        ],
      },
    ]);

    expect(report.hasErrors).toBe(false);
    expect(report.results[0].status).toBe("ok");
  });

  it("flags syntax errors", async () => {
    const report = await lintChecks([
      {
        taskId: "tasks/broken",
        outputs: [],
        checks: [
          {
            id: "bad-syntax",
            // Unclosed quote — bash -n rejects.
            cmd: "echo 'unterminated",
            description: "syntax broken",
          },
        ],
      },
    ]);

    expect(report.hasErrors).toBe(true);
    expect(report.results[0].status).toBe("syntax-error");
  });

  it("marks dangerous commands as unverified rather than running them", async () => {
    const report = await lintChecks([
      {
        taskId: "tasks/dangerous",
        outputs: [],
        checks: [
          {
            id: "deletes-things",
            cmd: "rm -rf /tmp/something && test -d /tmp/something",
            description: "would delete files",
          },
        ],
      },
    ]);

    expect(report.hasErrors).toBe(false);
    expect(report.results[0].status).toBe("unverified");
  });

  it("downgrades to weak when no outputs are declared (cannot run positive control)", async () => {
    // `true` would normally be flagged as tautology, but without declared
    // outputs we can't run a positive control — so we soften to "weak".
    const report = await lintChecks([
      {
        taskId: "tasks/no-outputs",
        outputs: [],
        checks: [
          {
            id: "always-true",
            cmd: "true",
            description: "always passes",
          },
        ],
      },
    ]);

    expect(report.hasErrors).toBe(false);
    expect(report.results[0].status).toBe("weak");
  });

  it("returns empty report when no tasks have checks", async () => {
    const report = await lintChecks([
      { taskId: "tasks/no-checks", outputs: [] },
      { taskId: "tasks/empty-checks", outputs: [], checks: [] },
    ]);

    expect(report.results).toHaveLength(0);
    expect(report.hasErrors).toBe(false);
  });

  it("lints multiple checks across multiple tasks", async () => {
    const report = await lintChecks([
      {
        taskId: "tasks/a",
        outputs: ["a.txt"],
        checks: [
          { id: "good", cmd: "test -f a.txt", description: "" },
          { id: "bad", cmd: "true", description: "" },
        ],
      },
      {
        taskId: "tasks/b",
        outputs: ["b.txt"],
        checks: [{ id: "good", cmd: "test -f b.txt", description: "" }],
      },
    ]);

    expect(report.results).toHaveLength(3);
    expect(report.hasErrors).toBe(true);

    const taskA = report.results.filter((r) => r.taskId === "tasks/a");
    expect(taskA.find((r) => r.checkId === "good")?.status).toBe("ok");
    expect(taskA.find((r) => r.checkId === "bad")?.status).toBe("tautology");
  });
});
