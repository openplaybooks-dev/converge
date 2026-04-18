/**
 * Re-Evaluation Logic
 *
 * Automatically re-evaluates gaps after task/epic completion.
 */

import type {
  TaskContext,
  EpicContext,
  ProjectContext,
} from "../context/types.ts";
import {
  writeGaps,
  logTaskEvent,
  logEpicEvent,
  logProjectEvent,
} from "./writer.ts";
import { readGaps } from "./reader.ts";

/* ------------------------------------------------------------------ */
/*  Gap Detection Helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Run all checks and detect gaps at task level
 */
async function detectTaskGaps(ctx: TaskContext): Promise<any[]> {
  try {
    const results = await ctx.check.runAll();
    const gaps = results.flatMap((r) => r.gaps);
    return gaps;
  } catch (error: any) {
    ctx.log.error(`Failed to detect task gaps: ${error.message}`);
    return [];
  }
}

/**
 * Detect gaps at epic level by running epic checks
 */
async function detectEpicGaps(ctx: EpicContext): Promise<any[]> {
  try {
    // Run epic-level checks
    const results = await ctx.check.runAll();
    const gaps = results.flatMap((r) => r.gaps);
    return gaps;
  } catch (error: any) {
    ctx.log.error(`Failed to detect epic gaps: ${error.message}`);
    return [];
  }
}

/**
 * Detect gaps at project level
 */
async function detectProjectGaps(ctx: ProjectContext): Promise<any[]> {
  try {
    // Run project-level checks
    const results = await ctx.check.runAll();
    const gaps = results.flatMap((r) => r.gaps);
    return gaps;
  } catch (error: any) {
    ctx.log.error(`Failed to detect project gaps: ${error.message}`);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Re-Evaluation After Task Completion                               */
/* ------------------------------------------------------------------ */

/**
 * Re-evaluate gaps after a task completes
 *
 * Flow:
 * 1. Re-detect task gaps → write {epic}.{task}.gaps.yml
 * 2. Re-detect epic gaps → write {epic}.gaps.yml
 * 3. If epic complete → re-detect project gaps → write project.gaps.yml
 */
export async function reEvaluateAfterTask(ctx: TaskContext): Promise<void> {
  const { projectDir, epic, taskId } = ctx;
  const epicId = epic.epicId;
  const scope = `${epicId}.${taskId}`;

  ctx.log.info("Re-evaluating gaps after task completion...");

  // Step 1: Re-detect task gaps
  const taskGaps = await detectTaskGaps(ctx);
  await writeGaps(projectDir, "task", scope, taskGaps);

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "CHECK_RUN",
    `Task re-evaluation: ${taskGaps.length} gaps detected`,
    { gapCount: taskGaps.length },
  );

  // Step 2: Re-detect epic gaps
  const epicGaps = await detectEpicGaps(epic);
  await writeGaps(projectDir, "epic", epicId, epicGaps);

  await logEpicEvent(
    projectDir,
    epicId,
    "CHECK_RUN",
    `Epic re-evaluation: ${epicGaps.length} gaps detected`,
    { gapCount: epicGaps.length, triggeredBy: `task:${taskId}` },
  );

  // Step 3: If epic complete, re-evaluate project
  if (epicGaps.length === 0) {
    ctx.log.info("Epic has no gaps, re-evaluating project...");

    const projectGaps = await detectProjectGaps(epic.project);
    await writeGaps(projectDir, "project", "project", projectGaps);

    await logProjectEvent(
      projectDir,
      "EPIC_COMPLETE",
      `Epic ${epicId} completed, project re-evaluation: ${projectGaps.length} gaps`,
      { epicId, gapCount: projectGaps.length },
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Re-Evaluation After Epic Completion                               */
/* ------------------------------------------------------------------ */

/**
 * Re-evaluate gaps after an epic completes
 *
 * Flow:
 * 1. Clear epic gaps → write {epic}.gaps.yml with empty array
 * 2. Re-detect project gaps → write project.gaps.yml
 * 3. Log epic completion
 */
export async function reEvaluateAfterEpic(
  ctx: ProjectContext,
  epicId: string,
): Promise<void> {
  const { projectDir } = ctx;

  ctx.log.info(`Re-evaluating gaps after epic ${epicId} completion...`);

  // Step 1: Clear epic gaps
  await writeGaps(projectDir, "epic", epicId, []);

  await logEpicEvent(
    projectDir,
    epicId,
    "EPIC_COMPLETE",
    `Epic ${epicId} completed, all gaps resolved`,
  );

  // Step 2: Re-detect project gaps
  const projectGaps = await detectProjectGaps(ctx);
  await writeGaps(projectDir, "project", "project", projectGaps);

  // Step 3: Log to project journal
  await logProjectEvent(
    projectDir,
    "EPIC_COMPLETE",
    `Epic ${epicId} completed, project re-evaluation: ${projectGaps.length} gaps`,
    { epicId, gapCount: projectGaps.length },
  );
}

/* ------------------------------------------------------------------ */
/*  Gap Resolution Tracking                                           */
/* ------------------------------------------------------------------ */

/**
 * Mark a specific gap as resolved
 */
export async function markGapResolved(
  projectDir: string,
  level: "project" | "epic" | "task",
  scope: string,
  gapId: string,
): Promise<void> {
  // Read current gaps
  const gaps = await readGaps(projectDir, level, scope);

  // Find and mark as resolved
  const gap = gaps.find((g) => g.id === gapId);
  if (gap) {
    gap.resolved = true;
    gap.resolvedAt = new Date().toISOString();

    // Write updated gaps
    await writeGaps(projectDir, level, scope, gaps);

    // Log resolution
    const eventType = "GAP_RESOLVED";
    if (level === "task") {
      const [epicId, taskId] = scope.split(".");
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        eventType,
        `Gap resolved: ${gap.description}`,
        { gapId },
      );
    } else if (level === "epic") {
      await logEpicEvent(
        projectDir,
        scope,
        eventType,
        `Gap resolved: ${gap.description}`,
        { gapId },
      );
    } else {
      await logProjectEvent(
        projectDir,
        eventType,
        `Gap resolved: ${gap.description}`,
        { gapId },
      );
    }
  }
}

/**
 * Check if all gaps are resolved at a given level
 */
export async function areAllGapsResolved(
  projectDir: string,
  level: "project" | "epic" | "task",
  scope: string,
): Promise<boolean> {
  const gaps = await readGaps(projectDir, level, scope);
  return gaps.length === 0 || gaps.every((g) => g.resolved);
}
