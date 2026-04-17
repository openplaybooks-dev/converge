/**
 * AI-Driven Health Check Hooks
 *
 * Provides proactive health monitoring and gap prevention through AI analysis.
 * These hooks run at key lifecycle events to detect potential issues before
 * they cause task failures.
 *
 * Health checks:
 *   1. task:complete - Post-completion anomaly detection
 *   2. wbs:spawned - Validate spawned task definitions (custom event)
 *   3. Predictive gap detection (future)
 */

import { z } from 'zod';
import type { HookFn } from '../hooks/types.ts';
import type { TaskContext } from '../context/types.ts';
import type { TaskResult } from '../functions/types.ts';
import { createAIContext } from '../ai/context.ts';
import { createFilesystemHelper } from './helpers/filesystem.ts';
import { createTaskHelper } from './helpers/task.ts';
import { logTaskEvent } from '../journal/writer.ts';

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const HealthIssueSchema = z.object({
  type: z.enum(['output-mismatch', 'deprecated-format', 'tool-change', 'suspicious-warning']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  suggestedFix: z.string(),
});

const HealthCheckResultSchema = z.object({
  healthy: z.boolean(),
  issues: z.array(HealthIssueSchema),
  shouldTriggerRepair: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
});

type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

const WBSReviewResultSchema = z.object({
  allCorrect: z.boolean(),
  issues: z.array(z.object({
    affectedTasks: z.array(z.string()),
    problem: z.string(),
    suggestedFix: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })),
  shouldBlockSpawn: z.boolean(),
});

type WBSReviewResult = z.infer<typeof WBSReviewResultSchema>;

/* ------------------------------------------------------------------ */
/*  Task Completion Health Check                                     */
/* ------------------------------------------------------------------ */

/**
 * Hook: task:complete
 *
 * Analyzes completed tasks for potential issues that might cause
 * downstream failures or indicate stale definitions.
 */
export const taskCompletionHealthCheck: HookFn<'task:complete'> = async ({ ctx, result }) => {
  // Skip health check if task failed or was skipped
  if (!result.success) return;

  try {
    const { projectDir, taskId } = ctx;
    const epicId = ctx.epic.epicId;

    // Initialize helpers
    const ai = createAIContext(projectDir, { epicId, taskId });
    const filesystem = createFilesystemHelper(projectDir);
    const task = createTaskHelper(projectDir, epicId);

    // Get task metadata
    const taskDefinition = await task.getDefinition(taskId);
    const taskLogs = await task.getLogTail(taskId, 50);

    // Get actual outputs
    const outputs = taskDefinition.outputs || [];
    if (outputs.length === 0) return; // No outputs to validate

    let filesCreated: string[] = [];
    try {
      const outputDir = outputs[0].split('/').slice(0, -1).join('/') || '.';
      filesCreated = await filesystem.listDirectory(outputDir);
    } catch {
      // Output directory doesn't exist yet
    }

    // AI health check
    const healthCheck = await performHealthCheck(
      taskId,
      outputs,
      filesCreated,
      taskLogs,
      ai
    );

    if (!healthCheck.healthy) {
      console.warn(`⚠️  Task ${taskId} health check found issues:`);
      healthCheck.issues.forEach(issue => {
        console.warn(`   [${issue.severity}] ${issue.description}`);
        if (issue.suggestedFix) {
          console.warn(`   💡 Suggested fix: ${issue.suggestedFix}`);
        }
      });

      // Log health issues
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        'HEALTH_CHECK_ISSUES',
        `Health check detected ${healthCheck.issues.length} issues`,
        {
          healthy: false,
          issues: healthCheck.issues,
          shouldTriggerRepair: healthCheck.shouldTriggerRepair,
        }
      );

      // TODO: Trigger self-healing via gap resolution pipeline
      // if (healthCheck.shouldTriggerRepair) {
      //   await ctx.repairPipeline.resolveHealthIssues(taskId, healthCheck.issues);
      // }
    }
  } catch (err: any) {
    // Health check errors should not block task completion
    console.warn(`⚠️  Health check failed for task ${ctx.taskId}:`, err.message);
  }
};

async function performHealthCheck(
  taskId: string,
  expectedOutputs: string[],
  actualFiles: string[],
  taskLogs: string[],
  ai: ReturnType<typeof createAIContext>
): Promise<HealthCheckResult> {
  const prompt = `You are analyzing a completed task for potential issues.

**Task:** ${taskId}
**Expected Outputs:** ${expectedOutputs.join(', ')}
**Actual Files Created:** ${actualFiles.join(', ')}
**Task Log (last 50 lines):**
\`\`\`
${taskLogs.join('\n')}
\`\`\`

**Question:**
Did this task complete successfully but have any anomalies?

Check for:
1. Output path mismatches (expected vs actual location)
2. Warnings about deprecated formats
3. Tool version changes or migration notices
4. Unexpected file structures
5. Suspicious warnings in logs

Return JSON:
\`\`\`json
{
  "healthy": true,
  "issues": [],
  "shouldTriggerRepair": false,
  "confidence": "high"
}
\`\`\`

Or if issues found:
\`\`\`json
{
  "healthy": false,
  "issues": [
    {
      "type": "output-mismatch",
      "severity": "medium",
      "description": "Expected .stitch/designs/X.html but found .stitch/designs/X/design.html",
      "suggestedFix": "Update task outputs to match new directory structure"
    }
  ],
  "shouldTriggerRepair": true,
  "confidence": "high"
}
\`\`\`

Only flag issues that could cause downstream failures or indicate stale definitions.`;

  return await ai.askJson<HealthCheckResult>(
    prompt,
    HealthCheckResultSchema,
    {
      phase: 'health-check',
      label: 'Task Health Check',
      timeoutMs: 90_000,
    }
  );
}

