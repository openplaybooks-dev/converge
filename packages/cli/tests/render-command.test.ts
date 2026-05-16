/**
 * `converge render` — strict template substitution.
 *
 * Verifies the documented contract:
 *   - `{{var}}` placeholders substitute literal values (no shell escaping);
 *   - missing variables throw exit 3 by default;
 *   - --allow-missing downgrades to a warning and uses "";
 *   - --var, --var-file, --env compose with documented precedence;
 *   - --out writes atomically (rename-after-write).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runRender(
  args: string[],
  env: Record<string, string> = {},
): CliResult {
  const r = spawnSync("node", [CLI, "render", ...args], {
    encoding: "utf-8",
    timeout: 15_000,
    env: { ...process.env, ...env },
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

describe("converge render", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "converge-render-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("substitutes a single variable into stdout", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "hello {{name}}", "utf-8");

    const r = runRender([tpl, "--var", "name=world"]);
    expect(r.status, r.stderr).toBe(0);
    // The CLI prints a banner line first; grep for the substituted text.
    expect(r.stdout).toContain("hello world");
  });

  it("preserves shell metacharacters verbatim (no escaping)", () => {
    // The exact corruption pattern that broke work-06: pipe + escaped
    // brackets + single quote in a value. The renderer must pass it through
    // byte-for-byte.
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "cmd: {{doneWhen}}\n", "utf-8");

    const value = "grep -qE 'orderbook|order_book' 'src/[id]/page.tsx'";
    const r = runRender([tpl, "--var", `doneWhen=${value}`]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain(`cmd: ${value}`);
  });

  it("exits 3 on missing variable in strict mode (default)", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "{{never_set}}", "utf-8");

    const r = runRender([tpl]);
    expect(r.status).toBe(3);
    expect(r.stderr).toMatch(/references unset variable/);
    expect(r.stderr).toMatch(/never_set/);
  });

  it("--allow-missing substitutes empty string and warns to stderr", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "[{{missing}}]", "utf-8");

    const r = runRender([tpl, "--allow-missing"]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("[]");
    expect(r.stderr).toMatch(/substituted "" for 1 unset/);
  });

  it("--var precedence: later --var overrides earlier", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "{{k}}", "utf-8");

    const r = runRender([tpl, "--var", "k=first", "--var", "k=second"]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("second");
  });

  it("--var-file loads KEY=VALUE pairs (with comments and blanks)", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "{{a}}-{{b}}", "utf-8");
    const env = join(dir, "vars.env");
    writeFileSync(
      env,
      [
        "# leading comment",
        "",
        "a=alpha",
        "export b=beta",
        "# trailing comment",
      ].join("\n"),
      "utf-8",
    );

    const r = runRender([tpl, "--var-file", env]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("alpha-beta");
  });

  it("--var overrides --var-file (CLI flags win)", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "{{k}}", "utf-8");
    const env = join(dir, "vars.env");
    writeFileSync(env, "k=from-file", "utf-8");

    const r = runRender([
      tpl,
      "--var-file",
      env,
      "--var",
      "k=from-flag",
    ]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("from-flag");
  });

  it("--env pulls vars from process.env", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "{{MY_TEST_VAR}}", "utf-8");

    const r = runRender([tpl, "--env"], { MY_TEST_VAR: "from-env" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("from-env");
  });

  it("--out writes atomically (tempfile then rename)", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "atomic: {{x}}", "utf-8");
    const out = join(dir, "nested", "out.txt");

    const r = runRender([tpl, "--var", "x=ok", "--out", out]);
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(out, "utf-8")).toBe("atomic: ok");
    // No leftover tempfile next to the target.
    const sibs = require("node:fs").readdirSync(join(dir, "nested"));
    expect(sibs.filter((s: string) => s.startsWith("out.txt.tmp"))).toHaveLength(0);
  });

  it("rejects malformed --var (no =)", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "x", "utf-8");

    const r = runRender([tpl, "--var", "novalue"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/KEY=VALUE/);
  });

  it("rejects malformed --var key (special chars)", () => {
    const tpl = join(dir, "x.tpl");
    writeFileSync(tpl, "x", "utf-8");

    const r = runRender([tpl, "--var", "bad-key$=v"]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/\[A-Za-z0-9_-\]\+/);
  });

  it("missing template path exits 2 with usage", () => {
    const r = runRender([]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/usage:/);
  });

  it("template file not found exits 2", () => {
    const r = runRender([join(dir, "no-such-file.tpl")]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/template not found/);
  });
});
