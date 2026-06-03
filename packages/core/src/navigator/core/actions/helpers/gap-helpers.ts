/**
 * Gap Helper Functions
 *
 * Utilities for grouping and processing gaps.
 */

import type { Gap } from "../../../../task/gap/types.ts";

/**
 * Group gaps by task ID
 */
export function groupGaps(gaps: readonly Gap[]): Map<string, Gap[]> {
  const groups = new Map<string, Gap[]>();
  for (const gap of gaps) {
    const key = (gap.metadata?.taskId as string) ?? gap.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(gap);
  }
  return groups;
}

/**
 * Pick a representative gap from a group
 */
export function pickRepresentative(group: Gap[]): Gap {
  const primary =
    group.find((g) => g.metadata?.gapKind === "output") ?? group[0];
  return {
    ...primary,
    metadata: {
      ...primary.metadata,
      allMissingItems: group.map((g) => g.description),
    },
  };
}
