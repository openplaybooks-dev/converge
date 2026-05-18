/**
 * Red — `converge clean` does not exist yet, so the subprocess errors out.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

let createdDirs: string[] = [];
let createdFiles: string[] = [];

describe("converge clean", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  afterEach(() => {
    for (const file of createdFiles) {
      rmSync(file, { force: true });
    }
    createdFiles = [];
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

  it("clean --select resets runstate-backed spawned tasks", () => {
    const journalRoot = join(FIXTURE, ".converge/journal/default");
    const parentJournal = join(journalRoot, "tasks/seed/spawned/epoch-001");
    const childJournal = join(
      journalRoot,
      "tasks/seed/spawned/epoch-001/spawned/epoch-001-verify",
    );
    mkdirSync(childJournal, { recursive: true });
    mkdirSync(join(parentJournal, "attempts/01"), { recursive: true });
    writeFileSync(join(parentJournal, "TASK.md"), "# Epoch 001\n");
    createdDirs.push(parentJournal);

    const runStatePath = join(journalRoot, "runstate.json");
    createdFiles.push(runStatePath);
    writeFileSync(
      runStatePath,
      JSON.stringify(
        {
          metadata: { status: "error", completed_at: "2026-01-01T00:00:00.000Z" },
          dag: {
            nodes: {
              "epoch-001": {
                id: "epoch-001",
                status: "error",
                duration_ms: 123,
                completed_at: "2026-01-01T00:00:00.000Z",
                error_message: "boom",
                depends_on: [],
                depended_on_by: ["epoch-001-verify"],
                tags: [],
                seed: null,
                journal_path:
                  ".converge/journal/default/tasks/seed/spawned/epoch-001",
              },
              "epoch-001-verify": {
                id: "epoch-001-verify",
                status: "pass",
                duration_ms: 456,
                completed_at: "2026-01-01T00:00:00.000Z",
                depends_on: ["epoch-001"],
                depended_on_by: [],
                tags: [],
                seed: null,
                journal_path:
                  ".converge/journal/default/tasks/seed/spawned/epoch-001/spawned/epoch-001-verify",
              },
            },
          },
        },
        null,
        2,
      ),
    );

    expect(existsSync(parentJournal)).toBe(true);

    execFileSync("node", [CLI, "clean", "--select", "epoch-001+"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(existsSync(parentJournal)).toBe(true);
    expect(existsSync(join(parentJournal, "TASK.md"))).toBe(true);
    expect(existsSync(join(parentJournal, "attempts"))).toBe(false);
    const runState = JSON.parse(readFileSync(runStatePath, "utf-8"));
    expect(runState.metadata.status).toBe("running");
    expect(runState.metadata.completed_at).toBeUndefined();
    expect(runState.dag.nodes["epoch-001"].status).toBe("pending");
    expect(runState.dag.nodes["epoch-001"].error_message).toBeUndefined();
    expect(runState.dag.nodes["epoch-001-verify"].status).toBe("pending");
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
