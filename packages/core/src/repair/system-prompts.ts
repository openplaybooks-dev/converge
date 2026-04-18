/**
 * PromptBuilder
 *
 * Single place for all AI prompt construction.
 * Previously scattered across gap-fixer.ts (lines 477–560).
 *
 * Each static method returns a complete prompt string ready to pass to agentfn.
 * `injectPlan()` prepends a task's plan.md when it exists.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { getJournalStructure } from "../journal/structure.ts";
import type { Gap } from "../gap/types.ts";
import type { JournalContext } from "./types.ts";
import type { ContextSnapshotPaths } from "../lifecycle/context-snapshot.ts";
import type { ContextWriterResult } from "./context-writer.ts";
import { buildFilesystemRepairPrompt } from "./context-writer.ts";

/**
 * Extract missing file path from gap description
 * (Moved from upstream-rerun.ts)
 */
function extractMissingPath(description: string): string | null {
  const match = description.match(/Missing (?:input|file|output):\s*(.+)/i);
  return match ? match[1].trim() : null;
}

/* ------------------------------------------------------------------ */
/*  GapFixPlan (shared by analysis strategy)                          */
/* ------------------------------------------------------------------ */

/** Minimal subset of the AI analysis response used by prompt builders. */
export interface GapFixPlan {
  rootCause: string;
  analysis: string;
  strategy: string;
  action: string;
  steps: string[];
  files: Array<{ path: string; action: string; description: string }>;
  automatable: boolean;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/*  PromptBuilder                                                      */
/* ------------------------------------------------------------------ */

export class PromptBuilder {
  /* ── Task execution prompt ──────────────────────────────────────── */

  /**
   * Build the prompt for executing a task (handles skill, yields, task-prompt,
   * and generic output-gap cases). Mirrors the logic from gap-fixer.ts:executeTaskRun().
   */
  static buildTaskRunPrompt(
    gap: Gap,
    projectDir: string,
    skillName?: string,
  ): string {
    const taskTitle =
      (gap.metadata?.taskTitle as string | undefined) ?? gap.description;
    const taskAgent =
      (gap.metadata?.taskAgent as string | undefined) ?? "Converge";
    const allMissingItems = gap.metadata?.allMissingItems as
      | string[]
      | undefined;
    const taskPrompt = gap.metadata?.taskPrompt as string | undefined;
    const taskYields = gap.metadata?.taskYields as
      | {
          plan?: string;
          outputDir?: string;
          template?: string;
          maxTasks?: number;
        }
      | undefined;
    const taskInputs = gap.metadata?.taskInputs as string[] | undefined;

    // Case 1: yields-only task (no prompt, just spawn subtask files)
    if (taskYields && !taskPrompt) {
      return `You are a task manager. Create subtask definition files — do NOT implement anything.

PROJECT DIRECTORY: ${projectDir}

TASK: ${taskTitle}

PLAN: ${taskYields.plan ?? "Instantiate the template for each item found in the inputs."}

${taskYields.template ? `TEMPLATE FILE (read this): ${taskYields.template}` : ""}
${taskYields.outputDir ? `OUTPUT DIRECTORY (write files here): ${taskYields.outputDir}` : ""}
${(taskInputs ?? []).length > 0 ? `INPUT FILES (read these to discover items):\n${(taskInputs ?? []).join("\n")}` : ""}

RULES:
- Read the template, read the inputs, create one .ts file per item in the output directory
- Use zero-padded sequential numbering: 001, 002, 003, … (never overwrite the template)
- Each file must be valid TypeScript exporting a taskDef().build() result
- Max ${taskYields.maxTasks ?? 20} files
- Create ONLY .ts task files — no HTML, no JSON, no other files`;
    }

    // Case 2: skill-based execution — read skill file and follow instructions
    // Note: Don't use / prefix - it's interpreted as a command and causes Claude CLI to hang
    if (skillName) {
      return `Read the skill file at .claude/skills/${skillName}/SKILL.md and follow all instructions in it.

The skill file contains:
- Your role and persona
- Detailed instructions for completing this task
- References to other skills you may need to invoke
- Output requirements

Execute all instructions in the skill file to completion.`;
    }

    // Case 3: task has its own prompt
    if (taskPrompt) {
      return `You are acting as a ${taskAgent} agent executing a converge task.

PROJECT DIRECTORY: ${projectDir}

TASK: ${taskTitle}

TASK INSTRUCTIONS:
${taskPrompt}

MISSING OUTPUT TO PRODUCE:
${gap.description}

Execute the task instructions above to generate the missing output.

IMPORTANT:
- Follow the task instructions exactly as written
- Use Write/Edit tools to create output files
- Use Bash to run commands if needed
- Read context files mentioned in the instructions before generating outputs
- Create complete, realistic content — no placeholders`;
    }

    // Case 4: generic output gap
    return `You are executing a task to generate missing outputs.

PROJECT DIRECTORY: ${projectDir}

OUTPUTS TO PRODUCE:
${(allMissingItems ?? [gap.description]).map((d) => `- ${d}`).join("\n")}

Execute the steps above to generate the missing outputs.

IMPORTANT:
- Use Bash tool to run build commands if needed
- Use Write/Edit tools to create files
- Check that outputs are created after running`;
  }