/* ------------------------------------------------------------------ */
/*  WBS Spawn Review (Custom Hook)                                   */
/* ------------------------------------------------------------------ */

/**
 * Custom event: wbs:spawned
 *
 * Reviews task definitions spawned by WBS generators before execution.
 * Detects systemic issues in generated tasks.
 *
 * Note: This is a custom event that needs to be emitted from WBS context.
 * Add to TaskContext: ctx.emitHook('wbs:spawned', { parentTaskId, childTasks })
 */
export async function wbsSpawnReview(payload: {
  parentTaskId: string;
  childTasks: Array<{ id: string; outputs: string[]; checks: any[] }>;
  ctx: TaskContext;
}): Promise<void> {
  const { parentTaskId, childTasks, ctx } = payload;

  if (childTasks.length === 0) return;

  try {
    const { projectDir } = ctx;
    const epicId = ctx.epic.epicId;

    // Initialize AI
    const ai = createAIContext(projectDir, { epicId, taskId: parentTaskId });

    // AI review of spawned tasks
    const review = await performWBSReview(
      parentTaskId,
      childTasks,
      ai
    );

    if (!review.allCorrect) {
      if (review.shouldBlockSpawn) {
        // Critical issues - block spawn
        const errorMsg = `WBS spawn blocked due to critical issues: ${review.issues[0].problem}`;
        console.error(`❌ ${errorMsg}`);

        await logTaskEvent(
          projectDir,
          epicId,
          parentTaskId,
          'WBS_SPAWN_BLOCKED',
          errorMsg,
          { issues: review.issues }
        );

        throw new Error(errorMsg);
      }

      // Non-critical issues - warn but allow spawn
      console.warn(`⚠️  WBS spawned tasks with potential issues (will auto-repair):`);
      review.issues.forEach(issue => {
        console.warn(`   [${issue.severity}] ${issue.problem}`);
        console.warn(`   Affected: ${issue.affectedTasks.join(', ')}`);
        console.warn(`   Suggested fix: ${issue.suggestedFix}`);
      });

      await logTaskEvent(
        projectDir,
        epicId,
        parentTaskId,
        'WBS_SPAWN_ISSUES',
        `WBS spawned ${childTasks.length} tasks with ${review.issues.length} potential issues`,
        { issues: review.issues }
      );
    }
  } catch (err: any) {
    // If it's a blocking error, re-throw
    if (err.message.includes('WBS spawn blocked')) {
      throw err;
    }

    // Other errors should not block spawn
    console.warn(`⚠️  WBS review failed for ${parentTaskId}:`, err.message);
  }
}

async function performWBSReview(
  parentTaskId: string,
  childTasks: Array<{ id: string; outputs: string[]; checks: any[] }>,
  ai: ReturnType<typeof createAIContext>
): Promise<WBSReviewResult> {
  const prompt = `You are reviewing ${childTasks.length} tasks spawned by WBS generator.

**Parent Task:** ${parentTaskId}
**Child Task Definitions:**
${childTasks.map(t => `
Task: ${t.id}
Outputs: ${t.outputs.join(', ')}
Checks: ${t.checks.map(c => c.cmd).join('; ')}
`).join('\n')}

**Question:**
Do these task definitions look correct? Are there any systemic issues?

Check for:
1. Consistent output path formats across all tasks
2. Realistic output paths for the tools being used
3. Check commands that match the output paths
4. Common mistakes (e.g., flat files when tool outputs directories)
5. Hardcoded assumptions that might be wrong

Return JSON:
\`\`\`json
{
  "allCorrect": true,
  "issues": [],
  "shouldBlockSpawn": false
}
\`\`\`

Or if issues found:
\`\`\`json
{
  "allCorrect": false,
  "issues": [
    {
      "affectedTasks": ["003-001-design-X", "003-002-design-Y"],
      "problem": "All tasks expect flat files but Stitch CLI outputs to directories",
      "suggestedFix": "Update outputs to: .stitch/designs/{screenId}/design.html",
      "severity": "high"
    }
  ],
  "shouldBlockSpawn": false
}
\`\`\`

Only block spawn for critical issues that will definitely cause failures.`;

  return await ai.askJson<WBSReviewResult>(
    prompt,
    WBSReviewResultSchema,
    {
      phase: 'wbs-review',
      label: 'WBS Spawn Review',
      timeoutMs: 120_000,
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Hook Registration Helper                                          */
/* ------------------------------------------------------------------ */

/**
 * Register all health check hooks with the converge
 *
 * Usage in converge.ts:
 * ```typescript
 * import { registerHealthCheckHooks } from '@converge/core/repair';
 *
 * export default defineConverge({
 *   hooks: {
 *     ...registerHealthCheckHooks(),
 *   },
 * });
 * ```
 */
export function registerHealthCheckHooks() {
  return {
    'task:complete': taskCompletionHealthCheck,
    // Note: wbs:spawned is a custom event - need to add to HookEvent type
    // For now, call wbsSpawnReview() directly from WBS context
  };
}
