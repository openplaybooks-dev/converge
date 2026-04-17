/**
 * Gap resolution — fixGaps() and fixGapsDetailed().
 *
 * executorFn and loopFn dispatch is handled by the navigator graph's
 * run-executor action. This file handles plan, WBS, children, and leaf.
 */

import { WbsExecutor } from '../executor/wbs-executor.ts';
import { PlanExecutor } from '../executor/plan-executor.ts';
import type { Gap } from '../gap/types.ts';
import type { Resolution } from '../repair/types.ts';
import type { Unit } from './unit.ts';
import { getProjectRoot, getEpicId } from './helpers.ts';
import { resolvePrompt, createTaskContext } from './resolve.ts';
import { discoverChildren } from './children.ts';
import { findGaps } from './find-gaps.ts';

/**
 * Fix gaps - plan, WBS, children delegation, or leaf (return 0).
 */
export async function fixGaps(unit: Unit, gaps: Gap[]): Promise<number> {
  const projectDir = getProjectRoot(unit);
  const jCtx = { epicId: getEpicId(unit), taskId: unit.id };

  // ── Plan gap: generate plan.md via PlanExecutor ─────────────────
  const planGap = gaps.find(g => g.metadata?.gapKind === 'plan');
  if (planGap && unit.planConfig) {
    const executor = new PlanExecutor(projectDir, jCtx, {
      id: unit.id,
      title: unit.title,
      vars: unit.vars,
    });

    if (!executor.alreadyPlanned()) {
      const ctx = createTaskContext(unit);
      const planPromptOverride =
        typeof unit.planConfig.prompt === 'function'
          ? await unit.planConfig.prompt(ctx)
          : unit.planConfig.prompt;

      // Resolve outputPrompt if it's a function
      const outputPrompt =
        typeof unit.planConfig.outputPrompt === 'function'
          ? await unit.planConfig.outputPrompt(ctx)
          : unit.planConfig.outputPrompt;

      const taskPrompt = await resolvePrompt(unit);
      const finalPrompt = executor.buildPlanningPrompt(
        taskPrompt,
        planPromptOverride,
        unit.planConfig.output,
        outputPrompt
      );

      try {
        await executor.run(finalPrompt, unit.planConfig.output);
      } catch (err: any) {
        console.error(`[fix-gaps] Plan generation failed: ${err.message}`);
        return 0;
      }
    }

    // Plan resolved — return so next iteration detects WBS gap
    return 1;
  }

  // ── WBS gap: seed subtasks via WbsExecutor ─────────────────────
  const wbsGap = gaps.find(g => g.metadata?.gapKind === 'wbs');
  if (wbsGap && unit.wbsFn) {
    const executor = new WbsExecutor(projectDir, jCtx, unit.path, {
      id: unit.id,
      title: unit.title,
      vars: unit.vars,
    });
    const attemptNumber = 1;
    const result = await executor.run(unit.wbsFn, attemptNumber);
    return (result.error || result.spawnCount === 0) ? 0 : 1;
  }

  // Legacy WBS dispatch (for tasks without gap-driven flow)
  if (unit.wbsFn) {
    const executor = new WbsExecutor(projectDir, jCtx, unit.path, {
      id: unit.id,
      title: unit.title,
      vars: unit.vars,
    });
    const attemptNumber = 1;
    const result = await executor.run(unit.wbsFn, attemptNumber);
    return (result.error || result.spawnCount === 0) ? 0 : gaps.length;
  }

  // Discover children if not already done
  if (!unit.children) {
    unit.children = await discoverChildren(unit, gaps);
  }

  if (unit.children.length > 0) {
    // Parent unit: delegate to children
    console.log(`Delegating to ${unit.children.length} child unit(s)...`);
    let childrenSucceeded = 0;
    for (const child of unit.children) {
      const success = await child.run();
      if (success) childrenSucceeded++;
    }
    // Re-check gaps after children complete
    const afterGaps = await findGaps(unit);
    return gaps.length - afterGaps.length;
  } else {
    // Leaf unit: walker's repair-loop handles gap resolution.
    // Return 0 so the caller knows no gaps were resolved here.
    return 0;
  }
}

/**
 * @deprecated Leaf-unit gap resolution is now handled by the walker's repair-loop.
 * This stub is kept for backward compatibility but returns empty results.
 */
export async function fixGapsDetailed(_unit: Unit, _gaps: Gap[]): Promise<Resolution[]> {
  return [];
}
