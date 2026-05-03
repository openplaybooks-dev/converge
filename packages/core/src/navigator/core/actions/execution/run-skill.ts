/**
 * Run Skill Action
 *
 * Invoke declared skill(s) via SpawnRunner.
 * If unit.seedAfter is true, run Seed after skill(s) complete.
 */

import type { ActionHandler } from "../../types.ts";
import { autoInstallPackageSkill } from "../helpers/skill-installer.ts";

export const runSkill: ActionHandler = async (snap) => {
  const { existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { SpawnRunner } = await import("../../../../executor/spawn-runner.ts");
  const { writeTaskStatus } = await import("../../../../journal/writer.ts");
  const { getJournalStructure } = await import("../../../../journal/structure.ts");
  const { resolveSkill } = await import("../../../../task/unit/resolve.ts");
  const { resolveSkillPath, resolveSkillsRoot } =
    await import("../../../../config/skill-path-resolver.ts");
  const { SeedExecutor } = await import("../../../../executor/seed-executor.ts");

  const unit = snap.unit;
  const projectDir = snap.projectDir;
  const epicId = snap.epicId;
  const jCtx = { epicId, taskId: unit.id };
  const resolved = resolveSkill(unit);
  if (!resolved) return { action: "continue" };

  const skillNames = Array.isArray(resolved) ? resolved : [resolved];
  console.log(`\n🎯 Auto-invoking declared skill(s): ${skillNames.join(", ")}`);

  const structure = getJournalStructure(projectDir, jCtx.epicId, jCtx.taskId);
  const attemptNumber = process.env.CONVERGE_TASK_ATTEMPT || "wip";
  const logDir = structure.attempt
    ? join(structure.attempt, "logs")
    : join(structure.task!, "attempts", attemptNumber, "logs");

  const spawnRunner = new SpawnRunner(
    projectDir,
    jCtx,
    () => logDir,
    async (opts) => {
      await writeTaskStatus(projectDir, jCtx.epicId, jCtx.taskId, {
        taskId: jCtx.taskId,
        epicId: jCtx.epicId,
        focusPath: `${jCtx.epicId}/${jCtx.taskId}`,
        status: opts.status,
        startedAt: opts.startedAt,
        completedAt: opts.completedAt,
        attempt: 1,
        gapsResolved: 0,
        gapsFailed: 0,
        checklist: opts.checklist,
        error: opts.error,
      });
    },
    unit,
  );

  const state = {
    counter: 0,
    checklist: [] as any[],
    startedAt: new Date().toISOString(),
  };

  for (const name of skillNames) {
    // Resolve skill path using the new resolver (supports .skill/, .claude/skills/, .converge/skills/)
    const skillDir = resolveSkillPath(name, projectDir);

    if (!skillDir) {
      // Try to auto-install from package skills directory
      const installed = await autoInstallPackageSkill(name, projectDir);
      if (!installed) {
        console.warn(
          `   ⚠️  Skill not found: ${name} (searched in .skill/, .claude/skills/, .converge/skills/)`,
        );
        continue;
      }
      // Retry after auto-install
      continue;
    }

    const skillMdPath = join(skillDir, "SKILL.md");
    if (!existsSync(skillMdPath)) {
      console.warn(`   ⚠️  Skill file not found: ${skillMdPath}`);
      continue;
    }

    // Create relative path from projectDir for executeSpawnPath
    // spawn-runner expects path relative to projectDir
    const { relative } = await import("node:path");
    const relativeSkillPath = relative(projectDir, skillMdPath).replace(
      /\\/g,
      "/",
    );

    try {
      state.counter++;
      await spawnRunner.executeSpawnPath(relativeSkillPath, state);
    } catch (error: any) {
      console.error(`   ❌ Error executing skill ${name}: ${error.message}`);
    }
  }

  // Run Seed after skill execution if seedAfter flag is set
  if (unit.seedAfter && unit.seedFn) {
    console.log(`   [run-skill] Running Seed after skill (seedAfter=true)`);
    const seedExecutor = new SeedExecutor(projectDir, jCtx, unit.path, {
      id: unit.id,
      title: unit.title,
      vars: unit.vars,
    });
    try {
      const result = await seedExecutor.run(unit.seedFn, 1);
      if (result.error) {
        console.error(`   [run-skill] Seed after skill failed: ${result.error}`);
      } else {
        console.log(`   [run-skill] Seed after skill completed, spawned ${result.spawnCount} tasks`);
      }
    } catch (err: any) {
      console.error(`   [run-skill] Seed after skill error: ${err.message}`);
    }
  }

  return { action: "continue", executionCount: snap.executionCount + 1 };
};
