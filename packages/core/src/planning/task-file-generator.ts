/**
 * Task File Generator
 *
 * Generates task files (.ts) from high-level objectives using AI.
 * The folder structure IS the plan - each file is a self-describing, executable task.
 */

import * as fs from "fs";
import * as path from "path";
import type {
  PlanGenerationConfig,
  PlanGenerationResult,
  GapFillContext,
  GapFillResult,
} from "./types.ts";
import type { Gap } from "../task/gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Task File Generator                                               */
/* ------------------------------------------------------------------ */

export class TaskFileGenerator {
  private tasksDir: string;

  constructor(tasksDir: string) {
    this.tasksDir = tasksDir;

    // Ensure directory exists
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }
  }

  /**
   * Generate task files from a high-level objective
   *
   * In a real implementation, this would use an LLM (Claude) to:
   * 1. Break down the objective into concrete tasks
   * 2. Generate TypeScript code for each task file
   * 3. Write files with appropriate numbering/ordering
   *
   * For now, this is a simplified implementation showing the structure.
   */
  async generateTaskFiles(
    objective: string,
    config: PlanGenerationConfig,
  ): Promise<PlanGenerationResult> {
    console.log(`[TaskFileGenerator] Generating plan for objective: ${objective}`);

    // In real impl, this would call an LLM to generate the plan
    // For now, return a mock result showing the structure
    const tasks = await this.planFromObjective(objective, config);

    // Write task files
    const files: string[] = [];
    let priority = 1;

    for (const task of tasks) {
      const filePath = await this.writeTaskFile(priority, task);
      files.push(filePath);
      priority++;
    }

    return {
      files,
      taskCount: tasks.length,
      estimatedComplexity: this.estimateComplexity(tasks),
      rationale: `Generated ${tasks.length} tasks from objective: "${objective}"`,
    };
  }

  /**
   * Fill gaps by creating new task files
   */
  async fillGaps(gaps: Gap[], context: GapFillContext): Promise<GapFillResult> {
    console.log(`[TaskFileGenerator] Filling ${gaps.length} gaps`);

    // In real impl, LLM would analyze gaps and generate appropriate tasks
    const newTasks = await this.generateGapFillingTasks(gaps, context);

    // Find insertion point
    const existingFiles = this.getExistingTaskFiles();
    const insertAfter = this.findInsertionPoint(gaps, existingFiles);

    // Write new task files
    const created: string[] = [];
    const startPriority = insertAfter
      ? this.extractPriorityFromPath(insertAfter) + 1
      : 1;

    for (let i = 0; i < newTasks.length; i++) {
      const priority = startPriority + i;
      const filePath = await this.writeTaskFile(priority, newTasks[i]);
      created.push(filePath);
    }

    return {
      created,
      insertedAfter: insertAfter || undefined,
      rationale: `Created ${newTasks.length} tasks to fill gaps`,
    };
  }

  /**
   * Add a single task file dynamically
   */
  async addTaskFile(
    description: string,
    context: {
      projectObjective: string;
      existingTasks: string[];
      gaps?: Gap[];
    },
  ): Promise<{
    filePath: string;
    taskId: string;
    priority: number;
  }> {
    console.log(`[TaskFileGenerator] Adding task: ${description}`);

    // Generate task config from description
    const task = await this.generateSingleTask(description, context);

    // Determine priority (insert at end by default)
    const existingFiles = this.getExistingTaskFiles();
    const maxPriority = existingFiles.reduce((max, file) => {
      const p = this.extractPriorityFromPath(file);
      return Math.max(max, p);
    }, 0);

    const priority = maxPriority + 1;

    // Write task file
    const filePath = await this.writeTaskFile(priority, task);

    return {
      filePath,
      taskId: task.id,
      priority,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Private Implementation Methods                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Break down objective into concrete tasks using LLM
   * (Simplified mock implementation)
   */
  private async planFromObjective(
    objective: string,
    config: PlanGenerationConfig,
  ): Promise<
    Array<{ id: string; title: string; description: string; type?: string }>
  > {
    // In real implementation, this would call Claude API to generate tasks
    // For now, return mock tasks based on common patterns

    const tasks = [
      {
        id: "setup-project",
        title: "Set up project structure",
        description: "Initialize project with necessary configuration",
        type: "setup",
      },
      {
        id: "implement-core",
        title: "Implement core functionality",
        description: `Implement the main features for: ${objective}`,
        type: "implementation",
      },
      {
        id: "add-tests",
        title: "Add tests",
        description: "Write tests for core functionality",
        type: "testing",
      },
    ];

    return tasks;
  }

  /**
   * Generate tasks to fill detected gaps
   */
  private async generateGapFillingTasks(
    gaps: Gap[],
    context: GapFillContext,
  ): Promise<Array<{ id: string; title: string; description: string }>> {
    // In real impl, LLM would analyze gaps and generate appropriate tasks
    return gaps.map((gap) => ({
      id: `fix-${gap.id}`,
      title: `Fix: ${gap.description}`,
      description: `Resolve gap: ${gap.description}`,
    }));
  }

  /**
   * Generate a single task from description
   */
  private async generateSingleTask(
    description: string,
    context: {
      projectObjective: string;
      existingTasks: string[];
      gaps?: Gap[];
    },
  ): Promise<{ id: string; title: string; description: string }> {
    // In real impl, LLM would generate task details
    const id = description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return {
      id,
      title: description,
      description: `Task: ${description}`,
    };
  }

  /**
   * Write a task file to disk
   */
  private async writeTaskFile(
    priority: number,
    task: { id: string; title: string; description: string; type?: string },
  ): Promise<string> {
    const paddedPriority = priority.toString().padStart(3, "0");
    const fileName = `${paddedPriority}-${task.id}.ts`;
    const filePath = path.join(this.tasksDir, fileName);

    const content = this.generateTaskFileContent(task);

    fs.writeFileSync(filePath, content, "utf-8");

    console.log(`[TaskFileGenerator] Created: ${filePath}`);

    return filePath;
  }

  /**
   * Generate TypeScript content for a task file
   */
  private generateTaskFileContent(task: {
    id: string;
    title: string;
    description: string;
    type?: string;
  }): string {
    return `/**
 * Task: ${task.title}
 *
 * ${task.description}
 */

import { taskDef } from '../functions/builders';

export default taskDef()
  .id('${task.id}')
  .title('${task.title}')
  .description('${task.description}')
  ${task.type ? `.type('${task.type}')` : ""}
  .run(async (ctx) => {
    // TODO: Implement task logic
    ctx.log.info('Executing: ${task.title}');

    return {
      success: true,
      message: 'Task completed successfully',
    };
  })
  .build();
`;
  }

  /**
   * Get list of existing task files
   */
  private getExistingTaskFiles(): string[] {
    if (!fs.existsSync(this.tasksDir)) {
      return [];
    }

    return fs
      .readdirSync(this.tasksDir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => path.join(this.tasksDir, file));
  }

  /**
   * Extract priority number from file path
   */
  private extractPriorityFromPath(filePath: string): number {
    const fileName = path.basename(filePath, ".ts");
    const match = fileName.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Find where to insert new gap-filling tasks
   */
  private findInsertionPoint(
    gaps: Gap[],
    existingFiles: string[],
  ): string | null {
    // In real impl, would analyze gaps to determine best insertion point
    // For now, insert at end
    return existingFiles.length > 0
      ? existingFiles[existingFiles.length - 1]
      : null;
  }

  /**
   * Estimate complexity of tasks
   */
  private estimateComplexity(
    tasks: Array<{ id: string; title: string; description: string }>,
  ): number {
    // Simple heuristic: complexity based on number of tasks
    return Math.min(100, tasks.length * 10);
  }
}

/**
 * Create a new task file generator
 */
export function createTaskFileGenerator(tasksDir: string): TaskFileGenerator {
  return new TaskFileGenerator(tasksDir);
}
