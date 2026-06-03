/**
 * Tests for the agent-driven buggy-check relaxer.
 */

import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readBuggyCheckProposal,
  tryRelaxBuggyCheck,
} from "../../src/task/lifecycle/buggy-check-relaxer.ts";

/**
 * Make a wip dir with a TASK.md containing a couple of checks.
 * Returns the dir path.
 */
async function makeWip(): Promise<string> {
  const wipDir = await mkdtemp(join(tmpdir(), "relax-test-"));
  await writeFile(
    join(wipDir, "TASK.md"),
    [
      "---",
      "id: 001-cli-index",
      "title: Write CLI index",
      "outputs:",
      "  - docs/reference/cli/index.md",
      "checks:",
      "  - id: page-exists",
      '    cmd: "test -f docs/reference/cli/index.md"',
      "    description: page exists",
      "  - id: lists-commands",
      `    cmd: "test $(grep -cE '^\\\\*?\\\\s*\\\\[?\\\\s*\`?converge\\\\s+\\\\w+' docs/reference/cli/index.md) -ge 8"`,
      "    description: lists at least 8 commands",
      "---",
      "",
      "# CLI page",
      "",
    ].join("\n"),
  );
  return wipDir;
}

describe("readBuggyCheckProposal", () => {
  it("returns null when BUGGY_CHECK.md is absent", async () => {
    const wipDir = await mkdtemp(join(tmpdir(), "relax-absent-"));
    expect(await readBuggyCheckProposal(wipDir)).toBeNull();
  });

  it("parses a valid frontmatter proposal", async () => {
    const wipDir = await mkdtemp(join(tmpdir(), "relax-parse-"));
    await writeFile(
      join(wipDir, "BUGGY_CHECK.md"),
      [
        "---",
        "check_id: lists-commands",
        "reason: regex requires asterisk bullet but my output uses hyphen",
        'proposed_cmd: "test -f docs/x.md"',
        "---",
        "",
        "Free-form notes go here.",
      ].join("\n"),
    );

    const proposal = await readBuggyCheckProposal(wipDir);
    expect(proposal).not.toBeNull();
    expect(proposal?.checkId).toBe("lists-commands");
    expect(proposal?.proposedCmd).toBe("test -f docs/x.md");
    expect(proposal?.notes).toBe("Free-form notes go here.");
  });

  it("returns null when frontmatter is missing required fields", async () => {
    const wipDir = await mkdtemp(join(tmpdir(), "relax-missing-"));
    await writeFile(
      join(wipDir, "BUGGY_CHECK.md"),
      ["---", "check_id: foo", "---"].join("\n"),
    );
    expect(await readBuggyCheckProposal(wipDir)).toBeNull();
  });

  it("returns null when there is no frontmatter at all", async () => {
    const wipDir = await mkdtemp(join(tmpdir(), "relax-no-fm-"));
    await writeFile(
      join(wipDir, "BUGGY_CHECK.md"),
      "just a regular markdown file with no frontmatter",
    );
    expect(await readBuggyCheckProposal(wipDir)).toBeNull();
  });
});

describe("tryRelaxBuggyCheck", () => {
  it("is a no-op when no proposal is present", async () => {
    const wipDir = await makeWip();
    const result = await tryRelaxBuggyCheck(wipDir);
    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toMatch(/no BUGGY_CHECK.md/);
    }
  });

  it("applies a valid proposal and rewrites TASK.md", async () => {
    const wipDir = await makeWip();
    const oldTask = await readFile(join(wipDir, "TASK.md"), "utf-8");

    await writeFile(
      join(wipDir, "BUGGY_CHECK.md"),
      [
        "---",
        "check_id: lists-commands",
        "reason: original regex requires asterisk bullet but markdown allows hyphen too",
        `proposed_cmd: "test $(grep -cE '^[-*]\\\\s*\`?converge\\\\s+\\\\w+' docs/reference/cli/index.md) -ge 8"`,
        "---",
      ].join("\n"),
    );

    const result = await tryRelaxBuggyCheck(wipDir);
    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.checkId).toBe("lists-commands");
      expect(result.newCmd).toContain("[-*]");
    }

    const newTask = await readFile(join(wipDir, "TASK.md"), "utf-8");
    expect(newTask).not.toBe(oldTask);
    expect(newTask).toContain("[-*]");
    // The other check (page-exists) must be untouched.
    expect(newTask).toContain("test -f docs/reference/cli/index.md");
  });

  it("rejects a tautological proposal", async () => {
    const wipDir = await makeWip();
    await writeFile(
      join(wipDir, "BUGGY_CHECK.md"),
      [
        "---",
        "check_id: lists-commands",
        "reason: i give up; just pass",
        'proposed_cmd: "true"',
        "---",
      ].join("\n"),
    );

    const result = await tryRelaxBuggyCheck(wipDir);
    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toMatch(/tautology|empty sandbox/i);
    }
  });

  it("rejects a syntax-broken proposal", async () => {
    const wipDir = await makeWip();
    await writeFile(
      join(wipDir, "BUGGY_CHECK.md"),
      [
        "---",
        "check_id: lists-commands",
        "reason: typo'd",
        `proposed_cmd: "echo 'unterminated"`,
        "---",
      ].join("\n"),
    );

    const result = await tryRelaxBuggyCheck(wipDir);
    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toMatch(/syntax/i);
    }
  });

  it("rejects a proposal with an unknown check_id", async () => {
    const wipDir = await makeWip();
    await writeFile(
      join(wipDir, "BUGGY_CHECK.md"),
      [
        "---",
        "check_id: not-a-real-check",
        "reason: typo'd",
        'proposed_cmd: "test -f docs/x.md"',
        "---",
      ].join("\n"),
    );

    const result = await tryRelaxBuggyCheck(wipDir);
    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toMatch(/not found/i);
    }
  });

  it("preserves untouched checks during rewrite", async () => {
    const wipDir = await makeWip();
    await writeFile(
      join(wipDir, "BUGGY_CHECK.md"),
      [
        "---",
        "check_id: lists-commands",
        "reason: ok",
        'proposed_cmd: "test -d docs/reference"',
        "---",
      ].join("\n"),
    );

    await tryRelaxBuggyCheck(wipDir);
    const newTask = await readFile(join(wipDir, "TASK.md"), "utf-8");

    // page-exists check still has its original cmd
    expect(newTask).toMatch(
      /id: page-exists[\s\S]*?cmd:.*test -f docs\/reference\/cli\/index\.md/,
    );
    // lists-commands has the new cmd
    expect(newTask).toMatch(
      /id: lists-commands[\s\S]*?cmd:.*test -d docs\/reference/,
    );
  });
});