  /* ── LEGACY METHODS REMOVED ───────────────────────────────────────
   * The following methods were removed as they belonged to deleted strategies:
   * - buildBlockerAnalysisPrompt (AIBlockerAnalysisStrategy - removed)
   * - buildRemoveIncorrectInputPrompt (AIBlockerAnalysisStrategy - removed)
   * - buildTaskDefinitionFixPrompt (AIBlockerAnalysisStrategy - removed)
   * - buildFileCreationPrompt (AIBlockerAnalysisStrategy - removed)
   * - buildSelfRepairPrompt (SelfRepairStrategy - removed)
   *
   * If you need similar functionality, use the new strategies instead:
   * - DependencyBackoffStrategy for dependency detection
   * - SkillBasedRepairStrategy for definition fixes
   * ------------------------------------------------------------------ */
  static buildFileBasedTaskRunPrompt(
    _gap: Gap,
    projectDir: string,
    snapshot: ContextSnapshotPaths,
    attemptNumber: number = 1,
  ): string {
    const d = snapshot.relDir;
    const attemptDir = snapshot.taskMd.replace("/TASK.md", "");

    // Check for RESUME.md (task resuming after user input)
    const resumePath = `${attemptDir}/RESUME.md`;
    const hasResume = existsSync(resumePath);

    if (hasResume) {
      return `Resuming task after user input.

## Read

1. **${d}/RESUME.md** — User's answer and resume instructions
2. **${d}/TASK.md** — Task definition
3. **${d}/CHECK.md** — Validation checks

## Execute

**CRITICAL**: The user has provided an answer to your previous question.

- Read RESUME.md first to get the user's answer
- Continue the task using the answer provided
- DO NOT ask the same question again
- Complete all outputs and checks in CHECK.md

If you need more information, check existing files (idea.md, .stitch/, etc.) before asking.`;
    }

    // Interrupted task: INTERRUPTED.md means continue in-place, don't restart
    if (snapshot.hasInterrupted) {
      return `Continuing interrupted task (attempt ${attemptNumber}).

## Read
1. **${d}/INTERRUPTED.md** — What was completed before interruption
2. **${d}/TASK.md** — Task definition
3. **${d}/CHECK.md** — Validation checks

## Execute
This task was interrupted, not failed. Partial work exists in this directory.
Read INTERRUPTED.md to see what already exists and what is missing.
**Continue from where the previous attempt left off** — do NOT redo completed work.
Run all checks in ${d}/CHECK.md to verify.

If stuck, update ${d}/LEARN.md and stop.`;
    }

    // Fix check failure: prefer FEEDBACK.md (always fresh, written by prepareFeedback
    // just before this prompt) over CHECK.result.md (from result-snapshot, can be stale)
    const feedbackMd = `${attemptDir}/FEEDBACK.md`;
    const checkResultMd = `${attemptDir}/CHECK.result.md`;
    const errorFile = existsSync(feedbackMd)
      ? "FEEDBACK.md"
      : existsSync(checkResultMd)
        ? "CHECK.result.md"
        : null;
    if (errorFile) {
      return `Fixing check failure (attempt ${attemptNumber}).

## Read these files in order

1. **${d}/${errorFile}** — Which checks failed, exact command, exit code, error output
2. **${d}/TASK.md** — Task definition (source of check commands)
3. **${d}/CHECK.md** — All check definitions

## Execute

- Read ${errorFile} to see exactly which checks failed and why
- If a check is marked **BROKEN COMMAND**, fix the \`cmd\` in the source TASK.md (in \`.converge/epics/\`)
- If a check failed because of your code, fix the code
- Run each failed check command to verify your fix
- Do NOT skip checks — every check must pass`;
    }

    // Retry with LEARN.md guidance (if exists - even on attempt 1 for incremental repairs)
    if (snapshot.hasLearn) {
      return `${attemptNumber > 1 ? "Retrying" : "Executing"} task (attempt ${attemptNumber}).

## Read

1. **${d}/LEARN.md** — Instructions from previous attempt
2. **${d}/TASK.md** — Task definition

## Execute

Follow instructions in LEARN.md and TASK.md.
Run checks in ${d}/CHECK.md to verify.

If stuck, update ${d}/LEARN.md and stop.`;
    }

    // First try without LEARN.md
    return `Executing task (attempt 1).

## Read

1. **${d}/TASK.md** — Task definition
2. **${d}/NEEDS.result.md** — Available inputs
3. **${d}/CHECK.md** — Validation checks

## Execute

Follow TASK.md instructions.
Run all checks in CHECK.md to verify.

If a check fails and you can't fix it:
1. Write ${d}/LEARN.md explaining the failure
2. Stop (framework will analyze)`;
  }

