/**
 * Vitest spec for `converge goals` subcommands. Runs against a temp fixture
 * playbook with three goals (a, b, c — b depends on a, c depends on b) so
 * we can exercise list/next/pending/done/undone end-to-end.
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

/** Find the first JSON value (object or array) in a CLI's stdout, skipping
 *  banner lines like "✅ Agent cleanup handlers registered". */
function parseJson(stdout: string): any {
  const start = Math.min(
    ...["{", "["]
      .map((c) => stdout.indexOf(c))
      .filter((i) => i >= 0),
  );
  return JSON.parse(stdout.slice(start));
}

describe("converge goals", () => {
  let workspace: string;
  const PB = "g-pb";

  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-goals-"));
    const pbDir = join(workspace, ".converge", "playbooks", PB);
    mkdirSync(pbDir, { recursive: true });
    // Three goals: a (no deps), b (depends on a), c (depends on b).
    // a's check passes (`true`), b's check fails (`false`).
    writeFileSync(
      join(pbDir, "playbook.yml"),
      [
        `name: ${PB}`,
        "description: fixture",
        "tasks:",
        "  - path: build",
        "goals:",
        "  - id: a",
        "    description: First goal",
        "    checks:",
        "      - id: a-passes",
        "        cmd: true",
        "  - id: b",
        "    description: Second goal",
        "    depends_on: [a]",
        "    checks:",
        "      - id: b-fails",
        "        cmd: false",
        "  - id: c",
        "    description: Third goal",
        "    depends_on: [b]",
        "    checks:",
        "      - id: c-passes",
        "        cmd: true",
        "",
      ].join("\n"),
      "utf-8",
    );
    // Build task with the bare minimum to make the playbook compile.
    const buildDir = join(pbDir, "tasks", "build");
    mkdirSync(buildDir, { recursive: true });
    writeFileSync(
      join(buildDir, "TASK.md"),
      "---\nid: build\ntitle: Build\n---\n\nNoop.\n",
      "utf-8",
    );

    return () => rmSync(workspace, { recursive: true, force: true });
  });

  const env = () => ({
    CONVERGE_WORKSPACE: workspace,
    CONVERGE_PLAYBOOK: PB,
  });

  it("list returns three goals, all done:false initially", () => {
    const r = runCli(workspace, ["goals", "list"], env());
    expect(r.status, r.stderr).toBe(0);
    const goals = parseJson(r.stdout);
    expect(goals).toHaveLength(3);
    expect(goals.map((g: any) => g.id)).toEqual(["a", "b", "c"]);
    expect(goals.every((g: any) => g.done === false)).toBe(true);
  });

  it("next returns goal 'a' (topological first)", () => {
    const r = runCli(workspace, ["goals", "next"], env());
    expect(r.status).toBe(0);
    const g = parseJson(r.stdout);
    expect(g.id).toBe("a");
  });

  it("pending returns all three before any sentinels", () => {
    const r = runCli(workspace, ["goals", "pending"], env());
    expect(r.status).toBe(0);
    const pending = parseJson(r.stdout);
    expect(pending.map((g: any) => g.id)).toEqual(["a", "b", "c"]);
  });

  it("done writes the sentinel when re-validation passes", () => {
    const r = runCli(workspace, ["goals", "done", "a"], env());
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/marked done: a/);
    expect(
      existsSync(
        join(workspace, ".converge", "inventory", PB, "goals", "a.done"),
      ),
    ).toBe(true);

    // Now `next` should return b.
    const r2 = runCli(workspace, ["goals", "next"], env());
    expect(parseJson(r2.stdout).id).toBe("b");
  });

  it("done refuses to write the sentinel when re-validation fails", () => {
    const r = runCli(workspace, ["goals", "done", "b"], env());
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/failed re-validation/);
    expect(r.stderr).toMatch(/b-fails/);
    expect(
      existsSync(
        join(workspace, ".converge", "inventory", PB, "goals", "b.done"),
      ),
    ).toBe(false);
  });

  it("done --force is blocked without CONVERGE_ALLOW_FORCE_DONE", () => {
    // --force bypasses re-validation. To prevent autonomous-run misuse it
    // requires explicit opt-in via env var. Default behavior is to refuse.
    const r = runCli(workspace, ["goals", "done", "b", "--force"], env());
    expect(r.status).toBe(4);
    expect(r.stderr).toMatch(/CONVERGE_ALLOW_FORCE_DONE/);
    expect(
      existsSync(
        join(workspace, ".converge", "inventory", PB, "goals", "b.done"),
      ),
    ).toBe(false);
  });

  it("done --force writes the sentinel when CONVERGE_ALLOW_FORCE_DONE=1", () => {
    const r = runCli(workspace, ["goals", "done", "b", "--force"], {
      ...env(),
      CONVERGE_ALLOW_FORCE_DONE: "1",
    });
    expect(r.status, r.stderr).toBe(0);
    expect(
      existsSync(
        join(workspace, ".converge", "inventory", PB, "goals", "b.done"),
      ),
    ).toBe(true);
  });

  it("undone removes the sentinel", () => {
    runCli(workspace, ["goals", "done", "a"], env());
    const r = runCli(workspace, ["goals", "undone", "a"], env());
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/removed sentinel: a/);
    expect(
      existsSync(
        join(workspace, ".converge", "inventory", PB, "goals", "a.done"),
      ),
    ).toBe(false);
  });

  it("next returns {done:true} after every goal has a sentinel", () => {
    // --force on all three so the test doesn't run re-validation (which costs
    // a sub-second `bash -lc true` per check and can push vitest's 5s timeout).
    // Opt into --force via the autonomous-run safety env var.
    const forceEnv = { ...env(), CONVERGE_ALLOW_FORCE_DONE: "1" };
    runCli(workspace, ["goals", "done", "a", "--force"], forceEnv);
    runCli(workspace, ["goals", "done", "b", "--force"], forceEnv);
    runCli(workspace, ["goals", "done", "c", "--force"], forceEnv);
    const r = runCli(workspace, ["goals", "next"], env());
    expect(parseJson(r.stdout)).toEqual({ done: true });
  }, 15_000);

  it("done rejects unknown goal ids", () => {
    const r = runCli(workspace, ["goals", "done", "no-such-goal"], env());
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/unknown goal id/);
  });
});
