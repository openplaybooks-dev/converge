/**
 * Gap Task Spawner
 *
 * Detects missing intermediate tasks in the pipeline and generates
 * gap-fixer tasks to resolve them.
 *
 * This is the core of the framework-level self-healing system for
 * dependency gaps.
 */

import type { Gap, MissingIntermediateGap } from "../../task/gap/types.ts";
import type { TaskDefinition } from "../../config/task-definition.ts";
import { v4 as uuidv4 } from "uuid";
import { join, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

/* ------------------------------------------------------------------ */
/*  Task Metadata for Gap Detection                                  */
/* ------------------------------------------------------------------ */

export interface TaskMetadata {
  id: string;
  title?: string;
  order: number;
  inputs?: string[];
  outputs?: string[];
  epicId: string;
}

/* ------------------------------------------------------------------ */
/*  Gap Fixer Task Definition                                        */
/* ------------------------------------------------------------------ */

export interface GapFixerTaskDef extends TaskDefinition {
  gapFixerMetadata: {
    gapId: string;
    parentTaskId: string;
    attempt: number;
    spawnedAt: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Gap Task Spawner                                                 */
/* ------------------------------------------------------------------ */

export class GapTaskSpawner {
  constructor(private projectDir: string) {}

  /**
   * Detect if current task has missing intermediate outputs.
   * Returns a gap if required inputs are not produced by any prior task.
   */
  async detectIntermediateGap(
    currentTask: TaskMetadata,
    epicTasks: TaskMetadata[],
  ): Promise<MissingIntermediateGap | null> {
    const requiredInputs = currentTask.inputs || [];
    if (requiredInputs.length === 0) {
      return null;
    }

    // Get all tasks that run before this one
    const priorTasks = epicTasks.filter((t) => t.order < currentTask.order);

    // Collect all outputs from prior tasks
    const availableOutputs = new Set<string>();
    for (const task of priorTasks) {
      if (task.outputs) {
        task.outputs.forEach((output) => availableOutputs.add(output));
      }
    }

    // Find missing outputs (inputs not produced by any prior task)
    const missingOutputs = requiredInputs.filter(
      (input) => !availableOutputs.has(input) && !this.isGlobPattern(input),
    );

    if (missingOutputs.length === 0) {
      return null;
    }

    // Create gap
    const lastProducingTask =
      priorTasks.length > 0 ? priorTasks[priorTasks.length - 1].id : null;

    return {
      id: `missing-intermediate-${currentTask.id}-${uuidv4().slice(0, 8)}`,
      type: "missing-intermediate",
      level: "epic",
      scope: currentTask.epicId,
      description: `Task '${currentTask.id}' requires ${missingOutputs.join(", ")} but no prior task produces them`,
      detected: new Date().toISOString(),
      resolved: false,
      checks: [],
      severity: "critical",
      metadata: {
        missingOutputs,
        requiredByTask: currentTask.id,
        lastProducingTask,
        epicId: currentTask.epicId,
        gapFixerAttempts: 0,
      },
      suggestedFix: `Create an intermediate task that produces ${missingOutputs.join(", ")} before '${currentTask.id}'`,
    };
  }

  /**
   * Generate a gap-fixer task definition using AI.
   * The task will be inserted before the blocked task.
   */
  async generateGapFixerTask(
    gap: MissingIntermediateGap,
    attemptNumber: number,
  ): Promise<GapFixerTaskDef> {
    const { missingOutputs, requiredByTask, lastProducingTask, epicId } =
      gap.metadata;

    // Generate task ID: {parent-task}-fix-gap-{attempt}
    const taskId = `${requiredByTask}-fix-gap-${String(attemptNumber).padStart(3, "0")}`;

    // Build AI prompt for task generation
    const prompt = this.buildTaskGenerationPrompt(gap);

    // TODO: Call AI to generate task definition
    // For now, create a template task
    const taskDef: GapFixerTaskDef = {
      id: taskId,
      title: `Fix gap: ${missingOutputs.join(", ")}`,
      description: `Generate missing outputs required by ${requiredByTask}`,
      outputs: missingOutputs,
      prompt,
      gapFixerMetadata: {
        gapId: gap.id,
        parentTaskId: requiredByTask,
        attempt: attemptNumber,
        spawnedAt: new Date().toISOString(),
      },
    };

    return taskDef;
  }

  /**
   * Persist gap-fixer task to disk.
   * Follows the same structure as Seed-spawned tasks.
   */
  async persistGapFixerTask(
    taskDef: GapFixerTaskDef,
    epicPath: string,
  ): Promise<string> {
    const taskPath = join(epicPath, taskDef.id);
    await mkdir(taskPath, { recursive: true });

    const taskMdPath = join(taskPath, "TASK.md");
    const content = this.generateSkillMd(taskDef);

    await writeFile(taskMdPath, content, "utf-8");

    return taskPath;
  }

  /* ---------------------------------------------------------------- */
  /*  Private Helpers                                                 */
  /* ---------------------------------------------------------------- */

  private isGlobPattern(input: string): boolean {
    return input.includes("*") || input.includes("?");
  }

  private buildTaskGenerationPrompt(gap: MissingIntermediateGap): string {
    const { missingOutputs, requiredByTask, lastProducingTask } = gap.metadata;

    return `
# Gap-Fixer Task Generation

You need to create a task that generates the missing outputs required by the downstream task.

## Context

**Missing Outputs:** ${missingOutputs.join(", ")}
**Required By:** ${requiredByTask}
**Last Upstream Task:** ${lastProducingTask || "none"}

## Your Mission

Create the missing files that ${requiredByTask} needs as inputs.

## Instructions

1. **Analyze Requirements**
   - Read the task definition for ${requiredByTask}
   - Understand what these files should contain
   - Check if there are existing skills that can generate them

2. **Generate Files**
   For each missing output:
   ${missingOutputs.map((output) => `   - Create ${output}`).join("\n")}

3. **Validation**
   - Ensure files exist
   - Validate file format (JSON, Markdown, etc.)
   - Check content is meaningful

## Success Criteria

After completion:
${missingOutputs.map((output) => `- ✅ ${output} exists and is valid`).join("\n")}
- ✅ Files contain the expected structure
- ✅ Downstream task ${requiredByTask} can proceed

## Available Tools

You have access to:
- Read: Read existing files for context
- Write: Create new files
- Glob: Find existing files
- Bash: Run validation commands

## Important Notes

- This is an automatically generated gap-fixer task
- Focus on creating the minimum viable outputs
- Ensure outputs match the schema expected by ${requiredByTask}
- If you're unsure about format, check similar existing files
    `.trim();
  }

  private generateSkillMd(taskDef: GapFixerTaskDef): string {
    const fm: string[] = ["---"];
    fm.push(`name: ${this.yamlStr(taskDef.title || taskDef.id)}`);
    if (taskDef.description) {
      fm.push(`description: ${this.yamlStr(taskDef.description)}`);
    }
    fm.push(`gap-fixer: true`);
    fm.push(`gap-id: ${taskDef.gapFixerMetadata.gapId}`);
    fm.push(`parent-task: ${taskDef.gapFixerMetadata.parentTaskId}`);
    fm.push(`attempt: ${taskDef.gapFixerMetadata.attempt}`);

    if (taskDef.inputs?.length) {
      fm.push("inputs:");
      taskDef.inputs.forEach((i) => fm.push(`  - ${this.yamlStr(i)}`));
    }

    if (taskDef.outputs?.length) {
      fm.push("outputs:");
      taskDef.outputs.forEach((o) => fm.push(`  - ${this.yamlStr(o)}`));
    }

    fm.push("---");
    fm.push("");
    fm.push(typeof taskDef.prompt === "string" ? taskDef.prompt : "");

    return fm.join("\n");
  }

  private yamlStr(value: string): string {
    if (
      /[:#\[\]{}&*!|>'"%@`,]/.test(value) ||
      /^\s/.test(value) ||
      value.includes("\n")
    ) {
      return JSON.stringify(value);
    }
    return value;
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Functions                                                 */
/* ------------------------------------------------------------------ */

export function createGapTaskSpawner(projectDir: string): GapTaskSpawner {
  return new GapTaskSpawner(projectDir);
}
