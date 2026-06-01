/**
 * RFC 0047: `handoff.generate` prompt injection.
 *
 * The scaffold TASK.md the agent reads must carry the handoff block as an
 * explicit "generate this review artifact" instruction. Without it the field
 * is dead (the body alone reaches the agent). These tests pin the injection.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeContextSnapshot } from "../../../../src/task/lifecycle/context-snapshot.ts";

describe("handoff.generate prompt injection", () => {
  let workspace: string;
  let attemptDir: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-handoff-prompt-"));
    attemptDir = join(workspace, ".converge", "journal", "default", "tasks", "t", "attempts", "wip");
    mkdirSync(attemptDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  async function snapshot(handoff?: Record<string, unknown>): Promise<string> {
    await writeContextSnapshot({
      projectDir: workspace,
      epicId: "default",
      taskId: "t",
      attemptDir,
      description: "main work",
      inputs: [],
      outputs: ["docs/findings.json"],
      checks: [],
      skillBody: "Write `docs/findings.json` with the analysis.",
      attemptNumber: 1,
      handoff: handoff as any,
    });
    return readFileSync(join(attemptDir, "TASK.md"), "utf8");
  }

  it("injects the artifact, generate text, and skill into the scaffold TASK.md", async () => {
    const taskMd = await snapshot({
      artifact: "docs/review.html",
      format: "html",
      generate: "Build a standalone HTML report presenting the findings.",
      skill: "html-review-artifact",
    });

    expect(taskMd).toContain("## Review artifact (generate for human review)");
    expect(taskMd).toContain("`docs/review.html`");
    expect(taskMd).toContain("html document");
    expect(taskMd).toContain("Build a standalone HTML report presenting the findings.");
    expect(taskMd).toContain("`html-review-artifact` skill");
    // The body is preserved alongside the injected section.
    expect(taskMd).toContain("Write `docs/findings.json` with the analysis.");
  });

  it("omits the section entirely when there is no handoff block", async () => {
    const taskMd = await snapshot(undefined);
    expect(taskMd).not.toContain("Review artifact");
  });

  it("still emits a minimal instruction when generate is empty", async () => {
    const taskMd = await snapshot({ artifact: "docs/review.md" });
    expect(taskMd).toContain("## Review artifact (generate for human review)");
    expect(taskMd).toContain("Produce `docs/review.md` as a md document for human review.");
  });
});
