/**
 * Replan Engine
 *
 * Handles filesystem-based replanning by modifying task files.
 * Operations: create, edit, rename (reorder), delete task files.
 */

import * as fs from "fs";
import * as path from "path";
import type {
  ReplanResult,
  ReplanContext,
  ReplanTrigger,
  FeedbackHistory,
} from "./types.ts";
import type { Gap } from "../gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Replan Engine                                                     */
/* ------------------------------------------------------------------ */

export class ReplanEngine {
  private tasksDir: string;

  constructor(tasksDir: string) {
    this.tasksDir = tasksDir;
  }

  /**
   * Replan by modifying filesystem based on gaps and feedback
   */
  async replanFromGaps(
    gaps: Gap[],
    feedbackHistory: FeedbackHistory,
    trigger: ReplanTrigger,
  ): Promise<ReplanResult> {
    console.log(`[ReplanEngine] Replanning due to: ${trigger}`);

    const context: ReplanContext = {
      gaps,
      feedbackHistory,
      trigger,
    };

    // Analyze current situation and determine replanning strategy
    const strategy = this.determineReplanStrategy(context);

    // Execute replanning operations
    const result: ReplanResult = {
      created: [],
      modified: [],
      renamed: [],
      deleted: [],
      rationale: `Replanning due to ${trigger}`,
    };

    switch (strategy) {
      case "add-parallel-approach":
        // Add new tasks for alternative approach
        result.created = await this.addParallelTasks(gaps);
        result.rationale = "Adding parallel tasks for alternative approach";
        break;

      case "reorder-priorities":
        // Reorder tasks to deprioritize blocked items
        result.renamed = await this.reorderTasks(gaps);
        result.rationale = "Reordering tasks to avoid blocked paths";
        break;

      case "split-complex-tasks":
        // Split complex failing tasks into smaller pieces
        result.created = await this.splitComplexTasks(feedbackHistory);
        result.rationale = "Splitting complex tasks into smaller units";
        break;

      case "remove-obsolete":
        // Remove tasks that are no longer relevant
        result.deleted = await this.removeObsoleteTasks(gaps);
        result.rationale = "Removing obsolete tasks";
        break;

      case "modify-approach":
        // Modify existing tasks with different approach
        result.modified = await this.modifyTaskApproach(feedbackHistory);
        result.rationale = "Modifying task approach based on feedback";
        break;

      default:
        result.rationale = "No replanning needed";
    }

    return result;
  }

  /**
   * Determine replanning strategy based on context
   */
  private determineReplanStrategy(context: ReplanContext): string {
    const { trigger, feedbackHistory, gaps } = context;

    switch (trigger) {
      case "stalled-progress":
        // If stalled, try parallel approach
        return "add-parallel-approach";

      case "blocked-path":
        // If blocked, reorder to work on unblocked items
        return "reorder-priorities";

      case "major-gap":
        // If major gap, might need to add new tasks
        return "add-parallel-approach";

      case "better-approach":
        // If better approach found, modify existing tasks
        return "modify-approach";

      default:
        return "no-change";
    }
  }

  /**
   * Add parallel tasks for alternative approach
   */
  private async addParallelTasks(gaps: Gap[]): Promise<string[]> {
    const created: string[] = [];

    // In real impl, LLM would generate alternative approaches
    for (const gap of gaps.slice(0, 2)) {
      // Limit to 2 alternatives
      const taskId = `alt-${gap.id}`;
      const filePath = await this.createTaskFile({
        id: taskId,
        title: `Alternative approach for ${gap.description}`,
        description: `Try a different strategy to resolve: ${gap.description}`,
      });
      created.push(filePath);
    }

    return created;
  }