  /* ── Dependency backoff prompts ─────────────────────────────────── */

  /**
   * Prompt for AI to choose a repair strategy when a task is blocked by missing inputs.
   * Reads DEPS.md context and returns a JSON decision.
   */
  static buildDepsRepairPrompt(
    depsMapPath: string,
    missingInputs: string[],
    blockedTaskId: string,
  ): string {
    return `You are a converge repair agent. A task is blocked by missing required inputs.

## Step 1 — Read the dependency map

Read \`${depsMapPath}\` to understand which tasks produce which outputs and their current status.

## Step 2 — Identify the problem

Task \`${blockedTaskId}\` cannot run because these inputs are missing:
${missingInputs.map((i) => `- \`${i}\``).join("\n")}

## Step 3 — Choose a repair strategy

- **rerun-producer**: A producer task exists in the map and ran, but failed to create the missing output on disk
- **spawn-new-task**: No task in the map produces this input at all (gap in the pipeline)
- **fix-pattern**: Files exist but at a different path — glob pattern in TASK.md is wrong. Provide \`suggestedPatterns\` mapping each wrong pattern to the corrected one (exact string replacement in TASK.md)
- **remove-input**: The input declaration in TASK.md is stale — the task itself consumes or moves this file. Provide \`suggestedPatterns\` mapping the stale input to \`""\`

## Step 4 — Return JSON

Return a JSON object with no surrounding text:
{
  "strategy": "<one of: rerun-producer, spawn-new-task, fix-pattern, remove-input>",
  "producerTaskId": "<leaf task id, or null>",
  "producerEpicId": "<epic id, or null>",
  "producerJournalTaskId": "<journal task id like parent/child, or null>",
  "reason": "<one sentence explanation>",
  "learnHints": ["<hint for producer on next run>"],
  "suggestedPatterns": {"<original>": "<corrected>"}
}`;
  }

  /**
   * Build LEARN.md content for a producer task that ran but didn't produce required outputs.
   * Written to the producer's previous attempt dir before re-running it.
   */
  static buildDependencyBackoffLearnPrompt(
    missingOutputs: string[],
    dependentTaskId: string,
    learnHints: string[] = [],
  ): string {
    const hintsSection =
      learnHints.length > 0
        ? `\n## Hints from Repair Analysis\n\n${learnHints.map((h) => `- ${h}`).join("\n")}`
        : "";

    return `# Previous Attempt Did Not Produce All Required Outputs

Task \`${dependentTaskId}\` is blocked and waiting for these files before it can run:

${missingOutputs.map((o) => `- \`${o}\``).join("\n")}
${hintsSection}

## What To Do This Attempt

Execute TASK.md instructions AND verify ALL files listed above exist when you finish.

For missing \`.png\` screenshot files:
- Generate from the HTML design (puppeteer, playwright, wkhtmltopdf, ImageMagick, or similar)
- Or create a minimal 1x1 white placeholder PNG if screenshot tools are unavailable

Do NOT stop until each missing file is verified to exist on disk.`;
  }

  /* ── Filesystem-based repair prompt (Meta-Converge optimization) ──── */

  /**
   * Build a repair prompt that references filesystem context instead of
   * inlining all context. Saves ~60-75% tokens per repair iteration.
   *
   * Meta-Converge insight: Give the agent filesystem access to context files
   * and let it read only what it needs via grep/cat.
   *
   * @param contextResult - Result from writeRepairContext()
   * @param snapshot - Context snapshot paths
   * @param attemptNumber - Current attempt number
   */
  static buildFilesystemBasedRepairPrompt(
    contextResult: ContextWriterResult,
    snapshot: ContextSnapshotPaths,
    attemptNumber: number,
  ): string {
    const d = snapshot.relDir;
    return buildFilesystemRepairPrompt(
      contextResult,
      `${d}/TASK.md`,
      `${d}/CHECK.md`,
    );
  }

  /* ── Plan injection ──────────────────────────────────────────────── */

  /**
   * If `plan.md` exists in the task's journal, prepend it to the prompt.
   * Idempotent — returns original prompt unchanged if no plan file found.
   */
  static injectPlan(
    prompt: string,
    projectDir: string,
    journalCtx?: JournalContext,
  ): string {
    if (!journalCtx) return prompt;

    const structure = getJournalStructure(
      projectDir,
      journalCtx.epicId,
      journalCtx.taskId,
    );
    if (!structure.task) return prompt;

    const planPath = join(structure.task, "plan.md");
    if (!existsSync(planPath)) return prompt;

    try {
      const planContent = readFileSync(planPath, "utf-8");
      console.log(`   📋 Plan injected from: ${planPath}`);
      return `## Implementation Plan\n\nA plan has already been created for this task. **Follow this plan step-by-step.** Do NOT re-discover or re-explore what has already been analyzed — go straight to implementation.\n\n${planContent}\n\n---\n\n${prompt}`;
    } catch {
      return prompt;
    }
  }
}
