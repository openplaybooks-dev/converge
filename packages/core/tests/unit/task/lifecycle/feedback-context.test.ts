/**
 * FEEDBACK.md attempt-flow tests.
 *
 * These tests pin the existing non-breaking flow where retry context lives
 * in the current attempt directory under `attempts/wip/` and the next
 * attempt reads that same attempt-local artifact back as its error context.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareFeedback, resetFeedbackDedupe } from "../../../../src/navigator/repair/feedback-writer.ts";
import { writeContextSnapshot } from "../../../../src/task/lifecycle/context-snapshot.ts";
import { GapKind } from "../../../../src/task/gap/types.ts";

function makeWorkspace(): string {
  return mkdtempSync(join(tmpdir(), "converge-feedback-"));
}

describe("FEEDBACK.md attempt flow", () => {
  let workspace: string;
  let prevAttemptDir: string | undefined;
  let prevAttempt: string | undefined;

  beforeEach(() => {
    workspace = makeWorkspace();
    prevAttemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
    prevAttempt = process.env.CONVERGE_TASK_ATTEMPT;
    resetFeedbackDedupe();
  });

  afterEach(() => {
    if (prevAttemptDir === undefined) delete process.env.CONVERGE_TASK_ATTEMPT_DIR;
    else process.env.CONVERGE_TASK_ATTEMPT_DIR = prevAttemptDir;
    if (prevAttempt === undefined) delete process.env.CONVERGE_TASK_ATTEMPT;
    else process.env.CONVERGE_TASK_ATTEMPT = prevAttempt;
    rmSync(workspace, { recursive: true, force: true });
  });

  it("writes FEEDBACK.md into the current attempt dir when a check fails", async () => {
    const attemptDir = join(
      workspace,
      ".converge",
      "journal",
      "default",
      "tasks",
      "review-phase",
      "attempts",
      "wip",
    );
    mkdirSync(join(attemptDir, "data"), { recursive: true });
    process.env.CONVERGE_TASK_ATTEMPT_DIR = attemptDir;
    process.env.CONVERGE_TASK_ATTEMPT = "2";

    writeFileSync(
      join(attemptDir, "data", "check.json"),
      JSON.stringify(
        {
          taskId: "review-phase",
          checks: [
            {
              id: "research-ready",
              description: "Research report exists",
              cmd: "test -f definitely-missing.txt",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    await prepareFeedback(
      {
        id: "gap-1",
        type: "structural",
        level: "task",
        scope: "review-phase",
        description: "research is not ready for human review",
        detected: new Date().toISOString(),
        resolved: false,
        checks: ["research-ready"],
        metadata: { gapKind: GapKind.checkFailed },
      },
      workspace,
    );

    const feedbackPath = join(attemptDir, "FEEDBACK.md");
    expect(existsSync(feedbackPath)).toBe(true);
    const feedback = readFileSync(feedbackPath, "utf8");
    expect(feedback).toContain("FEEDBACK.md — Check Results");
    expect(feedback).toContain("research-ready");
    expect(feedback).toContain("definitely-missing.txt");
  });

  it("exposes FEEDBACK.md as the next attempt's error context", async () => {
    const attemptDir = join(
      workspace,
      ".converge",
      "journal",
      "default",
      "tasks",
      "review-phase",
      "attempts",
      "wip",
    );
    mkdirSync(attemptDir, { recursive: true });
    mkdirSync(join(workspace, "docs"), { recursive: true });
    writeFileSync(join(workspace, "docs", "idea.txt"), "idea\n", "utf8");
    writeFileSync(
      join(attemptDir, "FEEDBACK.md"),
      "# FEEDBACK.md\n\nHuman review says revise the research summary.\n",
      "utf8",
    );

    const snapshot = await writeContextSnapshot({
      projectDir: workspace,
      epicId: "default",
      taskId: "review-phase",
      attemptDir,
      description: "Review gate",
      inputs: ["docs/idea.txt"],
      outputs: [],
      checks: [],
      skillBody: "",
      attemptNumber: 2,
    });

    expect(snapshot.hasErrorContext).toBe(true);
    expect(snapshot.errorContextMd).toBe(join(attemptDir, "FEEDBACK.md"));
    expect(snapshot.blocked).toBe(false);
  });
});
