/**
 * Definition-gap surfacing — verifies that rejected TASK.md siblings under
 * `.converge/inventory/<pb>/spawned/` and `.converge/journal/<pb>/tasks/`
 * are detected by `findDefinitionGaps()` with the metadata the run-loop
 * surfacing layer needs:
 *
 *   - taskId derived from the spawned task directory name
 *   - parseError quoted from the EVIDENCE.json
 *   - rejectedMtimeMs populated so callers can mtime-gate retries
 *
 * Also confirms the mtime-keyed dedup property: the function returns the
 * same fingerprint for unchanged files, so a caller that hashes
 * `<rejectedPath>@<mtimeMs>` will not double-report.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { findDefinitionGaps } from "../../src/task/gap/definition-gaps.ts";

const PLAYBOOK = "default";

function plantRejected(
  workspace: string,
  area: "inventory/spawned" | "journal/tasks",
  taskId: string,
  parseError = "YAML parse failed at line 7",
): void {
  const taskDir =
    area === "inventory/spawned"
      ? join(workspace, ".converge", "inventory", PLAYBOOK, "spawned", taskId)
      : join(workspace, ".converge", "journal", PLAYBOOK, "tasks", taskId);
  mkdirSync(taskDir, { recursive: true });
  writeFileSync(
    join(taskDir, "TASK.md.rejected"),
    "---\noutputs: bad value | embedded pipe\n---\nbody",
    "utf-8",
  );
  writeFileSync(
    join(taskDir, "TASK.md.EVIDENCE.json"),
    JSON.stringify({
      kind: "definition",
      taskMdPath: join(taskDir, "TASK.md"),
      rejectedPath: join(taskDir, "TASK.md.rejected"),
      parseError,
      detectedAt: new Date().toISOString(),
      taskId,
      expected: {
        format: "YAML frontmatter, then markdown body",
        requiredKeys: ["id"],
        listValuedKeys: ["outputs", "inputs", "depends_on"],
      },
      actual: {
        firstBytes: "---\noutputs: bad value | embedded pipe\n---",
        byteLength: 64,
      },
      suggestedFix:
        "Quote the outputs value as a string list, e.g. outputs:\\n  - file.txt",
    }),
    "utf-8",
  );
}

describe("definition-gap surfacing", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-defgap-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("detects rejected TASK.md under inventory/spawned and journal/tasks", async () => {
    plantRejected(workspace, "inventory/spawned", "001-impl--04");
    plantRejected(workspace, "journal/tasks", "002-impl--07");

    const findings = await findDefinitionGaps(workspace, PLAYBOOK);

    expect(findings.length).toBe(2);
    const taskIds = findings.map((f) => f.gap.metadata?.taskId).sort();
    expect(taskIds).toEqual(["001-impl--04", "002-impl--07"]);
    for (const f of findings) {
      expect(f.gap.metadata?.gapKind).toBe("definition");
      expect(f.gap.metadata?.parseError).toMatch(/YAML/);
      expect(f.rejectedMtimeMs).toBeGreaterThan(0);
    }
  });

  it("returns nothing when no rejected files are present", async () => {
    const findings = await findDefinitionGaps(workspace, PLAYBOOK);
    expect(findings).toEqual([]);
  });

  it("mtime fingerprint stable for unchanged files (dedup-friendly)", async () => {
    plantRejected(workspace, "inventory/spawned", "003-impl--01");
    const first = await findDefinitionGaps(workspace, PLAYBOOK);
    expect(first.length).toBe(1);
    const mtime1 = first[0].rejectedMtimeMs;

    // Re-detect without touching the file.
    const second = await findDefinitionGaps(workspace, PLAYBOOK);
    expect(second.length).toBe(1);
    expect(second[0].rejectedMtimeMs).toBe(mtime1);

    // Touch the file → mtime advances → dedup key would differ.
    const newTime = new Date(Date.now() + 1000);
    utimesSync(
      join(
        workspace,
        ".converge/inventory",
        PLAYBOOK,
        "spawned/003-impl--01/TASK.md.rejected",
      ),
      newTime,
      newTime,
    );
    const third = await findDefinitionGaps(workspace, PLAYBOOK);
    expect(third.length).toBe(1);
    expect(third[0].rejectedMtimeMs).not.toBe(mtime1);
  });

  it("skips task dirs missing the EVIDENCE.json sibling", async () => {
    // Plant only the .rejected file, no evidence.
    const taskDir = join(
      workspace,
      ".converge/inventory",
      PLAYBOOK,
      "spawned/004-orphan",
    );
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, "TASK.md.rejected"), "bad content", "utf-8");

    const findings = await findDefinitionGaps(workspace, PLAYBOOK);
    expect(findings).toEqual([]);
  });
});
