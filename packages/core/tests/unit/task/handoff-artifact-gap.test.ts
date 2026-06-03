/**
 * RFC 0047: a leaf `handoff:` block's artifact is enforced via the standard
 * output-existence gap. A missing artifact yields a `missing-output` gap (→
 * FEEDBACK → retry), so the review gate never fires without the report.
 * Gateways generate nothing and are exempt.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Unit } from "../../../src/task/unit/unit.ts";
import { findGaps } from "../../../src/task/unit/find-gaps.ts";
import { GapKind } from "../../../src/task/gap/types.ts";

const ARTIFACT = "docs/report.html";

describe("handoff.artifact enforcement (findGaps)", () => {
  let ws: string;

  beforeEach(() => {
    ws = mkdtempSync(join(tmpdir(), "converge-handoff-gap-"));
  });

  afterEach(() => {
    rmSync(ws, { recursive: true, force: true });
  });

  function plantTask(frontmatter: string, body = "Main work body.\n"): string {
    const dir = join(ws, ".converge", "playbooks", "pb", "tasks", "the-task");
    mkdirSync(dir, { recursive: true });
    const taskMd = join(dir, "TASK.md");
    writeFileSync(taskMd, `---\n${frontmatter}---\n${body}`, "utf8");
    return taskMd;
  }

  const LEAF = [
    "id: the-task",
    "title: The task",
    "outputs:",
    "  - docs/main.json",
    "handoff:",
    `  artifact: ${ARTIFACT}`,
    "  format: html",
    "  generate: make a report",
    "",
  ].join("\n");

  function artifactGaps(gaps: Awaited<ReturnType<typeof findGaps>>) {
    return gaps.filter(
      (g) => g.metadata?.gapKind === GapKind.output && g.id.includes(ARTIFACT),
    );
  }

  it("gaps the handoff artifact when it is missing", async () => {
    const unit = await Unit.fromPath(plantTask(LEAF));
    const gaps = await findGaps(unit);
    expect(artifactGaps(gaps)).toHaveLength(1);
  });

  it("does not gap the artifact once it exists on disk", async () => {
    const unit = await Unit.fromPath(plantTask(LEAF));
    mkdirSync(join(ws, "docs"), { recursive: true });
    writeFileSync(join(ws, "docs", "main.json"), "{}", "utf8");
    writeFileSync(join(ws, "docs", "report.html"), "<h1>ok</h1>", "utf8");
    const gaps = await findGaps(unit);
    expect(artifactGaps(gaps)).toHaveLength(0);
  });

  it("exempts gateway tasks (they generate nothing)", async () => {
    const gateway = [
      "id: the-task",
      "title: The task",
      "mode: gateway",
      "handoff:",
      `  artifact: ${ARTIFACT}`,
      "  format: html",
      "",
    ].join("\n");
    const unit = await Unit.fromPath(plantTask(gateway, ""));
    const gaps = await findGaps(unit);
    expect(artifactGaps(gaps)).toHaveLength(0);
  });

  it("does not double-gap when the artifact is also a declared output", async () => {
    const both = [
      "id: the-task",
      "title: The task",
      "outputs:",
      `  - ${ARTIFACT}`,
      "handoff:",
      `  artifact: ${ARTIFACT}`,
      "  format: html",
      "",
    ].join("\n");
    const unit = await Unit.fromPath(plantTask(both));
    const gaps = await findGaps(unit);
    expect(artifactGaps(gaps)).toHaveLength(1);
  });
});
