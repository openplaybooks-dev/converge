/**
 * Run Skill Action
 *
 * Invoke declared skill(s) via SpawnRunner.
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
      // Build prompt with task variables so the agent knows company/website/etc.
      const varsEntries = Object.entries(unit.vars ?? {});
      const varsBlock = varsEntries.length > 0
        ? "\n\n## Task Variables\n" + varsEntries.map(([k, v]) => `- **${k}**: ${v}`).join("\n")
        : "";
      await spawnRunner.executeSpawnPath(relativeSkillPath, state, {
        prompt: `Execute using the \`/${name}\` skill.${varsBlock}`,
      });
    } catch (error: any) {
      console.error(`   ❌ Error executing skill ${name}: ${error.message}`);
    }
  }

  return { action: "continue", executionCount: snap.executionCount + 1 };
};
