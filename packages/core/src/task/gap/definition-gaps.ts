/**
 * Definition Gaps — TASK.md frontmatter failed to parse.
 *
 * When the spawn-time gate or `parseTaskMd` rejects a TASK.md, evidence is
 * written to `<taskmd>.rejected` and `<taskmd>.EVIDENCE.json`. This module
 * scans the inventory and journal for those evidence artifacts and emits
 * `definition` gaps the navigator can route through self-repair.
 *
 * mtime gating: a definition gap is treated as permanent until the rejected
 * TASK.md's mtime changes. Without this, the navigator would re-attempt
 * repair on every loop tick on the same corrupted file — burning budget
 * with no chance of progress.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Gap } from "./types.ts";
import { GapKind } from "./types.ts";
import { createGap } from "./utils.ts";

export interface DefinitionEvidence {
  kind: "definition";
  taskMdPath: string;
  rejectedPath: string;
  parseError: string;
  detectedAt: string;
  taskId?: string;
  expected: {
    format: string;
    requiredKeys: string[];
    listValuedKeys: string[];
  };
  actual: {
    firstBytes: string;
    byteLength: number;
  };
  suggestedFix: string;
}

export interface DefinitionGapDetection {
  gap: Gap;
  evidence: DefinitionEvidence;
  rejectedMtimeMs: number;
}

/**
 * Read an EVIDENCE.json file from disk. Returns null if absent or unreadable.
 */
export function readDefinitionEvidence(
  evidencePath: string,
): DefinitionEvidence | null {
  try {
    if (!existsSync(evidencePath)) return null;
    const raw = readFileSync(evidencePath, "utf8");
    const parsed = JSON.parse(raw) as DefinitionEvidence;
    if (parsed.kind !== "definition") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Build a Gap from a definition-evidence record.
 *
 * The gap's metadata carries everything the AI repair strategy needs to
 * emit a corrected TASK.md: the rejected bytes, the parser error, the
 * expected contract, and the suggested fix template.
 */
export function evidenceToGap(
  evidence: DefinitionEvidence,
  rejectedMtimeMs: number,
): Gap {
  const taskId =
    evidence.taskId ??
    // Derive from path: .../spawned/<id>/TASK.md
    evidence.taskMdPath.split("/").slice(-2, -1)[0] ??
    "unknown";

  return createGap({
    type: "structural",
    level: "task",
    scope: taskId,
    severity: "high",
    description: `[${taskId}] TASK.md frontmatter is unparseable: ${evidence.parseError}`,
    checks: [],
    source: "definition-gap-detector",
    suggestedFix: evidence.suggestedFix,
    metadata: {
      gapKind: GapKind.definition,
      taskMdPath: evidence.taskMdPath,
      rejectedPath: evidence.rejectedPath,
      evidencePath: `${evidence.taskMdPath}.EVIDENCE.json`,
      parseError: evidence.parseError,
      // mtime-gating fingerprint: callers compare this against the rejected
      // file's current mtime to decide whether a retry is warranted.
      rejectedMtimeMs,
      expectedFormat: evidence.expected.format,
      requiredKeys: evidence.expected.requiredKeys,
      listValuedKeys: evidence.expected.listValuedKeys,
      actualFirstBytes: evidence.actual.firstBytes,
      taskId,
    },
  });
}

/**
 * Scan the inventory for rejected TASK.md files with EVIDENCE.json siblings
 * and emit one `definition` gap per finding.
 *
 * Looks under:
 *   <workspace>/.converge/inventory/<playbook>/spawned/*&#47;TASK.md.rejected
 *   <workspace>/.converge/journal/<playbook>/tasks/*&#47;TASK.md.rejected
 *
 * Each finding is mtime-gated by attaching `rejectedMtimeMs` to the gap.
 * Callers that re-detect the same gap can compare against this fingerprint
 * to skip repair attempts on files that haven't changed.
 */
export async function findDefinitionGaps(
  workspace: string,
  playbook: string,
): Promise<DefinitionGapDetection[]> {
  const results: DefinitionGapDetection[] = [];

  const roots = [
    join(workspace, ".converge", "inventory", playbook, "spawned"),
    join(workspace, ".converge", "journal", playbook, "tasks"),
  ];

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
      const rejected = join(taskDir, "TASK.md.rejected");
      const evidencePath = join(taskDir, "TASK.md.EVIDENCE.json");
      if (!existsSync(rejected) || !existsSync(evidencePath)) continue;
      const evidence = readDefinitionEvidence(evidencePath);
      if (!evidence) continue;
      let mtimeMs = 0;
      try {
        mtimeMs = statSync(rejected).mtimeMs;
      } catch {}
      results.push({
        gap: evidenceToGap(evidence, mtimeMs),
        evidence,
        rejectedMtimeMs: mtimeMs,
      });
    }
  }

  return results;
}

/**
 * mtime-gating predicate: should we retry repair on a definition gap?
 *
 * The gap was originally detected when the rejected file had mtime
 * `gap.metadata.rejectedMtimeMs`. If the file's current mtime matches,
 * nothing has changed since last attempt → skip. If it differs (file was
 * edited, presumably by the repair strategy), retry is warranted.
 *
 * If the file no longer exists at all, treat as resolved.
 */
export function definitionGapShouldRetry(gap: Gap): boolean {
  const rejectedPath = gap.metadata?.rejectedPath as string | undefined;
  const storedMtimeMs = gap.metadata?.rejectedMtimeMs as number | undefined;
  if (!rejectedPath || storedMtimeMs === undefined) return true;
  if (!existsSync(rejectedPath)) return false;
  try {
    const currentMtimeMs = statSync(rejectedPath).mtimeMs;
    return currentMtimeMs !== storedMtimeMs;
  } catch {
    return true;
  }
}
