/**
 * `converge docs` — generate browsable HTML for a playbook.
 *
 * Verifies the documented contract:
 *   - discovers every TASK.md under .converge/playbooks/<pb>/
 *   - parses frontmatter, captures body verbatim
 *   - emits a single self-contained HTML file
 *   - --json emits a machine-readable summary
 *   - parse errors don't kill the whole render — they're collected
 *     and reported, the rest of the playbook still renders
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
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

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function runDocs(
  workspace: string,
  args: string[],
): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const r = spawnSync("node", [CLI, "docs", ...args], {
    cwd: workspace,
    encoding: "utf-8",
    timeout: 30_000,
    // Hermetic: the CLI falls back to INIT_CWD/PWD when cwd has no project
    // indicators (pnpm support) — strip them so the temp workspace wins.
    env: {
      ...process.env,
      CONVERGE_WORKSPACE: workspace,
      INIT_CWD: undefined,
      PWD: workspace,
    },
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

function plant(dir: string, file: string, content: string): void {
  const full = join(dir, file);
  mkdirSync(full.substring(0, full.lastIndexOf("/")), { recursive: true });
  writeFileSync(full, content, "utf-8");
}

describe("converge docs", () => {
  let workspace: string;
  const pb = "test-pb";

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-docs-"));
    plant(
      workspace,
      `.converge/playbooks/${pb}/playbook.yml`,
      "name: test-pb\ndescription: test fixture\ntasks: []\n",
    );
    plant(
      workspace,
      `.converge/playbooks/${pb}/tasks/001-setup/TASK.md`,
      [
        "---",
        "id: 001-setup",
        "title: Setup",
        "description: Configure the project",
        "outputs:",
        "  - package.json",
        "---",
        "## Steps",
        "",
        "1. npm init",
      ].join("\n"),
    );
    plant(
      workspace,
      // RFC 0034: `depends_on` is banned from TASK.md frontmatter — sibling
      // tasks auto-chain alphabetically (001-setup → 002-build).
      `.converge/playbooks/${pb}/tasks/002-build/TASK.md`,
      [
        "---",
        "id: 002-build",
        "title: Build",
        "outputs:",
        "  - dist/index.js",
        "checks:",
        "  - id: builds",
        "    cmd: test -f dist/index.js",
        "---",
        "Build the project.",
      ].join("\n"),
    );
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("emits HTML covering every task with frontmatter rendered", () => {
    const r = runDocs(workspace, [`--playbook=${pb}`]);
    expect(r.status, r.stderr).toBe(0);
    const outPath = join(workspace, ".converge", "docs", `${pb}.html`);
    expect(existsSync(outPath)).toBe(true);
    const html = readFileSync(outPath, "utf-8");
    // Both tasks appear by id.
    expect(html).toContain("001-setup");
    expect(html).toContain("002-build");
    // RFC 0034: TASK.md carries no depends_on — the "Depends on" field
    // renders the explicit-frontmatter view, which is empty.
    expect(html).toMatch(/Depends on/);
    expect(html).toContain("(none)");
    // Frontmatter outputs are listed.
    expect(html).toContain("package.json");
    expect(html).toContain("dist/index.js");
    // Body content is present.
    expect(html).toContain("npm init");
    // Self-contained: no external CSS or JS references.
    expect(html).not.toMatch(/<link.*href="http/);
    expect(html).not.toMatch(/<script.*src="http/);
  });

  it("--out writes to a custom path", () => {
    const custom = join(workspace, "site", "index.html");
    const r = runDocs(workspace, [`--playbook=${pb}`, "--out", custom]);
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(custom)).toBe(true);
  });

  it("--json emits machine-readable summary", () => {
    const r = runDocs(workspace, [`--playbook=${pb}`, "--json"]);
    expect(r.status, r.stderr).toBe(0);
    // Banner line "✅ Agent cleanup handlers registered" prefixes the
    // CLI output; locate the JSON block.
    const jsonStart = r.stdout.indexOf("{");
    expect(jsonStart).toBeGreaterThan(-1);
    const parsed = JSON.parse(r.stdout.slice(jsonStart));
    expect(parsed.playbook).toBe(pb);
    expect(parsed.taskCount).toBe(2);
    expect(parsed.errorCount).toBe(0);
    expect(parsed.tasks.map((t: { id: string }) => t.id).sort()).toEqual([
      "001-setup",
      "002-build",
    ]);
  });

  it("malformed TASK.md is reported, doesn't kill the whole render", () => {
    plant(
      workspace,
      `.converge/playbooks/${pb}/tasks/003-broken/TASK.md`,
      "no frontmatter at all",
    );
    const r = runDocs(workspace, [`--playbook=${pb}`]);
    // Still exits 0 — partial docs are better than no docs.
    expect(r.status, r.stderr).toBe(0);
    // Stderr names the offending file.
    expect(r.stderr + r.stdout).toMatch(/003-broken/);
    // The two good tasks still rendered.
    const html = readFileSync(
      join(workspace, ".converge", "docs", `${pb}.html`),
      "utf-8",
    );
    expect(html).toContain("001-setup");
    expect(html).toContain("002-build");
  });

  it("missing playbook directory fails fast with a clear error", () => {
    const r = runDocs(workspace, ["--playbook=nonexistent-pb"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/playbook not found/);
  });

  it("missing --playbook flag prints a clear error and does not emit docs", () => {
    // Use an empty workspace so playbook auto-detection finds nothing.
    const empty = mkdtempSync(join(tmpdir(), "converge-docs-empty-"));
    try {
      const r = spawnSync("node", [CLI, "docs"], {
        cwd: empty,
        encoding: "utf-8",
        timeout: 15_000,
        // Hermetic: strip INIT_CWD/PWD or the CLI resolves the pnpm
        // invocation root instead of this (deliberately empty) workspace.
        env: {
          ...process.env,
          CONVERGE_WORKSPACE: empty,
          INIT_CWD: undefined,
          PWD: empty,
        },
      });
      // Exit code can be 0 or non-zero depending on shutdown handler
      // behavior; the contract is "no docs emitted, error on stderr".
      expect(r.stderr).toMatch(/--playbook is required|playbook not found/);
      expect(existsSync(join(empty, ".converge", "docs"))).toBe(false);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
