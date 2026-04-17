/**
 * Task File Scanner
 *
 * Discovers task and check files from the filesystem using convention-based scanning.
 * Supports hot-reload via file watching.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type {
  ScannerConfig,
  ScanResult,
  TaskFileMetadata,
} from './types.ts';
import type { TaskConfig } from '../storage/types.ts';

/* ------------------------------------------------------------------ */
/*  Task File Scanner                                                 */
/* ------------------------------------------------------------------ */

export class TaskFileScanner {
  private config: ScannerConfig;
  private listeners: Map<string, Array<(file: string) => void>> = new Map();

  constructor(config: ScannerConfig) {
    this.config = {
      debounceMs: 100,
      watch: false,
      autoRegister: true,
      ...config,
    };
  }

  /**
   * Scan task and check files from filesystem
   */
  async scan(): Promise<ScanResult> {
    const errors: string[] = [];
    const tasks: TaskFileMetadata[] = [];
    const checks: Array<{ file: string; checkId: string }> = [];

    // Scan task files
    try {
      const taskFiles = await this.scanTaskFiles();
      tasks.push(...taskFiles);
    } catch (error: any) {
      errors.push(`Error scanning task files: ${error.message}`);
    }

    // Scan check files
    try {
      const checkFiles = await this.scanCheckFiles();
      checks.push(...checkFiles);
    } catch (error: any) {
      errors.push(`Error scanning check files: ${error.message}`);
    }

    return {
      tasks,
      checks,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Scan task files from .harness/tasks/ directory
   */
  private async scanTaskFiles(): Promise<TaskFileMetadata[]> {
    const tasksDir = this.config.tasksDir;

    // Ensure directory exists
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
      return [];
    }

    // Find all .ts files in tasks directory
    const pattern = path.join(tasksDir, '*.ts');
    const files = await glob(pattern);

    // Parse each file
    const tasks: TaskFileMetadata[] = [];

    for (const file of files) {
      try {
        const metadata = await this.parseTaskFile(file);
        if (metadata) {
          tasks.push(metadata);
        }
      } catch (error: any) {
        console.warn(`Failed to parse task file ${file}: ${error.message}`);
      }
    }

    // Sort by priority (numeric prefix)
    tasks.sort((a, b) => a.priority - b.priority);

    return tasks;
  }

  /**
   * Parse a single task file
   */
  private async parseTaskFile(filePath: string): Promise<TaskFileMetadata | null> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.ts');

    // Extract priority from filename (e.g., "001-setup-db.ts" → 1)
    const priority = this.extractPriority(fileName);

    // Try to extract task ID from filename or content
    const taskId = this.extractTaskId(fileName, content);

    if (!taskId) {
      return null;
    }

    // Create a basic task config from the file
    // In a real implementation, this would dynamically import and execute the file
    // For now, we'll extract metadata from the file content
    const task: TaskConfig = {
      id: taskId,
      title: this.extractTitle(content) || fileName,
      description: this.extractDescription(content),
      type: this.extractType(content),
      deps: this.extractDeps(content),
      checks: this.extractChecks(content),
      inputs: this.extractInputs(content),
      outputs: this.extractOutputs(content),
      metadata: {
        created: fs.statSync(filePath).birthtime.toISOString(),
        updated: fs.statSync(filePath).mtime.toISOString(),
      },
    };

    return {
      filePath,
      task,
      priority,
      isValid: true, // In real impl, would check TypeScript compilation
      parseErrors: undefined,
    };
  }

  /**
   * Extract priority from filename (e.g., "001-task.ts" → 1)
   */
  private extractPriority(fileName: string): number {
    const match = fileName.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 999;
  }

  /**
   * Extract task ID from filename or content
   */
  private extractTaskId(fileName: string, content: string): string | null {
    // Try to extract from .id() call
    const idMatch = content.match(/\.id\(['"]([^'"]+)['"]\)/);
    if (idMatch) {
      return idMatch[1];
    }

    // Fall back to filename without numeric prefix
    return fileName.replace(/^\d+-/, '');
  }

  /**
   * Extract title from .title() call
   */
  private extractTitle(content: string): string | null {
    const match = content.match(/\.title\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : null;
  }

  /**
   * Extract description from .description() call
   */
  private extractDescription(content: string): string | undefined {
    const match = content.match(/\.description\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract type from .type() call
   */
  private extractType(content: string): string | undefined {
    const match = content.match(/\.type\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract deps from .deps() call
   */
  private extractDeps(content: string): string[] {
    const match = content.match(/\.deps\(\[([^\]]+)\]\)/);
    if (!match) return [];

    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }

  /**
   * Extract checks from .checks() call
   */
  private extractChecks(content: string): string[] | undefined {
    const match = content.match(/\.checks\(\[([^\]]+)\]\)/);
    if (!match) return undefined;

    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }

  /**
   * Extract inputs from .inputs() call
   */
  private extractInputs(content: string): string[] | undefined {
    const match = content.match(/\.inputs\(\[([^\]]+)\]\)/);
    if (!match) return undefined;

    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }

  /**
   * Extract outputs from .outputs() call
   */
  private extractOutputs(content: string): string[] | undefined {
    const match = content.match(/\.outputs\(\[([^\]]+)\]\)/);
    if (!match) return undefined;

    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }

  /**
   * Scan check files from .harness/checks/ directory
   */
  private async scanCheckFiles(): Promise<Array<{ file: string; checkId: string }>> {
    const checksDir = this.config.checksDir;

    // Ensure directory exists
    if (!fs.existsSync(checksDir)) {
      fs.mkdirSync(checksDir, { recursive: true });
      return [];
    }

    // Find all .ts files in checks directory
    const pattern = path.join(checksDir, '*.ts');
    const files = await glob(pattern);

    // Extract check IDs from filenames (kebab-case)
    return files.map((file) => ({
      file,
      checkId: path.basename(file, '.ts'),
    }));
  }

  /**
   * Enable watch mode for hot-reload
   */
  watch(): void {
    if (!this.config.watch) {
      return;
    }

    // In a real implementation, would use chokidar or fs.watch
    console.log('[TaskFileScanner] Watch mode not yet implemented');
  }

  /**
   * Register event listener
   */
  on(event: 'task-added' | 'task-changed' | 'task-removed' | 'check-added', handler: (file: string) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * Stop watching
   */
  stop(): void {
    // Cleanup watchers
    this.listeners.clear();
  }
}

/**
 * Create a new task file scanner
 */
export function createTaskFileScanner(config: ScannerConfig): TaskFileScanner {
  return new TaskFileScanner(config);
}
