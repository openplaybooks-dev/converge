/**
 * `converge doctor` — workspace health check.
 *
 * The doctor surface is the operator's lifeline after an autonomous run.
 * This suite covers the documented contracts:
 *
 *   - reports definition gaps from rejected TASK.md files
 *   - exits non-zero when findings exist, zero when clean
 *   - --json emits machine-readable summary
 *   - --fix touches rejected files (advances mtime) so the run-loop's
 *     mtime-keyed dedup re-emits the gap on the next tick, giving the
 *     repair AI another attempt
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function runDoctor(workspace: string, args: string[]) {
  const r = spawnSync("node", [CLI, "doctor", ...args], {
    cwd: workspace,
    encoding: "utf-8",
    timeout: 30_000,
    env: { ...process.env, CONVERGE_WORKSPACE: workspace },
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

function plantPlaybook(workspace: string, pb: string): void {
  const dir = join(workspace, ".converge/playbooks", pb);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "playbook.yml"),
    "name: " + pb + "\ndescription: test\ntasks: []\n",
    "utf-8",
  );
}

function plantRejected(workspace: string, pb: string, taskId: string): void {
  const dir = join(
    workspace,
    ".converge/inventory",
    pb,
    "spawned",
    taskId,
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "TASK.md.rejected"),
    "---\noutputs: bad | embedded pipe\n---\nbody",
    "utf-8",
  );
  writeFileSync(
    join(dir, "TASK.md.EVIDENCE.json"),
    JSON.stringify({
      kind: "definition",
      taskMdPath: join(dir, "TASK.md"),
      rejectedPath: join(dir, "TASK.md.rejected"),
      parseError: "frontmatter parse failed on line 2",
      detectedAt: new Date().toISOString(),
      taskId,
      expected: {
        format: "YAML frontmatter, then markdown body",
        requiredKeys: ["id"],
        listValuedKeys: ["outputs"],
      },
      actual: {
        firstBytes: "---\noutputs: bad | embedded pipe\n---",
        byteLength: 64,
      },
      suggestedFix: "quote the outputs string list",
    }),
    "utf-8",
  );
  // Anchor mtime in the past so --fix's `new Date()` clearly advances it.
  const past = new Date(Date.now() - 60_000);
  utimesSync(join(dir, "TASK.md.rejected"), past, past);
}

describe("converge doctor", () => {
  let workspace: string;
  const pb = "test-pb";

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-doctor-"));
    plantPlaybook(workspace, pb);
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("reports zero findings on a clean workspace (exit 0)", () => {
    const r = runDoctor(workspace, [`--playbook=${pb}`]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/no findings|healthy/i);
  });

  it("flags a definition gap and exits non-zero", () => {
    plantRejected(workspace, pb, "001-impl--04");
    const r = runDoctor(workspace, [`--playbook=${pb}`]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/definition gap/i);
    expect(r.stdout).toContain("001-impl--04");
    expect(r.stdout).toMatch(/parse failed/);
  });

  it("--json emits machine-readable summary with findings array", () => {
    plantRejected(workspace, pb, "002-impl--01");
    const r = runDoctor(workspace, [`--playbook=${pb}`, "--json"]);
    expect(r.status).toBe(1);
    const jsonStart = r.stdout.indexOf("{");
    expect(jsonStart).toBeGreaterThan(-1);
    const parsed = JSON.parse(r.stdout.slice(jsonStart));
    expect(parsed.totalFindings).toBe(1);
    expect(parsed.definitionGaps).toHaveLength(1);
    expect(parsed.definitionGaps[0].rejectedPath).toContain("002-impl--01");
    expect(parsed.fixed).toBe(false);
  });

  it("--fix touches rejected files so the run-loop dedup re-emits", () => {
    plantRejected(workspace, pb, "003-impl--07");
    const rejectedPath = join(
      workspace,
      ".converge/inventory",
      pb,
      "spawned/003-impl--07/TASK.md.rejected",
    );
    expect(existsSync(rejectedPath)).toBe(true);
    const mtimeBefore = statSync(rejectedPath).mtimeMs;

    const r = runDoctor(workspace, [`--playbook=${pb}`, "--fix"]);
    // --fix doesn't resolve definition gaps (that's the AI repair's job);
    // it advances mtime to re-arm the next loop tick. Findings remain.
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/touched by --fix/);

    const mtimeAfter = statSync(rejectedPath).mtimeMs;
    expect(mtimeAfter).toBeGreaterThan(mtimeBefore);
    // The forensic artifacts must stay on disk.
    expect(existsSync(rejectedPath)).toBe(true);
    expect(
      existsSync(
        join(
          workspace,
          ".converge/inventory",
          pb,
          "spawned/003-impl--07/TASK.md.EVIDENCE.json",
        ),
      ),
    ).toBe(true);
  });

  /* ----------------------------------------------------------------
   * Iter-23: malformed SKILL.md surfacing
   * ---------------------------------------------------------------- */

  it("flags malformed SKILL.md files and exits non-zero", () => {
    // Plant two broken SKILL.md directories under the playbook's skills/
    // tree. Both should land in `malformedSkills` with distinct reasons.
    const broken1Dir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/broken-no-fm",
    );
    mkdirSync(broken1Dir, { recursive: true });
    writeFileSync(
      join(broken1Dir, "SKILL.md"),
      "no frontmatter at all\n",
      "utf-8",
    );

    const broken2Dir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/broken-no-name",
    );
    mkdirSync(broken2Dir, { recursive: true });
    writeFileSync(
      join(broken2Dir, "SKILL.md"),
      "---\ndescription: missing name\n---\nbody\n",
      "utf-8",
    );

    const r = runDoctor(workspace, [`--playbook=${pb}`]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/malformed SKILL\.md/);
    expect(r.stdout).toContain("broken-no-fm");
    expect(r.stdout).toContain("broken-no-name");
    // Reason strings should be the specific ones from listPlaybookSkills.
    expect(r.stdout).toMatch(/missing YAML frontmatter block/);
    expect(r.stdout).toMatch(/frontmatter missing.*name/);
  });

  it("--json mode includes malformedSkills array", () => {
    const brokenDir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/json-test-broken",
    );
    mkdirSync(brokenDir, { recursive: true });
    writeFileSync(
      join(brokenDir, "SKILL.md"),
      "---\nname: json-test-broken\n---\nbody\n",
      "utf-8",
    );

    const r = runDoctor(workspace, [`--playbook=${pb}`, "--json"]);
    expect(r.status).toBe(1);
    const jsonStart = r.stdout.indexOf("{");
    const parsed = JSON.parse(r.stdout.slice(jsonStart));
    expect(parsed.malformedSkills).toBeDefined();
    expect(parsed.malformedSkills).toHaveLength(1);
    expect(parsed.malformedSkills[0].dir).toBe("json-test-broken");
    expect(parsed.malformedSkills[0].reason).toMatch(/missing.*description/i);
    expect(parsed.totalFindings).toBe(1);
  });

  it("valid SKILL.md files do not appear as findings", () => {
    const goodDir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/good-skill",
    );
    mkdirSync(goodDir, { recursive: true });
    writeFileSync(
      join(goodDir, "SKILL.md"),
      "---\nname: good-skill\ndescription: a working skill\n---\nbody\n",
      "utf-8",
    );

    const r = runDoctor(workspace, [`--playbook=${pb}`]);
    // No malformed skills, no other findings → exit 0
    expect(r.status).toBe(0);
    expect(r.stdout).not.toMatch(/malformed SKILL\.md/);
  });

  /* ----------------------------------------------------------------
   * Iter-24: footer splits fixable vs manual categories
   * ---------------------------------------------------------------- */

  it("footer lists manual-action category when only malformed SKILL.md present", () => {
    const brokenDir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/footer-test",
    );
    mkdirSync(brokenDir, { recursive: true });
    writeFileSync(
      join(brokenDir, "SKILL.md"),
      "---\ndescription: no name\n---\nx\n",
      "utf-8",
    );

    const r = runDoctor(workspace, [`--playbook=${pb}`]);
    expect(r.status).toBe(1);
    // Should NOT advertise "Run with --fix" when there are no fixable findings.
    expect(r.stdout).not.toMatch(/Run with --fix/);
    expect(r.stdout).toMatch(/Requires manual action.*malformed SKILL\.md/);
    // The in-section hint should also appear.
    expect(r.stdout).toMatch(/--fix does NOT touch SKILL\.md/);
  });

  it("footer enumerates fixable categories when present (definition gaps)", () => {
    plantRejected(workspace, pb, "footer-rejected");
    const r = runDoctor(workspace, [`--playbook=${pb}`]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(
      /Run with --fix to:.*touch rejected TASK\.md files/,
    );
    // No manual-action line when only fixable categories are present.
    expect(r.stdout).not.toMatch(/Requires manual action/);
  });

  it("--fix prints 'manual review still required' for non-fixable remaining findings", () => {
    plantRejected(workspace, pb, "mixed-rejected");
    const brokenDir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/mixed-broken",
    );
    mkdirSync(brokenDir, { recursive: true });
    writeFileSync(
      join(brokenDir, "SKILL.md"),
      "---\nname: mixed-broken\n---\nbody (no description)\n",
      "utf-8",
    );

    const r = runDoctor(workspace, [`--playbook=${pb}`, "--fix"]);
    expect(r.status).toBe(1);
    // --fix did its part (mtime touch on the rejected file) — but the
    // malformed skill remains and needs author intervention.
    expect(r.stdout).toMatch(
      /--fix complete\. Manual review still required for:.*malformed SKILL\.md/,
    );
  });
});
