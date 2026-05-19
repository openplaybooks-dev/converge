import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  diffFileHashes,
  PrecheckExitError,
  precheckRunState,
  type HashProvider,
  type PromptProvider,
} from "../packages/cli/src/run-precheck";

/**
 * Stub @clack/prompts with scripted return values. `selectReturn` may be
 * a string (normal selection) or a symbol (cancel sentinel).
 */
function stubPrompt(selectReturn: string | symbol = "resume"): {
  prompt: PromptProvider;
  selectCalls: Array<{ message: string; initialValue: string; options: any[] }>;
  cancelCalls: string[];
} {
  const selectCalls: Array<any> = [];
  const cancelCalls: string[] = [];
  const isCancelSym = Symbol("isCancel");
  const prompt: PromptProvider = {
    intro: () => {},
    log: { info: () => {} },
    cancel: (m: string) => {
      cancelCalls.push(m);
    },
    isCancel: (v: unknown) => v === isCancelSym,
    select: async (opts: any) => {
      selectCalls.push(opts);
      return selectReturn === "__cancel__" ? isCancelSym : selectReturn;
    },
  };
  return { prompt, selectCalls, cancelCalls };
}

/** Build a HashProvider with scripted return values. */
function stubHash(
  current: { hash: string; fileHashes?: Record<string, string> },
  snapshot: { fileHashes?: Record<string, string> } | null = null,
): HashProvider {
  return {
    calculate: async () => current,
    readSnapshot: async () => snapshot,
  };
}

async function setupProject(opts: {
  playbookName?: string;
  prevHash?: string | null; // null = runstate exists but has no playbook_hash; undefined = no runstate
  hashFileMissing?: boolean;
} = {}): Promise<{ projectDir: string; playbookDir: string; playbookName: string; cleanup: () => Promise<void> }> {
  const playbookName = opts.playbookName ?? "default";
  const projectDir = await mkdtemp(join(tmpdir(), "converge-precheck-unit-"));
  const playbookDir = join(projectDir, ".converge", "playbooks", playbookName);
  const journalDir = join(projectDir, ".converge", "journal", playbookName);
  await mkdir(playbookDir, { recursive: true });
  await mkdir(journalDir, { recursive: true });

  if (opts.prevHash !== undefined) {
    const meta: Record<string, unknown> = { execution_id: "run-test", status: "complete" };
    if (opts.prevHash !== null) meta.playbook_hash = opts.prevHash;
    await writeFile(
      join(journalDir, "runstate.json"),
      JSON.stringify({ metadata: meta, dag: { nodes: {}, edges: [], roots: [] } }, null, 2),
    );
  }

  if (!opts.hashFileMissing) {
    await writeFile(
      join(playbookDir, ".hash"),
      JSON.stringify({ hash: "snapshot", timestamp: "", files: [], fileHashes: { "TASK.md": "old-digest" } }),
    );
  }

  const cleanup = () => rm(projectDir, { recursive: true, force: true });
  return { projectDir, playbookDir, playbookName, cleanup };
}

describe("diffFileHashes", () => {
  it("returns empty diff when prev is undefined", () => {
    expect(diffFileHashes(undefined, { a: "1" })).toEqual({ added: [], removed: [], modified: [] });
  });

  it("detects added, removed, and modified files", () => {
    const prev = { keep: "x", change: "old", drop: "y" };
    const curr = { keep: "x", change: "new", add: "z" };
    expect(diffFileHashes(prev, curr)).toEqual({
      added: ["add"],
      removed: ["drop"],
      modified: ["change"],
    });
  });
});

