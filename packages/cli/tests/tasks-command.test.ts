/**
 * Vitest spec for `converge tasks` subcommands. Drives a temp inventory
 * by appending rows via the existing `appendTaskUpsert` / `appendTaskStatus`
 * writers from the core ledger.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

interface CliResult {
  stdout: string;
  stderr: string;
  status: number;
}

function runCli(
  cwd: string,
  args: string[],
  env: Record<string, string> = {},
): CliResult {
  const result = spawnSync("node", [CLI, ...args], {
    cwd,
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

function parseJson(stdout: string): any {
  const candidates = ["{", "["]
    .map((c) => stdout.indexOf(c))
    .filter((i) => i >= 0);
  const start = Math.min(...candidates);
  return JSON.parse(stdout.slice(start));
}

/** Write a tasks.jsonl inventory file by hand. */
function writeInventory(workspace: string, pb: string, rows: any[]): void {
  const dir = join(workspace, ".converge", "inventory", pb);
  mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const lines = rows.map((r) =>
    JSON.stringify({
      taskPath: `.converge/journal/${pb}/tasks/${r.id}`,
      id: r.id,
      goalId: r.goalId ?? "inventory",
      summary: r.summary ?? r.id,
      status: r.status ?? "todo",
      source: r.source ?? "spawned",
      playbook: pb,
      createdAt: now,
      updatedAt: now,
    }),
  );
  writeFileSync(join(dir, "tasks.jsonl"), lines.join("\n") + "\n", "utf-8");
}

describe("converge tasks", () => {
  let workspace: string;
  const PB = "t-pb";

  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-tasks-"));
    return () => rmSync(workspace, { recursive: true, force: true });
  });

  const env = () => ({
    CONVERGE_WORKSPACE: workspace,
    CONVERGE_PLAYBOOK: PB,
  });

  it("list returns every row when no filter is given", () => {
    writeInventory(workspace, PB, [
      { id: "build", source: "static", status: "doing" },
      { id: "sprint-001", source: "spawned", status: "todo" },
      { id: "sprint-001-plan", source: "spawned", status: "done" },
    ]);
    const r = runCli(workspace, ["tasks", "list"], env());
    expect(r.status, r.stderr).toBe(0);
    const rows = parseJson(r.stdout);
    expect(rows).toHaveLength(3);
  });

  it("list filters by --source", () => {
    writeInventory(workspace, PB, [
      { id: "build", source: "static", status: "doing" },
      { id: "sprint-001", source: "spawned", status: "todo" },
      { id: "sprint-002", source: "spawned", status: "done" },
    ]);
    const r = runCli(
      workspace,
      ["tasks", "list", "--source", "spawned"],
      env(),
    );
    const rows = parseJson(r.stdout);
    expect(rows.map((r: any) => r.id).sort()).toEqual([
      "sprint-001",
      "sprint-002",
    ]);
  });

  it("list filters by --status", () => {
    writeInventory(workspace, PB, [
      { id: "a", source: "spawned", status: "done" },
      { id: "b", source: "spawned", status: "todo" },
      { id: "c", source: "spawned", status: "done" },
    ]);
    const r = runCli(
      workspace,
      ["tasks", "list", "--status", "done"],
      env(),
    );
    const rows = parseJson(r.stdout);
    expect(rows.map((r: any) => r.id).sort()).toEqual(["a", "c"]);
  });

  it("status returns the row's status, or 'missing'", () => {
    writeInventory(workspace, PB, [{ id: "x", status: "doing" }]);
    expect(runCli(workspace, ["tasks", "status", "x"], env()).stdout.trim().split("\n").at(-1))
      .toBe("doing");
    expect(
      runCli(workspace, ["tasks", "status", "no-such"], env()).stdout
        .trim()
        .split("\n")
        .at(-1),
    ).toBe("missing");
  });

  it("wait returns 0 immediately when task is already done", () => {
    writeInventory(workspace, PB, [{ id: "ready", status: "done" }]);
    const r = runCli(
      workspace,
      ["tasks", "wait", "ready", "--timeout", "5", "--interval", "1"],
      env(),
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/ready -> done/);
  });

  it("wait returns 1 when task ends dropped/blocked", () => {
    writeInventory(workspace, PB, [{ id: "broken", status: "blocked" }]);
    const r = runCli(
      workspace,
      ["tasks", "wait", "broken", "--timeout", "5", "--interval", "1"],
      env(),
    );
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/broken -> blocked/);
  });

  it("wait times out (exit 2) when status never reaches terminal", () => {
    writeInventory(workspace, PB, [{ id: "pending", status: "doing" }]);
    const r = runCli(
      workspace,
      ["tasks", "wait", "pending", "--timeout", "2", "--interval", "1"],
      env(),
    );
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/timed out/);
  });

  it("wait-many returns 0 when every id is done", () => {
    writeInventory(workspace, PB, [
      { id: "a", status: "done" },
      { id: "b", status: "done" },
    ]);
    const idsFile = join(workspace, "ids.json");
    writeFileSync(idsFile, JSON.stringify(["a", "b"]), "utf-8");
    const r = runCli(
      workspace,
      [
        "tasks",
        "wait-many",
        "--ids-file",
        "ids.json",
        "--timeout",
        "5",
        "--interval",
        "1",
      ],
      env(),
    );
    expect(r.status, r.stderr).toBe(0);
  });

  it("mark updates a task's status", () => {
    writeInventory(workspace, PB, [{ id: "alpha", status: "doing" }]);
    const r = runCli(
      workspace,
      ["tasks", "mark", "alpha", "--status", "done"],
      env(),
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/alpha -> done/);

    const after = runCli(workspace, ["tasks", "status", "alpha"], env());
    expect(after.stdout.trim().split("\n").at(-1)).toBe("done");
  });

  it("mark rejects invalid statuses", () => {
    writeInventory(workspace, PB, [{ id: "alpha", status: "doing" }]);
    const r = runCli(
      workspace,
      ["tasks", "mark", "alpha", "--status", "bogus"],
      env(),
    );
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/invalid status/);
  });

});
