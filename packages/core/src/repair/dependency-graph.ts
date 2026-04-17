/**
 * File Dependency Graph
 *
 * Tracks which tasks produce and consume which files.
 * Used by repair strategies to identify upstream tasks that should be re-run
 * when files are missing.
 */

import type { Unit } from '../unit/unit.ts';

/* ------------------------------------------------------------------ */
/*  File Dependency Graph                                             */
/* ------------------------------------------------------------------ */

export class FileDependencyGraph {
  // Map: file pattern -> task IDs that produce it
  private producers = new Map<string, string[]>();

  // Map: file pattern -> task IDs that consume it
  private consumers = new Map<string, string[]>();

  // Map: task ID -> { inputs, outputs }
  private taskFiles = new Map<string, { inputs: string[]; outputs: string[] }>();

  /**
   * Build the dependency graph from a collection of units
   */
  async build(units: Unit[]): Promise<void> {
    this.producers.clear();
    this.consumers.clear();
    this.taskFiles.clear();

    for (const unit of units) {
      // Register outputs (what this task produces)
      if (unit.outputs && unit.outputs.length > 0) {
        for (const output of unit.outputs) {
          if (!this.producers.has(output)) {
            this.producers.set(output, []);
          }
          this.producers.get(output)!.push(unit.id);
        }
      }

      // Register inputs (what this task consumes)
      if (unit.inputs && unit.inputs.length > 0) {
        for (const input of unit.inputs) {
          if (!this.consumers.has(input)) {
            this.consumers.set(input, []);
          }
          this.consumers.get(input)!.push(unit.id);
        }
      }

      // Store task file metadata
      this.taskFiles.set(unit.id, {
        inputs: unit.inputs ?? [],
        outputs: unit.outputs ?? [],
      });
    }
  }

  /**
   * Find which task produces a given file pattern.
   * Returns the task ID or null if no producer found.
   */
  findProducer(filePattern: string): string | null {
    // First try exact match
    const producers = this.producers.get(filePattern);
    if (producers && producers.length > 0) {
      return producers[0]; // Return first producer
    }

    // Try fuzzy match - check if any output pattern could match this file
    for (const [outputPattern, taskIds] of this.producers.entries()) {
      if (this.patternMatches(filePattern, outputPattern)) {
        return taskIds[0];
      }
    }

    return null;
  }

  /**
   * Find all tasks that consume a given file pattern.
   */
  findConsumers(filePattern: string): string[] {
    // First try exact match
    const consumers = this.consumers.get(filePattern);
    if (consumers && consumers.length > 0) {
      return consumers;
    }

    // Try fuzzy match
    const allConsumers: string[] = [];
    for (const [inputPattern, taskIds] of this.consumers.entries()) {
      if (this.patternMatches(filePattern, inputPattern)) {
        allConsumers.push(...taskIds);
      }
    }

    return Array.from(new Set(allConsumers)); // Remove duplicates
  }

  /**
   * Get all inputs for a task
   */
  getTaskInputs(taskId: string): string[] {
    return this.taskFiles.get(taskId)?.inputs ?? [];
  }

  /**
   * Get all outputs for a task
   */
  getTaskOutputs(taskId: string): string[] {
    return this.taskFiles.get(taskId)?.outputs ?? [];
  }

  /**
   * Find all upstream tasks (tasks that produce inputs for this task)
   */
  findUpstreamTasks(taskId: string): Array<{ taskId: string; producedFile: string }> {
    const inputs = this.getTaskInputs(taskId);
    const upstream: Array<{ taskId: string; producedFile: string }> = [];

    for (const input of inputs) {
      const producer = this.findProducer(input);
      if (producer) {
        upstream.push({ taskId: producer, producedFile: input });
      }
    }

    return upstream;
  }

  /**
   * Find all downstream tasks (tasks that consume outputs from this task)
   */
  findDownstreamTasks(taskId: string): Array<{ taskId: string; consumedFile: string }> {
    const outputs = this.getTaskOutputs(taskId);
    const downstream: Array<{ taskId: string; consumedFile: string }> = [];

    for (const output of outputs) {
      const consumers = this.findConsumers(output);
      for (const consumer of consumers) {
        if (consumer !== taskId) {
          downstream.push({ taskId: consumer, consumedFile: output });
        }
      }
    }

    return downstream;
  }

  /**
   * Generate a textual report of the dependency graph
   */
  generateReport(): string {
    const lines: string[] = [
      'File Dependency Graph',
      '====================',
      '',
    ];

    // Group by producer task
    const tasksByProducer = new Map<string, string[]>();
    for (const [pattern, taskIds] of this.producers.entries()) {
      for (const taskId of taskIds) {
        if (!tasksByProducer.has(taskId)) {
          tasksByProducer.set(taskId, []);
        }
        tasksByProducer.get(taskId)!.push(pattern);
      }
    }

    for (const [taskId, outputs] of tasksByProducer.entries()) {
      lines.push(`Task: ${taskId}`);
      lines.push('  Produces:');
      for (const output of outputs) {
        const consumers = this.findConsumers(output);
        lines.push(`    - ${output}`);
        if (consumers.length > 0) {
          lines.push(`      Consumed by: ${consumers.join(', ')}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Check if a file path matches a glob pattern.
   * Simple implementation - doesn't handle all glob syntax.
   */
  private patternMatches(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    // Simple implementation - just handle * and **
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Functions                                                 */
/* ------------------------------------------------------------------ */

/**
 * Create a new file dependency graph
 */
export function createFileDependencyGraph(): FileDependencyGraph {
  return new FileDependencyGraph();
}
