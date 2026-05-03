/**
 * Check Seed Seeded Action
 * 
 * Skip Seed parent if already seeded.
 */

import type { ActionHandler } from "../../types.ts";

export const checkSeedSeeded: ActionHandler = async (snap) => {
  if (!snap.unit.seedFn) return { action: "continue" };

  const { existsSync, readFileSync, unlinkSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { getJournalStructure } = await import("../../../../journal/structure.ts");

  const structure = getJournalStructure(
    snap.projectDir,
    snap.epicId,
    snap.unit.id,
  );
  const seedJsonPath = join(structure.task!, "seed.json");

  if (!existsSync(seedJsonPath)) return { action: "continue" };

  try {
    const seedData = JSON.parse(readFileSync(seedJsonPath, "utf-8"));
    if (seedData.spawnCount > 0) {
      const subtasks: Array<{ id: string }> = seedData.subtasks ?? [];
      const anyChildExists =
        subtasks.length > 0 &&
        subtasks.some((t) =>
          existsSync(join(snap.unit.path, "tasks", t.id, "TASK.md")),
        );

      if (anyChildExists) {
        console.log(
          `\n✅ Pre-flight: Seed already seeded (${seedData.spawnCount} tasks) — skipping re-execution`,
        );
        return { action: "done", success: true, reason: "Seed already seeded" };
      }

      // Stale — children don't exist on disk
      unlinkSync(seedJsonPath);
      console.log(
        `\n⚠️  Pre-flight: seed.json claims ${seedData.spawnCount} tasks but none exist on disk — re-seeding`,
      );
    } else {
      unlinkSync(seedJsonPath);
      console.log(
        "\n⚠️  Pre-flight: seed.json exists but spawnCount=0 — deleting stale marker and re-executing",
      );
    }
  } catch {
    try {
      unlinkSync(seedJsonPath);
    } catch {
      /* ignore */
    }
    console.log(
      "\n⚠️  Pre-flight: seed.json corrupted — deleting and re-executing",
    );
  }

  return { action: "continue" };
};
