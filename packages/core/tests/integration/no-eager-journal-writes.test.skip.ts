/**
 * Invariant: neither `status` nor `run` may create journal dirs (or any file
 * under .converge/journal/) for tasks that have not actually been executed.
 *
 * These tests shell out to the built CLI because the journal-write discipline
 * lives across several modules (scanner → tree → runner → checkpoint manager
 * → journal writer) and only a full end-to-end invocation exercises it.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function plant(path: string, body: string) {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, body);
}

function listAllFiles(root: string): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else out.push(full);
    }
  }
  walk(root);
  return out.sort();
}

function runCli(args: string[], cwd: string): string {
  return execFileSync("node", [CLI, ...args], {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

let ROOT: string;

describe("no eager journal writes", () => {
  beforeAll(() => {
    // Skip if CLI hasn't been built — these tests require the built dist.
    const { existsSync } = require("node:fs");
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  beforeEach(() => {
    ROOT = join(
      tmpdir(),
      `converge-leak-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    rmSync(ROOT, { recursive: true, force: true });

    const pb = join(ROOT, ".converge/playbooks/default");
    plant(join(pb, "playbook.yml"), "name: default\n");
    plant(
      join(pb, "tasks/task-a/TASK.md"),
      "---\nid: task-a\ntitle: Task A\n---\n# Task A\n",
    );
    plant(
      join(pb, "tasks/task-b/TASK.md"),
      "---\nid: task-b\ntitle: Task B\n---\n# Task B\n",
    );
  });

  afterAll(() => {
    // Best-effort cleanup of any leftover test roots from prior failures
    // (per-test ROOT lives inside tmpdir so the OS will clean it anyway).
  });

  it("`status` on a fresh project writes nothing under .converge/journal/", () => {
    runCli(["status", "--dir", ROOT], REPO_ROOT);
    const journalFiles = listAllFiles(join(ROOT, ".converge/journal"));
    expect(journalFiles).toEqual([]);
  });

  it("`run --dry` on a fresh project writes nothing under .converge/journal/", () => {
    runCli(["run", "--dry", "--dir", ROOT], REPO_ROOT);
    const journalFiles = listAllFiles(join(ROOT, ".converge/journal"));
    expect(journalFiles).toEqual([]);
  });

  it("`run` with a filter that matches no task writes nothing under .converge/journal/", () => {
    runCli(
      ["run", "--dir", ROOT, "--max-duration=5000", "does-not-exist"],
      REPO_ROOT,
    );
    const journalFiles = listAllFiles(join(ROOT, ".converge/journal"));
    expect(journalFiles).toEqual([]);
  });

  it("`run` creates a journal dir for the executed task, NOT for pending tasks", () => {
    runCli(["run", "--dir", ROOT, "--max-duration=5000"], REPO_ROOT);

    const { existsSync } = require("node:fs");
    const journalRoot = join(ROOT, ".converge/journal/default/tasks");
    expect(existsSync(join(journalRoot, "task-a"))).toBe(true); // ran
    expect(existsSync(join(journalRoot, "task-b"))).toBe(false); // must not leak
  });

  it("`status` after a `run` is idempotent — no new files created", () => {
    runCli(["run", "--dir", ROOT, "--max-duration=5000"], REPO_ROOT);
    const before = listAllFiles(join(ROOT, ".converge"));
    runCli(["status", "--dir", ROOT], REPO_ROOT);
    const after = listAllFiles(join(ROOT, ".converge"));
    expect(after).toEqual(before);
  });
});
