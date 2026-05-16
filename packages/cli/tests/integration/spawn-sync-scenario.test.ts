/**
 * Scenario: static tasks + body-driven `converge spawn task` → flat
 * `tasks.jsonl` inventory + DAG sync.
 *
 * 1. A playbook declares one static parent task with no AI body.
 * 2. The runner records the static task in `tasks.jsonl` on compile/run.
 * 3. We invoke `converge spawn task` in the parent's env context, simulating
 *    what a real task body's AI would do. The CLI writes the child's TASK.md
 *    under `.converge/inventory/<pb>/spawned/<id>/` and appends/upserts a row
 *    to `.converge/inventory/<pb>/tasks.jsonl`.
 * 4. `converge run --dry` proves the runner pulls the spawned row from
 *    `tasks.jsonl` into the live DAG via `syncLedgerToDag`.
 * 5. Throughout, `tasks.jsonl` is a flat inventory — one line per task id,
 *    last-write-wins, no event-log shape.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function readJsonl(path: string): any[] {
  return readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function runCli(
  workspace: string,
  args: string[],
  env: Record<string, string> = {},
): { stdout: string; stderr: string; status: number } {
  // Merge stderr into stdout via shell redirection so we capture both
  // success-path and error-path output. The CLI prints "DAG: N nodes" and
  // "Will run: ..." to stderr.
  const { spawnSync } = require("node:child_process") as typeof import("node:child_process");
  const result = spawnSync("node", [CLI, ...args], {
    cwd: workspace,
    encoding: "utf-8",
    timeout: 30_000,
    env: { ...process.env, ...env },
  });
  return {
    stdout: (result.stdout ?? "").toString(),
    stderr: (result.stderr ?? "").toString(),
    status: result.status ?? 1,
  };
}

describe("scenario: static tasks + cli-spawn + tasks.jsonl + DAG sync", () => {
  let workspace: string;
  const PLAYBOOK = "test-pb";
  const tasksJsonl = (): string =>
    join(workspace, ".converge", "inventory", PLAYBOOK, "tasks.jsonl");

  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-scenario-"));

    // Minimal playbook with one static parent task — no AI body needed,
    // because we bypass execution by driving spawn from the test directly.
    const playbookDir = join(workspace, ".converge", "playbooks", PLAYBOOK);
    const parentDir = join(playbookDir, "tasks", "parent");
    mkdirSync(parentDir, { recursive: true });

    writeFileSync(
      join(playbookDir, "playbook.yml"),
      `name: ${PLAYBOOK}\ndescription: Scenario fixture\ntasks:\n  - path: parent\n`,
      "utf-8",
    );

    writeFileSync(
      join(parentDir, "TASK.md"),
      "---\nid: parent\ntitle: Parent Task\n---\n\n# parent body\n",
      "utf-8",
    );

    // Scratch dir for spawn body files.
    mkdirSync(join(workspace, ".converge", "tmp"), { recursive: true });

    return () => rmSync(workspace, { recursive: true, force: true });
  });

  it("compiles, spawns a child, and the runner syncs both into the DAG", () => {
    // ── Arrange ────────────────────────────────────────────────────────
    // Compile so the static parent gets recorded in tasks.jsonl.
    const compile = runCli(workspace, ["compile", PLAYBOOK]);
    expect(compile.status, compile.stderr).toBe(0);

    // ── Assert 1: static parent row exists, flat inventory shape ──────
    // Note: `appendTaskUpsert` for static tasks runs inside `converge run`,
    // not `converge compile`. So we do a dry-run to populate the inventory
    // without executing any task body.
    const dryRun1 = runCli(workspace, ["run", PLAYBOOK, "--dry"]);
    expect(dryRun1.status, dryRun1.stderr).toBe(0);
    expect(existsSync(tasksJsonl())).toBe(true);

    const rowsAfterCompile = readJsonl(tasksJsonl());
    const parent = rowsAfterCompile.find((r) => r.id === "parent");
    expect(parent, "static parent should be inventoried").toBeDefined();
    expect(parent.source).toBe("static");
    expect(parent.taskPath).toBe(
      `.converge/journal/${PLAYBOOK}/tasks/parent`,
    );
    expect(parent.playbook).toBe(PLAYBOOK);
    expect(parent.event, "inventory rows have no `event:` field").toBeUndefined();

    // ── Act: simulate the parent body invoking `converge spawn task` ──
    // The env vars are exactly what the runner sets on entry to a task.
    const childBodyPath = join(workspace, ".converge", "tmp", "child.md");
    writeFileSync(
      childBodyPath,
      "---\nid: child-1\ntitle: Child 1\n---\n\n# child body\n",
      "utf-8",
    );

    const spawn = runCli(
      workspace,
      [
        "spawn",
        "task",
        "--id",
        "child-1",
        "--summary",
        "first spawned child",
        "--task-file",
        ".converge/tmp/child.md",
      ],
      {
        CONVERGE_WORKSPACE: workspace,
        CONVERGE_PLAYBOOK: PLAYBOOK,
        CONVERGE_CURRENT_TASK_PATH: `.converge/journal/${PLAYBOOK}/tasks/parent`,
      },
    );
    expect(spawn.status, spawn.stderr).toBe(0);
    expect(spawn.stdout).toContain("spawned: child-1");

    // ── Assert 2: inventory has both rows, flat shape ─────────────────
    const rowsAfterSpawn = readJsonl(tasksJsonl());
    expect(rowsAfterSpawn).toHaveLength(2);

    const ids = rowsAfterSpawn.map((r) => r.id).sort();
    expect(ids).toEqual(["child-1", "parent"]);

    const child = rowsAfterSpawn.find((r) => r.id === "child-1");
    expect(child.source).toBe("spawned");
    // Parent is stored as an id, not a full taskPath.
    expect(child.parent).toBe("parent");
    expect(child.status).toBe("todo");
    expect(child.taskPath).toBe(
      `.converge/inventory/${PLAYBOOK}/spawned/child-1/TASK.md`,
    );
    // Every row is an inventory record — no event-log lines anywhere.
    for (const r of rowsAfterSpawn) {
      expect(r.event).toBeUndefined();
      expect(typeof r.id).toBe("string");
      expect(typeof r.taskPath).toBe("string");
    }

    // CLI wrote the child's TASK.md into the inventory tree (not the journal).
    const childTaskMd = join(
      workspace,
      ".converge",
      "inventory",
      PLAYBOOK,
      "spawned",
      "child-1",
      "TASK.md",
    );
    expect(existsSync(childTaskMd)).toBe(true);
    expect(readFileSync(childTaskMd, "utf-8")).toContain("# child body");

    // ── Assert 3: runner syncs the spawned row into the live DAG ──────
    // A dry run is sufficient — it walks the DAG without executing tasks.
    const dryRun2 = runCli(workspace, ["run", PLAYBOOK, "--dry"]);
    expect(dryRun2.status, dryRun2.stderr).toBe(0);

    // The runner emits a "children-spawned" log line for any task it
    // discovers via syncLedgerToDag. The actual DAG inclusion is also
    // visible in the "Will run" summary the CLI prints.
    expect(dryRun2.stdout + dryRun2.stderr).toMatch(/child-1/);

    // ── Assert 4: re-spawning the same id is rejected, inventory stable
    const spawnDup = runCli(
      workspace,
      [
        "spawn",
        "task",
        "--id",
        "child-1",
        "--task-file",
        ".converge/tmp/child.md",
      ],
      {
        CONVERGE_WORKSPACE: workspace,
        CONVERGE_PLAYBOOK: PLAYBOOK,
      },
    );
    expect(spawnDup.status).toBe(2);
    expect(spawnDup.stderr).toMatch(/duplicate task id/);

    const rowsAfterDup = readJsonl(tasksJsonl());
    expect(rowsAfterDup).toHaveLength(2);
  });

  it("AI workflow: read tasks.jsonl, --dry to preview, --parent to target any task", () => {
    // Bootstrap inventory with the static parent.
    runCli(workspace, ["compile", PLAYBOOK]);
    runCli(workspace, ["run", PLAYBOOK, "--dry"]);

    const env = {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: PLAYBOOK,
      // No CONVERGE_CURRENT_TASK_PATH — AI is "outside any task" and must
      // explicitly pick a parent via --parent.
    };

    const bodyPath = join(workspace, ".converge", "tmp", "child.md");
    writeFileSync(bodyPath, "---\nid: c1\n---\n# inline\n", "utf-8");

    // Step 1: AI reads tasks.jsonl, finds an existing task it wants to extend.
    const inventory = readJsonl(tasksJsonl());
    const targetParent = inventory.find((r) => r.source === "static");
    expect(targetParent).toBeDefined();
    expect(targetParent.id).toBe("parent");

    // Step 2: AI dry-runs the spawn against that task's id to validate.
    const dry = runCli(
      workspace,
      [
        "spawn",
        "task",
        "--id",
        "previewed",
        "--summary",
        "preview before commit",
        "--task-file",
        ".converge/tmp/child.md",
        "--parent",
        targetParent.id,
        "--dry",
      ],
      env,
    );
    expect(dry.status, dry.stderr).toBe(0);
    const jsonStart = dry.stdout.indexOf("{");
    expect(jsonStart).toBeGreaterThan(-1);
    const preview = JSON.parse(dry.stdout.slice(jsonStart));
    expect(preview.dry).toBe(true);
    // Spawn stores parent as an id (not a full taskPath).
    expect(preview.wouldUpsert.parent).toBe(targetParent.id);

    // Dry-run did not mutate state.
    expect(readJsonl(tasksJsonl()).find((r) => r.id === "previewed")).toBeUndefined();
    expect(
      existsSync(
        join(
          workspace,
          ".converge",
          "inventory",
          PLAYBOOK,
          "spawned",
          "previewed",
          "TASK.md",
        ),
      ),
    ).toBe(false);

    // Step 3: AI commits the real spawn against the chosen parent.
    const real = runCli(
      workspace,
      [
        "spawn",
        "task",
        "--id",
        "previewed",
        "--task-file",
        ".converge/tmp/child.md",
        "--parent",
        targetParent.id,
      ],
      env,
    );
    expect(real.status, real.stderr).toBe(0);

    const after = readJsonl(tasksJsonl());
    const committed = after.find((r) => r.id === "previewed");
    expect(committed).toBeDefined();
    expect(committed.parent).toBe(targetParent.id);
    expect(committed.source).toBe("spawned");
  });

  it("upserts in place: spawning N distinct ids yields N rows, never duplicates", () => {
    // Bootstrap inventory with the static parent.
    runCli(workspace, ["compile", PLAYBOOK]);
    runCli(workspace, ["run", PLAYBOOK, "--dry"]);

    const env = {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: PLAYBOOK,
      CONVERGE_CURRENT_TASK_PATH: `.converge/journal/${PLAYBOOK}/tasks/parent`,
    };

    const bodyPath = join(workspace, ".converge", "tmp", "child.md");
    writeFileSync(bodyPath, "body", "utf-8");

    for (const id of ["alpha", "beta", "gamma", "delta"]) {
      const r = runCli(
        workspace,
        ["spawn", "task", "--id", id, "--task-file", ".converge/tmp/child.md"],
        env,
      );
      expect(r.status, r.stderr).toBe(0);
    }

    const rows = readJsonl(tasksJsonl());
    // 4 spawned + 1 static parent
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r) => r.id))).toEqual(
      new Set(["parent", "alpha", "beta", "gamma", "delta"]),
    );
    // Spawned children all reference the static parent (by id).
    for (const id of ["alpha", "beta", "gamma", "delta"]) {
      const r = rows.find((r) => r.id === id);
      expect(r.source).toBe("spawned");
      expect(r.parent).toBe("parent");
    }
  });
});