  /**
   * Reorder tasks to change priorities
   */
  private async reorderTasks(
    gaps: Gap[],
  ): Promise<Array<{ from: string; to: string }>> {
    const renamed: Array<{ from: string; to: string }> = [];

    // In real impl, would analyze gaps to determine reordering
    // For now, just demonstrate the concept

    const files = this.getExistingTaskFiles();

    // Example: Move blocked task to lower priority
    if (files.length > 0) {
      const firstFile = files[0];
      const newName = this.changeTaskPriority(firstFile, 999);

      if (newName !== firstFile) {
        fs.renameSync(firstFile, newName);
        renamed.push({ from: firstFile, to: newName });
      }
    }

    return renamed;
  }

  /**
   * Split complex tasks into smaller pieces
   */
  private async splitComplexTasks(
    feedbackHistory: FeedbackHistory,
  ): Promise<string[]> {
    const created: string[] = [];

    // In real impl, would analyze feedback to identify complex tasks
    // For now, create a couple of sub-tasks as example

    if (feedbackHistory.attempts.length >= 3) {
      // Task has failed multiple times, split it
      const taskId = feedbackHistory.taskId;

      // Create sub-tasks
      for (let i = 1; i <= 2; i++) {
        const subTaskPath = await this.createTaskFile({
          id: `${taskId}-subtask-${i}`,
          title: `Subtask ${i} of ${taskId}`,
          description: `Smaller piece of work from ${taskId}`,
        });
        created.push(subTaskPath);
      }
    }

    return created;
  }

  /**
   * Remove obsolete tasks
   */
  private async removeObsoleteTasks(gaps: Gap[]): Promise<string[]> {
    const deleted: string[] = [];

    // In real impl, would identify obsolete tasks
    // For now, just demonstrate the concept

    return deleted;
  }

  /**
   * Modify existing tasks with different approach
   */
  private async modifyTaskApproach(
    feedbackHistory: FeedbackHistory,
  ): Promise<string[]> {
    const modified: string[] = [];

    // In real impl, would rewrite task files with different approach
    // For now, just demonstrate the concept

    return modified;
  }

  /**
   * Create a new task file
   */
  private async createTaskFile(task: {
    id: string;
    title: string;
    description: string;
  }): Promise<string> {
    const existingFiles = this.getExistingTaskFiles();
    const maxPriority = existingFiles.reduce((max, file) => {
      const p = this.extractPriorityFromPath(file);
      return Math.max(max, p);
    }, 0);

    const priority = maxPriority + 1;
    const paddedPriority = priority.toString().padStart(3, "0");
    const fileName = `${paddedPriority}-${task.id}.ts`;
    const filePath = path.join(this.tasksDir, fileName);

    const content = this.generateTaskFileContent(task);
    fs.writeFileSync(filePath, content, "utf-8");

    return filePath;
  }

  /**
   * Change task priority by renaming file
   */
  private changeTaskPriority(filePath: string, newPriority: number): string {
    const fileName = path.basename(filePath);
    const nameWithoutPriority = fileName.replace(/^\d+-/, "");
    const paddedPriority = newPriority.toString().padStart(3, "0");
    const newFileName = `${paddedPriority}-${nameWithoutPriority}`;
    return path.join(path.dirname(filePath), newFileName);
  }

  /**
   * Get existing task files
   */
  private getExistingTaskFiles(): string[] {
    if (!fs.existsSync(this.tasksDir)) {
      return [];
    }

    return fs
      .readdirSync(this.tasksDir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => path.join(this.tasksDir, file))
      .sort();
  }

  /**
   * Extract priority from file path
   */
  private extractPriorityFromPath(filePath: string): number {
    const fileName = path.basename(filePath, ".ts");
    const match = fileName.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Generate task file content
   */
  private generateTaskFileContent(task: {
    id: string;
    title: string;
    description: string;
  }): string {
    return `/**
 * Task: ${task.title}
 *
 * ${task.description}
 */

import { taskDef } from '../functions/builders.ts';

export default taskDef()
  .id('${task.id}')
  .title('${task.title}')
  .description('${task.description}')
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
}

/**
 * Create a new replan engine
 */
export function createReplanEngine(tasksDir: string): ReplanEngine {
  return new ReplanEngine(tasksDir);
}
