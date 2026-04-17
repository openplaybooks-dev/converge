/**
 * Task Helper
 *
 * Provides access to task metadata and logs for repair strategies.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getJournalStructure } from '../../journal/structure.js';
import { parse as parseYaml } from 'yaml';
import type { TaskHelper, TaskDefinition, AttemptRecord } from '../types.ts';

/* ------------------------------------------------------------------ */
/*  Task Helper Implementation                                        */
/* ------------------------------------------------------------------ */

export class TaskHelperImpl implements TaskHelper {
  constructor(
    private readonly projectDir: string,
    private readonly epicId: string
  ) {}

  /**
   * Get task definition from TASK.md
   */
  async getDefinition(taskId: string): Promise<TaskDefinition> {
    try {
      const skillPath = this.getSkillPath(taskId);

      if (!existsSync(skillPath)) {
        throw new Error(`TASK.md not found for task ${taskId}`);
      }

      const content = await readFile(skillPath, 'utf-8');
      const { frontmatter } = this.parseTaskMd(content);

      return frontmatter;
    } catch (err: any) {
      throw new Error(`Failed to get definition for task ${taskId}: ${err.message}`);
    }
  }

  /**
   * Get last N lines from task logs
   */
  async getLogTail(taskId: string, lines = 50): Promise<string[]> {
    try {
      const logFiles = await this.findLogFiles(taskId);

      if (logFiles.length === 0) {
        return [];
      }

      // Get the most recent log file
      const latestLog = logFiles[logFiles.length - 1];
      const content = await readFile(latestLog, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());

      // Return last N lines
      return allLines.slice(-lines);
    } catch (err: any) {
      console.warn(`Failed to read log tail for task ${taskId}:`, err.message);
      return [];
    }
  }

  /**
   * Get all attempt records for a task
   */
  async getAttempts(taskId: string): Promise<AttemptRecord[]> {
    try {
      const attemptsPath = this.getAttemptsPath(taskId);

      if (!existsSync(attemptsPath)) {
        return [];
      }

      const content = await readFile(attemptsPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      return lines.map(line => JSON.parse(line) as AttemptRecord);
    } catch (err: any) {
      console.warn(`Failed to read attempts for task ${taskId}:`, err.message);
      return [];
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Get the path to TASK.md for a task (handles nested WBS structures)
   */
  getSkillPath(taskId: string): string {
    // Task ID can be a simple ID or a path-like ID (e.g., "002-001-subtask")
    // Try to find TASK.md in the task directory structure

    const epicPath = join(this.projectDir, '.harness', 'epics', this.epicId);

    // Try 1: direct path in epics directory
    const directPath = join(epicPath, taskId, 'TASK.md');
    if (existsSync(directPath)) {
      return directPath;
    }

    // Try 2: WBS subtasks in tasks/ subdirectory (e.g., epics/{epicId}/tasks/{taskId}/TASK.md)
    const tasksPath = join(epicPath, 'tasks', taskId, 'TASK.md');
    if (existsSync(tasksPath)) {
      return tasksPath;
    }

    // Try 3: nested task structure (recursive search for any subdirectory)
    const taskPath = this.findTaskPath(epicPath, taskId);
    if (taskPath) {
      return join(taskPath, 'TASK.md');
    }

    // Default to direct path (will fail if doesn't exist)
    return directPath;
  }

  private findTaskPath(epicPath: string, taskId: string): string | null {
    // Recursively search for task directory matching taskId
    try {
      const search = (dir: string): string | null => {
        if (!existsSync(dir)) return null;

        const items = readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          if (!item.isDirectory()) continue;

          if (item.name === taskId) {
            return join(dir, item.name);
          }

          // Recursively search subdirectories
          const nested = search(join(dir, item.name));
          if (nested) return nested;
        }

        return null;
      };

      return search(epicPath);
    } catch {
      return null;
    }
  }

  private getAttemptsPath(taskId: string): string {
    const structure = getJournalStructure(this.projectDir, this.epicId, taskId);
    return join(structure.task!, 'attempts.jsonl');
  }

  private async findLogFiles(taskId: string): Promise<string[]> {
    try {
      const structure = getJournalStructure(this.projectDir, this.epicId, taskId);
      const attemptsDir = join(structure.task!, 'attempts');

      if (!existsSync(attemptsDir)) {
        return [];
      }

      const attempts = await readdir(attemptsDir, { withFileTypes: true });
      const logFiles: string[] = [];

      for (const attempt of attempts) {
        if (!attempt.isDirectory()) continue;

        const logsDir = join(attemptsDir, attempt.name, 'logs');
        if (!existsSync(logsDir)) continue;

        const logs = await readdir(logsDir);
        const logFile = logs.find(f => f.endsWith('.log'));

        if (logFile) {
          logFiles.push(join(logsDir, logFile));
        }
      }

      // Sort by filename (timestamp-based)
      return logFiles.sort();
    } catch {
      return [];
    }
  }

  private parseTaskMd(content: string): { frontmatter: TaskDefinition; body: string } {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) {
      throw new Error('Invalid TASK.md format: missing frontmatter');
    }

    const frontmatter = parseYaml(match[1]) as TaskDefinition;
    const body = match[2];

    return { frontmatter, body };
  }
}

/* ------------------------------------------------------------------ */
/*  Factory                                                           */
/* ------------------------------------------------------------------ */

export function createTaskHelper(projectDir: string, epicId: string): TaskHelper {
  return new TaskHelperImpl(projectDir, epicId);
}
