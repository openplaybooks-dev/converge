/**
 * Health-Repair Gaps — surface AI-detected post-completion anomalies into
 * the repair pipeline.
 *
 * The `taskCompletionHealthCheck` hook (navigator/repair/health-checks.ts)
 * asks the model to audit a just-completed task for issues. When the model
 * returns `shouldTriggerRepair: true`, the hook can't reach the navigator
 * directly (it runs as a post-completion event with no repair-pipeline
 * handle). The hook writes a `HEALTH_REPAIR.json` sidecar next to the
 * task's journal entry; this module scans for those sidecars and emits a
 * `check-failed` gap per finding so SkillBasedRepairStrategy picks it up
 * on the next run-loop tick.
 *
 * mtime-keyed dedup parallels definition-gaps: a sidecar is reported once
 * per (path, mtime) pair. After AI repair touches/removes the file, the
 * next tick re-checks naturally.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Gap } from "./types.ts";
import { GapKind } from "./types.ts";
import { createGap } from "./utils.ts";

export interface HealthRepairIssue {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  suggestedFix: string;
}

export interface HealthRepairEvidence {
  kind: "health-repair";
  taskId: string;
  epicId: string;
  taskTitle?: string;
  detectedAt: string;
  issues: HealthRepairIssue[];
  confidence: "high" | "medium" | "low";
}

export interface HealthRepairGapDetection {
  gap: Gap;
  evidence: HealthRepairEvidence;
  sidecarMtimeMs: number;
}

export function readHealthRepairEvidence(
  evidencePath: string,
): HealthRepairEvidence | null {
  try {
    if (!existsSync(evidencePath)) return null;
    const raw = readFileSync(evidencePath, "utf8");
    const parsed = JSON.parse(raw) as HealthRepairEvidence;
    if (parsed.kind !== "health-repair") return null;
    if (!Array.isArray(parsed.issues) || parsed.issues.length === 0)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Build a Gap from health-repair evidence. The gap's metadata carries the
 * full issue list (description + suggestedFix), severity, and confidence
 * so the repair strategy can prioritize.
 */
export function evidenceToHealthRepairGap(
  evidence: HealthRepairEvidence,
  sidecarMtimeMs: number,
  sidecarPath: string,
): Gap {
  // Highest individual issue severity wins for the gap as a whole.
  const sevRank: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  let topSev: "critical" | "high" | "medium" | "low" = "low";
  for (const i of evidence.issues) {
    if ((sevRank[i.severity] ?? 0) > (sevRank[topSev] ?? 0)) {
      topSev = i.severity;
    }
  }

  const summary = evidence.issues
    .map((i) => `[${i.severity}] ${i.description}`)
    .join(" | ");

  return createGap({
    type: "quality",
    level: "task",
    scope: evidence.taskId,
    severity: topSev,
    description: `[${evidence.taskId}] post-completion anomaly: ${summary.slice(0, 240)}`,
    checks: [],
    source: "health-repair-detector",
    suggestedFix: evidence.issues.map((i) => i.suggestedFix).join("\n"),
    metadata: {
      // Use GapKind.checkFailed so the existing SkillBasedRepairStrategy
      // (gapKinds: check-failed, output, corrupted, blocker, input, ...)
      // picks this up via its existing routing. The health-repair source
      // distinguishes it for diagnostic surfaces.
      gapKind: GapKind.checkFailed,
      healthRepair: true,
      taskId: evidence.taskId,
      epicId: evidence.epicId,
      taskTitle: evidence.taskTitle,
      sidecarPath,
      sidecarMtimeMs,
      confidence: evidence.confidence,
      issueCount: evidence.issues.length,
      issues: evidence.issues,
    },
  });
}

/**
 * Scan the journal for `HEALTH_REPAIR.json` sidecars.
 *
 * Looks under: `<workspace>/.converge/journal/<playbook>/tasks/* /HEALTH_REPAIR.json`
 *
 * The hook writes the sidecar at
 *   `<workspace>/.converge/journal/<epicId>/tasks/<taskId>/HEALTH_REPAIR.json`
 *
 * For most playbooks `epicId === playbook` ("default"), so the scan rooted
 * at `journal/<playbook>` finds them. Other layouts require an explicit
 * `epicRoots` override.
 */
export async function findHealthRepairGaps(
  workspace: string,
  playbook: string,
): Promise<HealthRepairGapDetection[]> {
  const results: HealthRepairGapDetection[] = [];
  const roots = [join(workspace, ".converge", "journal", playbook, "tasks")];

  for (const root of roots) {
    if (!existsSync(root)) continue;
    let entries: string[];
    try {
      entries = await readdir(root);
    } catch {
      continue;
    }
    for (const name of entries) {
      const taskDir = join(root, name);
      try {
        if (!(await stat(taskDir)).isDirectory()) continue;
      } catch {
        continue;
      }
      const sidecar = join(taskDir, "HEALTH_REPAIR.json");
      if (!existsSync(sidecar)) continue;
      const evidence = readHealthRepairEvidence(sidecar);
      if (!evidence) continue;
      let mtimeMs = 0;
      try {
        mtimeMs = statSync(sidecar).mtimeMs;
      } catch {}
      results.push({
        gap: evidenceToHealthRepairGap(evidence, mtimeMs, sidecar),
        evidence,
        sidecarMtimeMs: mtimeMs,
      });
    }
  }

  return results;
}
