/**
 * Tests for built-in hook factories (gitCommitHook, prCreateHook).
 */

import { describe, it, expect, vi } from "vitest";
import {
  gitCommitHook,
  prCreateHook,
} from "../../src/hooks/builtins/git.ts";
import type { HookContext } from "../../src/hooks/hook-definition.ts";

function makeContext(overrides?: Partial<HookContext>): HookContext {
  return {
    taskId: "test-task",
    taskTitle: "Test Task",
    hookId: "test-hook",
    projectDir: "/tmp/test",
    shell: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 }),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    vars: {},
    ...overrides,
  };
}

describe("gitCommitHook", () => {
  it("should skip commit when tree is clean and skipClean is true", async () => {
    const shell = vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
    const ctx = makeContext({ shell });

    const hook = gitCommitHook({ skipClean: true });
    await hook(ctx);

    expect(shell).toHaveBeenCalledTimes(1);
    expect(shell).toHaveBeenCalledWith("git status --porcelain");
    expect(ctx.log.info).toHaveBeenCalledWith(
      expect.stringContaining("clean"),
    );
  });

  it("should commit when tree is dirty", async () => {
    const shell = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "M file.txt", stderr: "", exitCode: 0 }) // status
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 }) // add
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 }); // commit

    const ctx = makeContext({ shell });

    const hook = gitCommitHook({ skipClean: true });
    await hook(ctx);

    expect(shell).toHaveBeenCalledWith("git add -A");
    expect(ctx.log.info).toHaveBeenCalledWith(
      expect.stringContaining("Committed"),
    );
  });

  it("should use custom message template", async () => {
    const shell = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "M file.txt", stderr: "", exitCode: 0 }) // status
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 }) // add
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 }); // commit

    const ctx = makeContext({ shell });

    const hook = gitCommitHook({
      messageTemplate: "feat({taskId}): {taskTitle}",
    });
    await hook(ctx);

    // Verify the commit message includes the substituted values
    const commitCall = shell.mock.calls[2][0] as string;
    expect(commitCall).toContain("feat(test-task): Test Task");
  });

  it("should log error on commit failure", async () => {
    const shell = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "M file.txt", stderr: "", exitCode: 0 }) // status
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 }) // add
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "fatal: not a git repository",
        exitCode: 128,
      });

    const ctx = makeContext({ shell });

    const hook = gitCommitHook();
    await hook(ctx);

    expect(ctx.log.error).toHaveBeenCalled();
  });
});

describe("prCreateHook", () => {
  it("should create PR via gh CLI", async () => {
    const shell = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "/usr/bin/gh", stderr: "", exitCode: 0 }) // which gh
      .mockResolvedValueOnce({ stdout: "feature-branch\n", stderr: "", exitCode: 0 }) // branch
      .mockResolvedValueOnce({
        stdout: "https://github.com/org/repo/pull/1",
        stderr: "",
        exitCode: 0,
      });

    const ctx = makeContext({ shell });

    const hook = prCreateHook({ draft: true, labels: ["auto"] });
    await hook(ctx);

    const prCall = shell.mock.calls[2][0] as string;
    expect(prCall).toContain("gh pr create");
    expect(prCall).toContain("--draft");
    expect(prCall).toContain("--title");
    expect(prCall).toContain("--label");
  });

  it("should skip PR creation if gh CLI not found", async () => {
    const shell = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "", stderr: "not found", exitCode: 1 });

    const ctx = makeContext({ shell });

    const hook = prCreateHook();
    await hook(ctx);

    expect(shell).toHaveBeenCalledTimes(1); // only which gh
    expect(ctx.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("gh CLI not found"),
    );
  });

  it("should prevent duplicate PR creation", async () => {
    const shell = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "/usr/bin/gh", stderr: "", exitCode: 0 }) // which gh
      .mockResolvedValueOnce({ stdout: "branch\n", stderr: "", exitCode: 0 }) // branch
      .mockResolvedValueOnce({ stdout: "url", stderr: "", exitCode: 0 }); // pr create (success)

    const ctx = makeContext({ shell });

    const hook = prCreateHook();
    await hook(ctx); // first call — creates PR
    await hook(ctx); // second call — should skip

    // Second call should have been short-circuited
    expect(ctx.log.info).toHaveBeenCalledWith(
      expect.stringContaining("already created"),
    );
  });

  it("should apply template variables in title and body", async () => {
    const shell = vi
      .fn()
      .mockResolvedValueOnce({ stdout: "/usr/bin/gh", stderr: "", exitCode: 0 }) // which gh
      .mockResolvedValueOnce({ stdout: "feat/my-feature\n", stderr: "", exitCode: 0 }) // branch
      .mockResolvedValueOnce({ stdout: "url", stderr: "", exitCode: 0 }); // pr create

    const ctx = makeContext({ shell });

    const hook = prCreateHook({
      titleTemplate: "[{taskId}] Changes from {branchName}",
    });
    await hook(ctx);

    const prCall = shell.mock.calls[2][0] as string;
    expect(prCall).toContain("[test-task]");
    expect(prCall).toContain("feat/my-feature");
  });
});
