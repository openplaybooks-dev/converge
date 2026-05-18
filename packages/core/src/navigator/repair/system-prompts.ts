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
import type { ContextSnapshotPaths } from "../../task/lifecycle/context-snapshot.ts";
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
  static async buildFileBasedTaskRunPrompt(
    gap: Gap,
    projectDir: string,
    snapshot: ContextSnapshotPaths,
    attemptNumber: number = 1,
  ): Promise<string> {
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

    // Inline verifier findings from the gap. This is always accurate because
    // it comes directly from the gap that triggered this retry — no file I/O,
    // no stale FEEDBACK.md, no dependency on intermediate persistence.
    const gapKind = (gap.metadata?.gapKind as string) ?? "";
    const isOutputGap = gapKind === "output";
    const isCheckGap = gapKind === "check-failed";
    const feedbackMd = `${attemptDir}/FEEDBACK.md`;
    const checkResultMd = `${attemptDir}/CHECK.result.md`;
    const hasFeedbackFile = existsSync(feedbackMd);
    const hasCheckResultFile = existsSync(checkResultMd);
    // Only use gap-detection on actual retries. FEEDBACK.md is written to
    // wip/ BEFORE the first AI call, so its presence does NOT indicate a
    // prior failed attempt — only attemptNumber > 1 does.
    // Tasks with `retry-full-body: true` ALWAYS get the full task body
    // prompt (e.g. build loop tasks that intentionally skip their output
    // to trigger re-invocation).
    // Check source TASK.md for converge — more reliable than metadata chain.
    let retryFullBody = gap.metadata?.taskRetryFullBody as boolean | undefined;
    const unitPath = gap.metadata?.unitPath as string | undefined;
    if (!retryFullBody && unitPath && existsSync(unitPath)) {
      try {
        const { readFileSync } = await import("node:fs");
        const raw = readFileSync(unitPath, "utf-8");
        if (/^converge:\s*[|>]/m.test(raw)) retryFullBody = true;
      } catch {}
    }
    const isRetry = !retryFullBody && attemptNumber > 1;

    // Only use narrow gap-detection prompt on retries.
    // On first execution, missing outputs are expected — let the AI execute
    // the full TASK.md body so container/orchestrator tasks can spawn
    // children instead of taking the shortcut of just creating the output.
    if (
      isRetry &&
      (isOutputGap || isCheckGap || hasFeedbackFile || hasCheckResultFile)
    ) {
      const sections: string[] = [
        `Reconciling spec vs. reality (attempt ${attemptNumber}). Be fast and surgical — do NOT explore beyond the files listed.`,
        "",
      ];

      if (isOutputGap) {
        const allItems =
          (gap.metadata?.allMissingItems as string[] | undefined) ?? [];
        const descriptions =
          allItems.length > 0 ? allItems : [gap.description];
        const unitPath = (gap.metadata?.unitPath as string | undefined) ?? "";
        const specPath = unitPath || `${d}/TASK.md`;
        sections.push(
          "## Missing outputs",
          "",
          "The spec declares these outputs, but they do not exist on disk:",
          "",
          ...descriptions.map((line) => `- ${line}`),
          "",
          `Source spec to edit: \`${specPath}\``,
          "",
          "## Do exactly this",
          "",
          "For EACH missing output above, run this decision in order — STOP at the first branch that applies:",
          "",
          "1. **Check the parent directory of the missing path.** If a real artifact already serves the task's intent (e.g. scaffolder chose a different extension or filename), the task is effectively DONE — edit the source spec's frontmatter `outputs:` list to reference the on-disk filename. Use Edit on the file shown in \"Source spec to edit\". Change only the `outputs:` line, nothing else.",
          "2. **If the artifact was truly not produced**, create it per the TASK.md body instructions.",
          "3. **If the on-disk file should match the declared name**, rename it.",
          "",
          "### Hard rules",
          "",
          "- Do NOT create empty stub files just to satisfy the outputs list.",
          "- Do NOT read session logs, checkpoints, git history, or playbook YAML. None of that is needed here.",
          "- Do NOT write LEARN.md unless you are actually stuck.",
          "- Read the compiled task context from \`.converge/journal/<playbook>/executions/<runId>/tasks/<taskId>/\` — not the playbook source.",
          "- The task body in the compiled journal TASK.md already told you the intent. Compare intent to disk, pick the branch, act, stop.",
          "",
        );
      }

      if (isCheckGap || hasCheckResultFile || hasFeedbackFile) {
        sections.push(
          "## Failed checks",
          "",
          isCheckGap ? `- ${gap.description}` : "See the report file below.",
          "",
          "For each failed check:",
          "- If the check command itself is broken (e.g. exit 127, command not found), fix the `cmd` in the source TASK.md frontmatter at `.converge/playbooks/<name>/tasks/<id>/TASK.md`.",
          "- Otherwise, fix the code so the check passes.",
          "",
          "**CRITICAL: Journal files are READ-ONLY.** FEEDBACK.md, CHECK.md, CHECK.result.md under `.converge/journal/` are generated snapshots — do NOT edit them. To update task definitions, edit the playbook source TASK.md (under `.converge/playbooks/`).",
          "",
        );
      }

      sections.push(
        "## Context files (read only what you need, in this order)",
        "",
        "These are READ-ONLY snapshots from the journal — do NOT edit them. When a check command or output declaration needs changing, edit the playbook TASK.md source under `.converge/playbooks/`.",
        "",
      );
      let i = 1;
      if (hasFeedbackFile) {
        sections.push(
          `${i++}. \`${d}/FEEDBACK.md\` — detailed verifier report`,
        );
      } else if (hasCheckResultFile) {
        sections.push(
          `${i++}. \`${d}/CHECK.result.md\` — check results from the last attempt`,
        );
      }
      sections.push(
        `${i++}. \`${d}/TASK.md\` — task intent (read the body once, then stop)`,
        `${i++}. \`${d}/CHECK.md\` — check command definitions`,
        "",
        "Stop as soon as every declared output exists on disk and every check passes.",
      );

      return sections.join("\n");
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

    // First execution (no prior attempt evidence). Give the AI the full
    // TASK.md body so container/orchestrator tasks execute their
    // instructions (spawn children, run commands, etc.) instead of
    // taking the shortest path to just create the declared outputs.
    const gapLines: string[] = [];
    // When retry-full-body is set, the task body's own conditional logic
    // (e.g. "only write counter when all goals done") takes precedence.
    // Don't push the AI to produce outputs — it will decide when ready.
    if (isOutputGap && !retryFullBody) {
      gapLines.push(
        "",
        "## Outputs still needed",
        "",
        gap.description,
        "",
        "Produce all declared outputs by following the TASK.md instructions.",
        "Do NOT shortcut — if the task body says to run commands, spawn",
        "subtasks, or wait for results, do exactly that.",
      );
    }
    if (isCheckGap) {
      gapLines.push(
        "",
        "## Failed checks",
        gap.description,
      );
    }
    return `Executing task (attempt ${attemptNumber}).

## Read

1. **${d}/TASK.md** — Task definition
2. **${d}/NEEDS.result.md** — Available inputs
3. **${d}/CHECK.md** — Validation checks${gapLines.join("\n")}

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