describe("precheckRunState", () => {
  it("no-ops when no prior runstate exists", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject();
    try {
      const { prompt, selectCalls } = stubPrompt();
      const result = await precheckRunState({
        projectDir,
        playbookDir,
        playbookName,
        resume: false,
        fullRefresh: false,
        promptProvider: prompt,
        hashProvider: stubHash({ hash: "x", fileHashes: {} }),
        isTTY: true,
      });
      expect(result).toEqual({ resume: false, fullRefresh: false });
      expect(selectCalls).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it("bypasses prompt and returns resume when --resume passed", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({ prevHash: "abc" });
    try {
      const { prompt, selectCalls } = stubPrompt();
      const result = await precheckRunState({
        projectDir,
        playbookDir,
        playbookName,
        resume: true,
        fullRefresh: false,
        promptProvider: prompt,
        hashProvider: stubHash({ hash: "abc" }),
        isTTY: true,
      });
      expect(result).toEqual({ resume: true, fullRefresh: false });
      expect(selectCalls).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it("bypasses prompt and returns fullRefresh when --full-refresh passed", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({ prevHash: "abc" });
    try {
      const { prompt, selectCalls } = stubPrompt();
      const result = await precheckRunState({
        projectDir,
        playbookDir,
        playbookName,
        resume: false,
        fullRefresh: true,
        promptProvider: prompt,
        hashProvider: stubHash({ hash: "abc" }),
        isTTY: true,
      });
      expect(result).toEqual({ resume: false, fullRefresh: true });
      expect(selectCalls).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it("throws PrecheckExitError(2) when both --resume and --full-refresh passed", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({ prevHash: "abc" });
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      await expect(
        precheckRunState({
          projectDir,
          playbookDir,
          playbookName,
          resume: true,
          fullRefresh: true,
          promptProvider: stubPrompt().prompt,
          hashProvider: stubHash({ hash: "abc" }),
          isTTY: true,
        }),
      ).rejects.toMatchObject({ name: "PrecheckExitError", exitCode: 2 });
      expect(errSpy.mock.calls.flat().join("")).toMatch(/mutually exclusive/);
    } finally {
      errSpy.mockRestore();
      await cleanup();
    }
  });

  it("hash unchanged + TTY: prompts with initialValue=resume; scripted resume returns {resume:true}", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({ prevHash: "abc" });
    try {
      const { prompt, selectCalls } = stubPrompt("resume");
      const result = await precheckRunState({
        projectDir,
        playbookDir,
        playbookName,
        resume: false,
        fullRefresh: false,
        promptProvider: prompt,
        hashProvider: stubHash({ hash: "abc", fileHashes: { "TASK.md": "old-digest" } }, { fileHashes: { "TASK.md": "old-digest" } }),
        isTTY: true,
      });
      expect(result).toEqual({ resume: true, fullRefresh: false });
      expect(selectCalls).toHaveLength(1);
      expect(selectCalls[0].initialValue).toBe("resume");
    } finally {
      await cleanup();
    }
  });

  it("hash changed + TTY: prompts with initialValue=wipe; scripted wipe returns {fullRefresh:true}", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({ prevHash: "abc" });
    try {
      const { prompt, selectCalls } = stubPrompt("wipe");
      const result = await precheckRunState({
        projectDir,
        playbookDir,
        playbookName,
        resume: false,
        fullRefresh: false,
        promptProvider: prompt,
        hashProvider: stubHash(
          { hash: "different", fileHashes: { "TASK.md": "new-digest" } },
          { fileHashes: { "TASK.md": "old-digest" } },
        ),
        isTTY: true,
      });
      expect(result).toEqual({ resume: false, fullRefresh: true });
      expect(selectCalls).toHaveLength(1);
      expect(selectCalls[0].initialValue).toBe("wipe");
    } finally {
      await cleanup();
    }
  });

  it("user-selected abort throws PrecheckExitError(130)", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({ prevHash: "abc" });
    try {
      const { prompt, cancelCalls } = stubPrompt("abort");
      await expect(
        precheckRunState({
          projectDir,
          playbookDir,
          playbookName,
          resume: false,
          fullRefresh: false,
          promptProvider: prompt,
          hashProvider: stubHash({ hash: "different" }),
          isTTY: true,
        }),
      ).rejects.toBeInstanceOf(PrecheckExitError);
      expect(cancelCalls).toEqual(["Aborted by user."]);
    } finally {
      await cleanup();
    }
  });

  it("non-TTY + prior state throws PrecheckExitError(2) with remediation message", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({ prevHash: "abc" });
    const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      await expect(
        precheckRunState({
          projectDir,
          playbookDir,
          playbookName,
          resume: false,
          fullRefresh: false,
          promptProvider: stubPrompt().prompt,
          hashProvider: stubHash({ hash: "abc" }),
          isTTY: false,
        }),
      ).rejects.toMatchObject({ name: "PrecheckExitError", exitCode: 2 });
      const stderr = errSpy.mock.calls.flat().join("");
      expect(stderr).toMatch(/non-interactive/);
      expect(stderr).toMatch(/--resume/);
      expect(stderr).toMatch(/--full-refresh/);
    } finally {
      errSpy.mockRestore();
      await cleanup();
    }
  });

  it("legacy runstate (no playbook_hash field) is treated as changed → default wipe", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({ prevHash: null });
    try {
      const { prompt, selectCalls } = stubPrompt("wipe");
      const result = await precheckRunState({
        projectDir,
        playbookDir,
        playbookName,
        resume: false,
        fullRefresh: false,
        promptProvider: prompt,
        hashProvider: stubHash({ hash: "current" }),
        isTTY: true,
      });
      expect(result).toEqual({ resume: false, fullRefresh: true });
      expect(selectCalls[0].initialValue).toBe("wipe");
    } finally {
      await cleanup();
    }
  });

  it("missing .hash snapshot still compares rollups and prompts", async () => {
    const { projectDir, playbookDir, playbookName, cleanup } = await setupProject({
      prevHash: "abc",
      hashFileMissing: true,
    });
    try {
      const { prompt, selectCalls } = stubPrompt("wipe");
      const result = await precheckRunState({
        projectDir,
        playbookDir,
        playbookName,
        resume: false,
        fullRefresh: false,
        promptProvider: prompt,
        hashProvider: stubHash({ hash: "different" }, null),
        isTTY: true,
      });
      expect(result).toEqual({ resume: false, fullRefresh: true });
      expect(selectCalls).toHaveLength(1);
    } finally {
      await cleanup();
    }
  });
});
