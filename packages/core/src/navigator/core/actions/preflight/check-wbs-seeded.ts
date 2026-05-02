/**
 * Check WBS Seeded Action
 * 
 * Skip WBS parent if already seeded.
 */

import type { ActionHandler } from "../../types.ts";

export const checkWbsSeeded: ActionHandler = async (snap) => {
  if (!snap.unit.seedFn) return { action: "continue" };

  const { existsSync, readFileSync, unlinkSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { getJournalStructure } = await import("../../../../journal/structure.ts");

  const structure = getJournalStructure(
    snap.projectDir,
    snap.epicId,
    snap.unit.id,
  );
  const wbsJsonPath = join(structure.task!, "wbs.json");

  if (!existsSync(wbsJsonPath)) return { action: "continue" };

  try {
    const wbsData = JSON.parse(readFileSync(wbsJsonPath, "utf-8"));
    if (wbsData.spawnCount > 0) {
      const subtasks: Array<{ id: string }> = wbsData.subtasks ?? [];
      const anyChildExists =
        subtasks.length > 0 &&
        subtasks.some((t) =>
          existsSync(join(snap.unit.path, "tasks", t.id, "TASK.md")),
        );

      if (anyChildExists) {
        console.log(
          `\n✅ Pre-flight: WBS already seeded (${wbsData.spawnCount} tasks) — skipping re-execution`,
        );
        return { action: "done", success: true, reason: "WBS already seeded" };
      }

      // Stale — children don't exist on disk
      unlinkSync(wbsJsonPath);
      console.log(
        `\n⚠️  Pre-flight: wbs.json claims ${wbsData.spawnCount} tasks but none exist on disk — re-seeding`,
      );
    } else {
      unlinkSync(wbsJsonPath);
      console.log(
        "\n⚠️  Pre-flight: wbs.json exists but spawnCount=0 — deleting stale marker and re-executing",
      );
    }
  } catch {
    try {
      unlinkSync(wbsJsonPath);
    } catch {
      /* ignore */
    }
    console.log(
      "\n⚠️  Pre-flight: wbs.json corrupted — deleting and re-executing",
    );
  }

  return { action: "continue" };
};
