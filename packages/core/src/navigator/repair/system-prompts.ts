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
import { join } from "node:path";
import { getJournalStructure } from "../../journal/structure.ts";
import type { Gap } from "../../task/gap/types.ts";
import type { JournalContext } from "./types.ts";
import type { ContextWriterResult } from "./context-writer.ts";
import { buildFilesystemRepairPrompt } from "./context-writer.ts";
import { renderPacket } from "./packet-builder.ts";

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

  /* ── RFC 0048: packet-driven task-run prompt ───────────────────── */

  /**
   * Render a `AIContextPacket` into the agent's input string. The packet
   * is the result of the situation-classifier + packet-builder pipeline;
   * the prompt is just the rendering of that packet with the attempt
   * number attached. There is no fallback to reading generated journal
   * files — the packet is the only source of truth.
   */
  static buildPacketBasedTaskRunPrompt(
    packet: import("./packet-builder.ts").AIContextPacket,
    attemptNumber: number,
  ): string {
    return `## Attempt ${attemptNumber}\n\n${renderPacket(packet)}`;
  }

  /* ── LEGACY METHODS REMOVED ───────────────────────────────────────
   * The following methods were removed as they belonged to deleted strategies:
   * - buildBlockerAnalysisPrompt (AIBlockerAnalysisStrategy - removed)
   * - buildRemoveIncorrectInputPrompt (AIBlockerAnalysisStrategy - removed)
   * - buildTaskDefinitionFixPrompt (AIBlockerAnalysisStrategy - removed)
   * - buildFileCreationPrompt (AIBlockerAnalysisStrategy - removed)
   * - buildSelfRepairPrompt (SelfRepairStrategy - removed)
   * - buildFileBasedTaskRunPrompt (RFC 0048 clean break — replaced by
   *   buildPacketBasedTaskRunPrompt)
   *
   * If you need similar functionality, use the new strategies instead:
   * - DependencyBackoffStrategy for dependency detection
   * - SkillBasedRepairStrategy for definition fixes
   * - AIContextPacket for task-run prompts
   * ------------------------------------------------------------------ */

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
