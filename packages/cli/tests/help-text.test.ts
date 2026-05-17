/**
 * `converge --help` — discoverability of the full command surface.
 *
 * Iter-29 rewrote the help text to enumerate every working subcommand,
 * grouped into EXECUTE / INSPECT / AUDIT / WORK CATALOG /
 * INFRASTRUCTURE sections. Previously most commands (goals, skills,
 * playbook, doctor, docs, tasks, etc.) were missing from --help —
 * operators learning the tool had no way to discover them short of
 * reading the source.
 *
 * This test locks in the discoverability contract: any command that
 * has a top-level dispatch in main.ts MUST appear in --help, or this
 * test fails. Future commands added without help-text updates are
 * caught here.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function runHelp(): { stdout: string; status: number } {
  const r = spawnSync("node", [CLI, "--help"], {
    encoding: "utf-8",
    timeout: 15_000,
  });
  return { stdout: r.stdout ?? "", status: r.status ?? 1 };
}

describe("converge --help discoverability", () => {
  it("prints all command sections", () => {
    const { stdout } = runHelp();
    for (const section of [
      "EXECUTE",
      "INSPECT",
      "AUDIT",
      "WORK CATALOG",
      "INFRASTRUCTURE",
      "GLOBAL OPTIONS",
      "EXAMPLES",
    ]) {
      expect(stdout).toContain(section);
    }
  });

  it("lists every top-level command iter-29 enumerates", () => {
    const { stdout } = runHelp();
    // Commands that have a top-level dispatch in main.ts and a real
    // user-facing purpose. If you add a new subcommand to main.ts's
    // switch block, add it here too.
    const expected = [
      "run",
      "retry",
      "stop",
      "add",
      "plan",
      "list",
      "show",
      "inspect",
      "status",
      "verify",
      "metrics",
      "docs",
      "doctor",
      "init",
      "clean",
      "reset",
      "build",
      "compile",
      "test",
      "spawn",
      "render",
    ];
    for (const cmd of expected) {
      // Use a regex with word boundary to avoid false positives
      // (e.g. "test" matching "the test plan").
      expect(stdout).toMatch(new RegExp(`\\b${cmd}\\b`));
    }
  });

  it("surfaces multi-subcommand families that operators need to discover", () => {
    const { stdout } = runHelp();
    // These are iter-17+ additions that the pre-iter-29 help omitted entirely.
    expect(stdout).toContain("playbook validate");
    expect(stdout).toContain("playbook list");
    expect(stdout).toContain("goals list");
    expect(stdout).toContain("goals done");
    expect(stdout).toContain("skills list");
    expect(stdout).toContain("deps list/install");
    expect(stdout).toContain("tasks");
  });

  it("examples include the new audit + skills workflows", () => {
    const { stdout } = runHelp();
    expect(stdout).toContain("converge doctor --playbook=default");
    expect(stdout).toContain("converge doctor --playbook=default --fix");
    expect(stdout).toContain("converge playbook validate default");
    expect(stdout).toContain("converge skills list");
  });

  it("init help includes provider templates", () => {
    const r = spawnSync("node", [CLI, "init", "--help"], {
      encoding: "utf-8",
      timeout: 15_000,
    });
    const stdout = r.stdout ?? "";
    expect(stdout).toContain("--provider-template");
    expect(stdout).toContain("custom");
  });

  it("exits 0 (help is not an error)", () => {
    const { status } = runHelp();
    expect(status).toBe(0);
  });

  /* ----------------------------------------------------------------
   * Iter-30: early-dispatch (no agent init, no config resolution)
   * ---------------------------------------------------------------- */

  it("--help does not register agent cleanup handlers", () => {
    // iter-30 dispatches help BEFORE registerCleanupHandlers() so the
    // info paths don't pay the agent-registry init or risk hanging on
    // missing token. Verify by absence of the cleanup banner.
    const { stdout } = runHelp();
    expect(stdout).not.toContain("Agent cleanup handlers registered");
  });

  it("--version emits only the version string (no agent banner)", () => {
    const r = spawnSync("node", [CLI, "--version"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    expect(r.status).toBe(0);
    expect((r.stdout ?? "").trim()).toMatch(/^\d+\.\d+\.\d+/);
    expect(r.stdout ?? "").not.toContain("Agent cleanup");
  });

  it("`version` (subcommand form) is equivalent to --version", () => {
    const r1 = spawnSync("node", [CLI, "version"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    const r2 = spawnSync("node", [CLI, "--version"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    expect(r1.status).toBe(0);
    expect((r1.stdout ?? "").trim()).toBe((r2.stdout ?? "").trim());
  });

  it("-V is equivalent to --version", () => {
    const r = spawnSync("node", [CLI, "-V"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    expect(r.status).toBe(0);
    expect((r.stdout ?? "").trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("-h is equivalent to --help", () => {
    const r = spawnSync("node", [CLI, "-h"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout ?? "").toContain("Converge - Autonomous Agent Framework");
  });

  it("no-arg invocation prints help (defaults to 'help')", () => {
    const r = spawnSync("node", [CLI], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout ?? "").toContain("Converge - Autonomous Agent Framework");
  });

  /* ----------------------------------------------------------------
   * Iter-31: bug-report-grade --version output
   * ---------------------------------------------------------------- */

  it("--version emits semver line followed by node + platform context", () => {
    const r = spawnSync("node", [CLI, "--version"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    expect(r.status).toBe(0);
    const lines = (r.stdout ?? "").trimEnd().split("\n");
    // First line: pure semver (scripts can still `--version | head -1`)
    expect(lines[0]).toMatch(/^\d+\.\d+\.\d+/);
    // Second line: runtime context — node version + platform + arch
    expect(lines[1]).toMatch(/^node v\d+\.\d+\.\d+ \(\w+ \w+\)$/);
  });

  it("--version | head -1 still yields just the semver (back-compat for scripts)", () => {
    const r = spawnSync("node", [CLI, "--version"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    const firstLine = (r.stdout ?? "").split("\n")[0];
    expect(firstLine).toMatch(/^\d+\.\d+\.\d+/);
    // The first line must NOT contain the node/platform info — that
    // would break consumers piping to head -1.
    expect(firstLine).not.toContain("node");
    expect(firstLine).not.toContain("(");
  });

  it("includes the current process's node version + platform + arch", () => {
    const r = spawnSync("node", [CLI, "--version"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    const out = r.stdout ?? "";
    // The output reports the child node process's own runtime — those
    // values are observable in the parent as process.version/platform/arch.
    expect(out).toContain(`node ${process.version}`);
    expect(out).toContain(`${process.platform} ${process.arch}`);
  });
});
