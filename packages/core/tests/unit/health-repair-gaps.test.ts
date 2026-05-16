/**
 * Health-repair gap surfacing — verifies the post-completion repair
 * pipeline picks up `HEALTH_REPAIR.json` sidecars dropped by the
 * `taskCompletionHealthCheck` hook.
 *
 * What's under test:
 *   - findHealthRepairGaps scans the journal/tasks tree
 *   - severity escalates to the highest individual issue's severity
 *   - mtime fingerprint exposed for dedup-friendly polling
 *   - malformed/missing sidecars are skipped (no throw)
 *   - gapKind routes through check-failed so SkillBasedRepairStrategy
 *     handles it via its existing fan-out
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

import {
  evidenceToHealthRepairGap,
  findHealthRepairGaps,
  readHealthRepairEvidence,
  type HealthRepairEvidence,
} from "../../src/task/gap/health-repair-gaps.ts";
import { GapKind } from "../../src/task/gap/types.ts";

const PLAYBOOK = "default";

function plantSidecar(
  workspace: string,
  taskId: string,
  issues: HealthRepairEvidence["issues"],
  confidence: HealthRepairEvidence["confidence"] = "high",
): string {
  const taskDir = join(
    workspace,
    ".converge",
    "journal",
    PLAYBOOK,
    "tasks",
    taskId,
  );
  mkdirSync(taskDir, { recursive: true });
  const sidecarPath = join(taskDir, "HEALTH_REPAIR.json");
  writeFileSync(
    sidecarPath,
    JSON.stringify({
      kind: "health-repair",
      taskId,
      epicId: PLAYBOOK,
      taskTitle: `Task ${taskId}`,
      detectedAt: new Date().toISOString(),
      issues,
      confidence,
    } satisfies HealthRepairEvidence),
    "utf-8",
  );
  return sidecarPath;
}

describe("health-repair gap surfacing", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-healthrepair-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("detects sidecars and emits gaps with check-failed routing", async () => {
    plantSidecar(workspace, "001-impl--01", [
      {
        type: "output-mismatch",
        severity: "high",
        description: "Output file is empty but task claimed success",
        suggestedFix: "Re-run with verbose logging",
      },
    ]);
    plantSidecar(workspace, "002-impl--03", [
      {
        type: "suspicious-warning",
        severity: "medium",
        description: "Deprecation warning in log tail",
        suggestedFix: "Update the lib reference",
      },
    ]);

    const findings = await findHealthRepairGaps(workspace, PLAYBOOK);

    expect(findings.length).toBe(2);
    const ids = findings.map((f) => f.evidence.taskId).sort();
    expect(ids).toEqual(["001-impl--01", "002-impl--03"]);
    for (const f of findings) {
      expect(f.gap.metadata?.gapKind).toBe(GapKind.checkFailed);
      expect(f.gap.metadata?.healthRepair).toBe(true);
      expect(f.sidecarMtimeMs).toBeGreaterThan(0);
    }
  });

  it("escalates gap severity to the worst individual issue", async () => {
    plantSidecar(workspace, "003-impl--09", [
      {
        type: "deprecated-format",
        severity: "low",
        description: "Cosmetic warning",
        suggestedFix: "Ignore",
      },
      {
        type: "output-mismatch",
        severity: "critical",
        description: "Wrong file content",
        suggestedFix: "Regenerate",
      },
      {
        type: "tool-change",
        severity: "medium",
        description: "Tool emitted unexpected stderr",
        suggestedFix: "Re-pin version",
      },
    ]);

    const findings = await findHealthRepairGaps(workspace, PLAYBOOK);
    expect(findings.length).toBe(1);
    expect(findings[0].gap.severity).toBe("critical");
    expect(findings[0].gap.metadata?.issueCount).toBe(3);
  });

  it("returns nothing on a clean workspace", async () => {
    const findings = await findHealthRepairGaps(workspace, PLAYBOOK);
    expect(findings).toEqual([]);
  });

  it("skips sidecars with malformed JSON or wrong kind", async () => {
    const taskDir = join(
      workspace,
      ".converge/journal",
      PLAYBOOK,
      "tasks/004-bad",
    );
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, "HEALTH_REPAIR.json"), "not-json", "utf-8");

    const taskDir2 = join(
      workspace,
      ".converge/journal",
      PLAYBOOK,
      "tasks/005-wrong-kind",
    );
    mkdirSync(taskDir2, { recursive: true });
    writeFileSync(
      join(taskDir2, "HEALTH_REPAIR.json"),
      JSON.stringify({ kind: "something-else", issues: [] }),
      "utf-8",
    );

    const findings = await findHealthRepairGaps(workspace, PLAYBOOK);
    expect(findings).toEqual([]);
  });

  it("skips sidecars with empty issues array (nothing to repair)", async () => {
    plantSidecar(workspace, "006-empty", []);
    const findings = await findHealthRepairGaps(workspace, PLAYBOOK);
    expect(findings).toEqual([]);
  });

  it("mtime fingerprint advances on touch (enables dedup-by-mtime)", async () => {
    const path = plantSidecar(workspace, "007-touch", [
      {
        type: "tool-change",
        severity: "high",
        description: "x",
        suggestedFix: "y",
      },
    ]);

    const first = await findHealthRepairGaps(workspace, PLAYBOOK);
    expect(first.length).toBe(1);
    const mtime1 = first[0].sidecarMtimeMs;

    const newTime = new Date(Date.now() + 1000);
    utimesSync(path, newTime, newTime);

    const second = await findHealthRepairGaps(workspace, PLAYBOOK);
    expect(second.length).toBe(1);
    expect(second[0].sidecarMtimeMs).not.toBe(mtime1);
  });

  it("readHealthRepairEvidence round-trips evidence written to disk", async () => {
    const path = plantSidecar(workspace, "008-roundtrip", [
      {
        type: "output-mismatch",
        severity: "medium",
        description: "x",
        suggestedFix: "y",
      },
    ]);
    const parsed = readHealthRepairEvidence(path);
    expect(parsed).not.toBeNull();
    expect(parsed!.taskId).toBe("008-roundtrip");
    expect(parsed!.issues).toHaveLength(1);
    expect(parsed!.confidence).toBe("high");
  });

  it("evidenceToHealthRepairGap propagates suggestedFix from each issue", () => {
    const ev: HealthRepairEvidence = {
      kind: "health-repair",
      taskId: "009-suggested-fix",
      epicId: PLAYBOOK,
      detectedAt: new Date().toISOString(),
      issues: [
        {
          type: "tool-change",
          severity: "high",
          description: "tool changed",
          suggestedFix: "fix-1",
        },
        {
          type: "output-mismatch",
          severity: "medium",
          description: "output wrong",
          suggestedFix: "fix-2",
        },
      ],
      confidence: "medium",
    };
    const gap = evidenceToHealthRepairGap(ev, 1000, "/tmp/sidecar.json");
    expect(gap.suggestedFix).toContain("fix-1");
    expect(gap.suggestedFix).toContain("fix-2");
    expect(gap.severity).toBe("high");
    expect(gap.metadata?.sidecarPath).toBe("/tmp/sidecar.json");
  });
});
