/**
 * Progress Logger
 *
 * Provides clear, structured logging of converge execution progress.
 * Shows plan, queue, execution status, and overall progress.
 */

import type { Gap } from "../gap/types.ts";

/**
 * Task execution status
 */
export type TaskStatus =
  | "pending"
  | "executing"
  | "completed"
  | "failed"
  | "skipped";

/**
 * Task in the execution queue
 */
export interface QueuedTask {
  id: string;
  title: string;
  status: TaskStatus;
  gaps: Gap[];
  startedAt?: string;
  completedAt?: string;
}

/**
 * Execution plan summary
 */
export interface ExecutionPlan {
  name: string;
  description: string;
  tasks: QueuedTask[];
  totalGaps: number;
  strategy: string;
}

/**
 * Progress Logger - clear, structured output
 */
export class ProgressLogger {
  private currentPlan?: ExecutionPlan;
  private currentTask?: QueuedTask;

  /**
   * Show the execution plan
   */
  logPlan(plan: ExecutionPlan): void {
    console.log("\n" + "=".repeat(60));
    console.log(`📋 EXECUTION PLAN: ${plan.name}`);
    console.log("=".repeat(60));
    console.log(`   Strategy: ${plan.strategy}`);
    console.log(`   Total Gaps: ${plan.totalGaps}`);
    console.log(`   Tasks: ${plan.tasks.length}`);
    console.log("");

    this.currentPlan = plan;
  }

  /**
   * Show the task queue
   */
  logQueue(): void {
    if (!this.currentPlan) return;

    console.log("📊 TASK QUEUE:");
    console.log("");

    for (let i = 0; i < this.currentPlan.tasks.length; i++) {
      const task = this.currentPlan.tasks[i];
      const icon = this.getStatusIcon(task.status);
      const position = `[${i + 1}/${this.currentPlan.tasks.length}]`;

      console.log(`   ${position} ${icon} ${task.title}`);
      console.log(`       Status: ${task.status}`);
      console.log(`       Gaps: ${task.gaps.length}`);

      if (task.status === "executing") {
        console.log(`       ⏳ In progress...`);
      } else if (task.status === "completed" && task.completedAt) {
        console.log(
          `       ✅ Completed at ${new Date(task.completedAt).toLocaleTimeString()}`,
        );
      } else if (task.status === "failed") {
        console.log(`       ❌ Failed`);
      }

      console.log("");
    }
  }

  /**
   * Log start of task execution
   */
  logTaskStart(task: QueuedTask): void {
    this.currentTask = task;
    task.status = "executing";
    task.startedAt = new Date().toISOString();

    console.log("\n" + "─".repeat(60));
    console.log(`▶️  ${task.title}`);
    console.log("─".repeat(60));

    // Show what each gap needs to produce (the missing output path)
    for (const gap of task.gaps) {
      const outputMatch = gap.description.match(
        /Task output not created: (.+)$/,
      );
      const blockerMatch = gap.description.match(
        /Missing required input: (.+)$/,
      );
      if (outputMatch) {
        console.log(`   → produce: ${outputMatch[1]}`);
      } else if (blockerMatch) {
        console.log(`   ⛔ blocked: ${blockerMatch[1]} not yet available`);
      } else {
        console.log(`   • ${gap.description.replace(/^\[.*?\]\s*/, "")}`);
      }
    }
    console.log("");
  }

  /**
   * Log task completion
   */
  logTaskComplete(task: QueuedTask, success: boolean): void {
    task.status = success ? "completed" : "failed";
    task.completedAt = new Date().toISOString();

    const icon = success ? "✅" : "❌";
    const status = success ? "COMPLETED" : "FAILED";
    const progress = this.getProgress();

    console.log("\n" + "─".repeat(60));
    console.log(`${icon} TASK ${status} [${progress}]`);
    console.log("─".repeat(60));
    console.log(`   Task: ${task.title}`);

    if (success) {
      console.log(`   Gaps Fixed: ${task.gaps.length}`);
    } else {
      console.log(`   Gaps Remaining: ${task.gaps.length}`);
    }

    console.log("");
  }

  /**
   * Log gap being fixed
   */
  logGapFix(gap: Gap, step: string): void {
    console.log(`   ${step}: ${gap.description}`);
  }

  /**
   * Show overall progress
   */
  logProgress(): void {
    if (!this.currentPlan) return;

    const completed = this.currentPlan.tasks.filter(
      (t) => t.status === "completed",
    ).length;
    const failed = this.currentPlan.tasks.filter(
      (t) => t.status === "failed",
    ).length;
    const pending = this.currentPlan.tasks.filter(
      (t) => t.status === "pending",
    ).length;
    const executing = this.currentPlan.tasks.filter(
      (t) => t.status === "executing",
    ).length;

    const percentage = Math.round(
      (completed / this.currentPlan.tasks.length) * 100,
    );

    console.log("\n" + "=".repeat(60));
    console.log("📈 OVERALL PROGRESS");
    console.log("=".repeat(60));
    console.log(`   Completion: ${percentage}%`);
    console.log(`   Completed: ${completed}/${this.currentPlan.tasks.length}`);
    console.log(`   Executing: ${executing}`);
    console.log(`   Pending: ${pending}`);
    console.log(`   Failed: ${failed}`);
    console.log("");
  }

  /**
   * Get progress string (e.g., "2/5")
   */
  private getProgress(): string {
    if (!this.currentPlan) return "?/?";

    const completed = this.currentPlan.tasks.filter(
      (t) => t.status === "completed" || t.status === "executing",
    ).length;

    return `${completed}/${this.currentPlan.tasks.length}`;
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case "pending":
        return "⏸️";
      case "executing":
        return "▶️";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      case "skipped":
        return "⏭️";
      default:
        return "❓";
    }
  }

  /**
   * Show iteration summary
   */
  logIterationSummary(
    iteration: number,
    gapsResolved: number,
    errors: number,
  ): void {
    console.log("\n" + "=".repeat(60));
    console.log(`✅ ITERATION ${iteration} COMPLETE`);
    console.log("=".repeat(60));
    console.log(`   Gaps Resolved: ${gapsResolved}`);
    console.log(`   Errors: ${errors}`);
    console.log("");
  }
}
