/**
 * Red — `converge clean` does not exist yet, so the subprocess errors out.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

let createdDirs: string[] = [];

describe("converge clean", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  afterEach(() => {
    for (const dir of createdDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    createdDirs = [];
  });

  it("clean --select removes journal subtree for matching task", () => {
    const taskJournal = join(
      FIXTURE,
      ".converge/journal/default/tasks/trivial-task",
    );
    mkdirSync(taskJournal, { recursive: true });
    createdDirs.push(taskJournal);
    writeFileSync(
      join(taskJournal, "checkpoint.json"),
      JSON.stringify({ status: "done" }),
    );

    expect(existsSync(taskJournal)).toBe(true);

    execFileSync("node", [CLI, "clean", "--select", "trivial-task"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(existsSync(taskJournal)).toBe(false);
  });

  it("clean --orphaned removes tasks not present in current playbook", () => {
    const orphanJournal = join(
      FIXTURE,
      ".converge/journal/default/tasks/ghost-task",
    );
    mkdirSync(orphanJournal, { recursive: true });
    createdDirs.push(orphanJournal);
    writeFileSync(
      join(orphanJournal, "checkpoint.json"),
      JSON.stringify({ status: "done" }),
    );

    expect(existsSync(orphanJournal)).toBe(true);

    const keptJournal = join(
      FIXTURE,
      ".converge/journal/default/tasks/trivial-task",
    );
    mkdirSync(keptJournal, { recursive: true });
    createdDirs.push(keptJournal);
    writeFileSync(
      join(keptJournal, "checkpoint.json"),
      JSON.stringify({ status: "done" }),
    );

    execFileSync("node", [CLI, "clean", "--orphaned"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(existsSync(orphanJournal)).toBe(false);
    expect(existsSync(keptJournal)).toBe(true);
  });
});
