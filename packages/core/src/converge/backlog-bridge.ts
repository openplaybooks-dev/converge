/**
 * Backlog → Gap Bridge
 *
 * Converts BacklogItem[] into Gap[] so the convergence loop processes them.
 * Every tsc error, eslint violation, and grep TODO becomes a weighted gap.
 *
 * Before:  BacklogDef → backlog-runner → BacklogItem[] → backlogs.jsonl (dead end)
 * After:   BacklogDef → backlog-runner → BacklogItem[] → backlogItemToGap → Gap[] → convergence loop
 */

import type { Gap } from "../task/gap/types.ts";
import type { BacklogItem, BacklogDef } from "../backlog/types.ts";
import { runBacklogs } from "../backlog/backlog-runner.ts";

/**
 * Convert a single BacklogItem into a Gap.
 */
export function backlogItemToGap(item: BacklogItem, taskId: string): Gap {
  return {
    id: `backlog-${item.backlogId}-${item.file ?? "unknown"}-${item.line ?? 0}`,
    type: "quality",
    level: "task",
    scope: taskId,
    description: `[${item.backlogId}] ${item.raw}`,
    detected: item.collectedAt,
    resolved: false,
    checks: [item.backlogId],
    severity:
      item.severity === "high"
        ? "high"
        : item.severity === "medium"
          ? "medium"
          : "low",
    metadata: {
      gapKind: "backlog",
      backlogId: item.backlogId,
      backlogSeverity: item.severity,
      file: item.file,
      line: item.line,
    },
  };
}

/**
 * Run backlog definitions and return gaps.
 * This is the bridge: backlogs → gaps.
 */
export function collectBacklogGaps(
  backlogs: BacklogDef[],
  projectDir: string,
  taskId: string,
): Gap[] {
  if (!backlogs || backlogs.length === 0) return [];

  const items = runBacklogs(backlogs, projectDir);
  return items.map((item) => backlogItemToGap(item, taskId));
}
