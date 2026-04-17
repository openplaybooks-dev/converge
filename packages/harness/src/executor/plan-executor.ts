/**
 * PlanExecutor
 *
 * Implements the planning phase for tasks that use `.plan()`.
 * Runs a read-only AI call to produce `plan.md` in the task journal.
 * The plan is generated once (idempotent) and then injected into the
 * execution prompt by GapFixer.executeTaskRun().
 *
 * Flow:
 *   1. Build planning prompt (custom or derived from task prompt)
 *   2. Call agentfn with read-only tools (Read, Glob)
 *   3. Write result to .harness/journal/tasks/{epicId}/tasks/{taskId}/plan.md
 *   4. Log PLAN_START / PLAN_COMPLETE / PLAN_FAILED events
 */

import { READONLY_TOOLS } from '../ai/context.ts';
import { runAgent } from '../repair/agent-runner.ts';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getJournalStructure } from '../journal/structure.ts';
import { writeTaskPlan, logTaskEvent } from '../journal/writer.ts';
import type { JournalContext } from '../repair/types.ts';

/* ------------------------------------------------------------------ */
/*  PlanExecutor                                                      */
/* ------------------------------------------------------------------ */

export class PlanExecutor {
  constructor(
    private projectDir: string,
    private journalCtx: JournalContext,
    private taskMeta: {
      id: string;
      title?: string;
      vars?: Record<string, unknown>;
    },
  ) {}

  /**
   * Absolute path to this task's plan.md in the journal.
   */
  planPath(): string {
    const structure = getJournalStructure(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
    );
    return join(structure.task!, 'plan.md');
  }

  /**
   * Returns true if plan.md already exists (skip re-planning).
   */
  alreadyPlanned(): boolean {
    return existsSync(this.planPath());
  }

  /**
   * Build the final planning prompt.
   *
   * If `planPromptOverride` is provided (from `.plan('custom...')`) it is used
   * as-is. Otherwise the task's `taskPrompt` is wrapped with a planning preamble
   * that instructs the AI to only think, not create files.
   *
   * If `output` and `outputPrompt` are provided, they are incorporated into the
   * prompt to guide the AI on what file to create and how to format it.
   */
  buildPlanningPrompt(
    taskPrompt?: string,
    planPromptOverride?: string,
    output?: string,
    outputPrompt?: string
  ): string {
    let prompt = '';

    if (planPromptOverride) {
      prompt = `${planPromptOverride}

PROJECT DIRECTORY: ${this.projectDir}
TASK: ${this.taskMeta.title ?? this.taskMeta.id}`;
    } else {
      prompt = `You are a software architect and planning specialist. Your role is to explore the codebase and design implementation plans.

=== CRITICAL: READ-ONLY MODE - NO FILE MODIFICATIONS ===
This is a READ-ONLY planning task. You are STRICTLY PROHIBITED from:
- Creating new files (no Write, touch, or file creation of any kind)
- Modifying existing files (no Edit operations)
- Deleting files (no rm or deletion)
- Using redirect operators (>, >>) or heredocs to write to files

Your role is EXCLUSIVELY to explore the codebase and design implementation plans.

PROJECT DIRECTORY: ${this.projectDir}
TASK: ${this.taskMeta.title ?? this.taskMeta.id}

${taskPrompt ? `TASK INSTRUCTIONS:\n${taskPrompt}\n` : ''}
## Your Process

1. **Understand Requirements**: Focus on the task instructions above.

2. **Explore Thoroughly**:
   - Read relevant files using the available tools (Read, Glob)
   - Find existing patterns and conventions
   - Identify similar features as reference
   - Trace through relevant code paths

3. **Design Solution**:
   - Create an implementation approach
   - Consider trade-offs and architectural decisions
   - Follow existing patterns where appropriate

4. **Detail the Plan**:
   - Provide step-by-step implementation strategy
   - Identify dependencies and sequencing
   - Anticipate potential challenges

## Required Output

End your plan with:

### Critical Files for Implementation
List 3-5 files most critical for implementing this plan.

REMEMBER: You can ONLY explore and plan. You CANNOT and MUST NOT write, edit, or modify any files.`;
    }

    // Add output specification if provided.
    // The AI has read-only tools, so it cannot write files directly.
    // Instead, instruct it to include the full file content in the `plan` field.
    // After the AI call, PlanExecutor.run() will materialize the file.
    if (output) {
      prompt += `\n\n## Expected Output File\n\n`;
      prompt += `Your plan MUST contain the COMPLETE contents of \`${output}\`.\n`;
      prompt += `Include the full file content in your plan — the system will write it to disk.\n`;
      prompt += `Do NOT abbreviate, summarize, or truncate the file content.\n`;

      if (outputPrompt) {
        prompt += `\n### Format Requirements\n\n${outputPrompt}\n`;
      }
    }

    return prompt;
  }

  /**
   * Run the planning phase.
   * Calls agentfn with read-only tools, writes plan.md, logs events.
   * If `outputPath` is provided, also writes the plan content to that
   * path in the project directory (materializing the declared plan.output).
   */
  async run(planningPrompt: string, outputPath?: string): Promise<void> {
    const logDir = this.getLogDir();

    await logTaskEvent(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      'PLAN_START',
      `Planning: ${this.taskMeta.title ?? this.taskMeta.id}`,
      { taskId: this.taskMeta.id },
    );

    console.log(`\n📋 Planning: ${this.taskMeta.title ?? this.taskMeta.id}`);

    const start = Date.now();
    let result;
    try {
      result = await runAgent<string>({
        phase: 'plan',
        prompt: planningPrompt,
        agentOptions: {
          allowedTools: [...READONLY_TOOLS],
          timeoutMs: 300_000, // 5 min — planning may need to read many inputs
        },
        projectDir: this.projectDir,
        journalCtx: this.journalCtx,
        label: this.taskMeta.title ?? this.taskMeta.id,
        agentName: 'plan-executor',
      });
    } catch (error: any) {
      await logTaskEvent(
        this.projectDir,
        this.journalCtx.epicId,
        this.journalCtx.taskId,
        'PLAN_FAILED',
        `Planning failed: ${error.message}`,
        { taskId: this.taskMeta.id, error: error.message },
      );
      console.error(`   ❌ Planning failed: ${error.message}`);
      throw error;
    }

    const durationMs = Date.now() - start;
    const plan = typeof result.data === 'string' ? result.data : String(result.data);
    // Derive a one-line summary from the first non-empty line of the plan
    const summary = plan.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#')) ?? 'Plan generated';

    // Write plan.md to journal
    const planContent = `# Plan: ${this.taskMeta.title ?? this.taskMeta.id}\n\n${plan}`;
    await writeTaskPlan(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      planContent,
    );

    // Materialize plan.output — write the plan content to the declared
    // output path in the project directory so downstream tasks can use it.
    if (outputPath) {
      const absPath = join(this.projectDir, outputPath);
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, plan, 'utf-8');
      console.log(`   📄 Output written to ${outputPath}`);
    }

    await logTaskEvent(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
      'PLAN_COMPLETE',
      summary,
      { taskId: this.taskMeta.id, durationMs, planPath: this.planPath() },
    );

    console.log(`   ✅ Plan written to ${this.planPath()} (${durationMs}ms)`);
    console.log(`   Summary: ${summary}`);
  }

  private getLogDir(): string {
    const structure = getJournalStructure(
      this.projectDir,
      this.journalCtx.epicId,
      this.journalCtx.taskId,
    );
    return join(structure.attempt ?? structure.task!, 'logs');
  }
}
