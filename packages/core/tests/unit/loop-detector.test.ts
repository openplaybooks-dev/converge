/**
 * Tests for the post-attempt loop detector.
 */

import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
  detectAttemptLoop,
  augmentLearnMdWithLoopHint,
} from "../../src/task/lifecycle/loop-detector.ts";

/**
 * Build a fake wip dir with a synthetic index.jsonl, mirroring the format
 * claudefn/kimifn produce while streaming agent tool calls.
 */
async function makeWipDir(
  toolCalls: Array<{ tool: string; input: Record<string, unknown> }>,
): Promise<string> {
  const wipDir = await mkdtemp(join(tmpdir(), "loop-test-"));
  await mkdir(join(wipDir, "logs"), { recursive: true });

  const lines = toolCalls.map((c, i) =>
    JSON.stringify({
      ts: new Date(2026, 0, 1, 0, 0, i).toISOString(),
      type: "tool",
      event: "call",
      data: { tool: c.tool, id: `call-${i}`, input: c.input },
    }),
  );
  await writeFile(
    join(wipDir, "logs", "attempt.index.jsonl"),
    lines.join("\n") + "\n",
  );
  return wipDir;
}

describe("detectAttemptLoop", () => {
  it("returns no detection when there is no log directory", async () => {
    const wipDir = await mkdtemp(join(tmpdir(), "loop-empty-"));
    const result = await detectAttemptLoop(wipDir);
    expect(result.detected).toBe(false);
    expect(result.totalCalls).toBe(0);
  });

  it("normalizes Bash signatures across cosmetic variations", async () => {
    // Six variants of `grep <pattern> docs/x.md`, all with only `grep` as
    // their verb (no extra pipes). The regex pattern, flags, and quoting
    // differ — but the signature normalizer collapses those differences,
    // so all 6 hash to ONE signature with count 6 → detected at threshold 5.
    const wipDir = await makeWipDir([
      { tool: "Bash", input: { cmd: "grep -E 'foo' docs/x.md" } },
      { tool: "Bash", input: { cmd: "grep -nE 'foo' docs/x.md" } },
      { tool: "Bash", input: { cmd: "grep   -cE  'bar'   docs/x.md" } },
      { tool: "Bash", input: { cmd: 'grep -E "^foo$" docs/x.md' } },
      { tool: "Bash", input: { cmd: "grep -E 'baz' docs/x.md" } },
      { tool: "Bash", input: { cmd: "grep -lE 'qux' docs/x.md" } },
    ]);

    const result = await detectAttemptLoop(wipDir, { threshold: 5 });
    expect(result.detected).toBe(true);
    expect(result.totalCalls).toBe(6);
    expect(result.hotSignatures).toHaveLength(1);
    expect(result.hotSignatures[0].count).toBe(6);
    expect(result.hotSignatures[0].tool).toBe("Bash");
  });

  it("does not flag exploration across distinct files", async () => {
    // Reading 6 different files is not a loop — each Read has a distinct
    // signature (file path is the discriminator).
    const wipDir = await makeWipDir(
      ["a.md", "b.md", "c.md", "d.md", "e.md", "f.md"].map((file) => ({
        tool: "Read",
        input: { file },
      })),
    );

    const result = await detectAttemptLoop(wipDir, { threshold: 5 });
    expect(result.detected).toBe(false);
    expect(result.totalCalls).toBe(6);
  });

  it("flags repeated reads of the same file", async () => {
    const wipDir = await makeWipDir(
      Array.from({ length: 6 }, () => ({
        tool: "Read",
        input: { file: "/foo/bar.md" },
      })),
    );

    const result = await detectAttemptLoop(wipDir, { threshold: 5 });
    expect(result.detected).toBe(true);
    expect(result.hotSignatures[0].count).toBe(6);
  });

  it("respects the threshold setting", async () => {
    const wipDir = await makeWipDir(
      Array.from({ length: 4 }, () => ({
        tool: "Bash",
        input: { cmd: "test -f docs/x.md" },
      })),
    );

    const t5 = await detectAttemptLoop(wipDir, { threshold: 5 });
    expect(t5.detected).toBe(false);

    const t3 = await detectAttemptLoop(wipDir, { threshold: 3 });
    expect(t3.detected).toBe(true);
  });

  it("caps reported signatures at maxReported", async () => {
    // Six distinct hot signatures; ask for at most 2.
    const calls: Array<{ tool: string; input: Record<string, unknown> }> = [];
    for (let g = 0; g < 6; g++) {
      for (let i = 0; i < 5; i++) {
        calls.push({
          tool: "Bash",
          input: { cmd: `grep group${g} docs/file${g}.md` },
        });
      }
    }
    const wipDir = await makeWipDir(calls);

    const result = await detectAttemptLoop(wipDir, {
      threshold: 5,
      maxReported: 2,
    });
    expect(result.detected).toBe(true);
    expect(result.hotSignatures).toHaveLength(2);
  });
});

describe("augmentLearnMdWithLoopHint", () => {
  it("is a no-op when no loop was detected", async () => {
    const wipDir = await mkdtemp(join(tmpdir(), "loop-noop-"));
    await augmentLearnMdWithLoopHint(wipDir, {
      detected: false,
      hotSignatures: [],
      totalCalls: 0,
    });
    expect(existsSync(join(wipDir, "LEARN.md"))).toBe(false);
  });

  it("creates LEARN.md with the hint when no LEARN.md exists yet", async () => {
    const wipDir = await mkdtemp(join(tmpdir(), "loop-create-"));
    await augmentLearnMdWithLoopHint(wipDir, {
      detected: true,
      totalCalls: 30,
      hotSignatures: [{ tool: "Bash", summary: "grep|/foo/bar.md", count: 8 }],
    });

    const learn = await readFile(join(wipDir, "LEARN.md"), "utf-8");
    expect(learn).toContain("Loop hint");
    expect(learn).toContain("BUGGY_CHECK.md");
    // Pipe characters are backslash-escaped so they don't break the
    // markdown table column separator.
    expect(learn).toContain("grep\\|/foo/bar.md");
    expect(learn).toMatch(/\| 8 \| Bash \|/);
  });

  it("appends to existing LEARN.md without overwriting it", async () => {
    const wipDir = await mkdtemp(join(tmpdir(), "loop-append-"));
    await writeFile(join(wipDir, "LEARN.md"), "# original content\n");

    await augmentLearnMdWithLoopHint(wipDir, {
      detected: true,
      totalCalls: 10,
      hotSignatures: [{ tool: "Read", summary: "/foo.md", count: 5 }],
    });

    const learn = await readFile(join(wipDir, "LEARN.md"), "utf-8");
    expect(learn).toContain("# original content");
    expect(learn).toContain("Loop hint");
  });
});
