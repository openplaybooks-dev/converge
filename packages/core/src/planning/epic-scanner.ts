/**
 * Epic File Scanner
 *
 * Auto-discovers epic files from .converge/epics/ directory.
 * Each subdirectory = one epic, with tasks auto-discovered from tasks/ subfolder.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import type { TaskFileMetadata } from './types.ts';
import type { EpicConfig } from '../storage/types.ts';

/* ------------------------------------------------------------------ */
/*  Epic Scanner Types                                                */
/* ------------------------------------------------------------------ */

export interface EpicMetadata {
  id: string;
  name: string;
  description?: string;
  directory: string;
  tasks: TaskFileMetadata[];
  checks: Array<{ file: string; checkId: string }>;
  goals: string[];
}

export interface EpicScanResult {
  epics: EpicMetadata[];
  timestamp: string;
  errors?: string[];
}

/* ------------------------------------------------------------------ */
/*  Epic File Scanner                                                 */
/* ------------------------------------------------------------------ */

export class EpicFileScanner {
  private epicsDir: string;

  constructor(epicsDir: string) {
    this.epicsDir = epicsDir;
  }

  /**
   * Scan all epics from .converge/epics/ directory
   */
  async scan(): Promise<EpicScanResult> {
    const errors: string[] = [];
    const epics: EpicMetadata[] = [];

    // Ensure directory exists
    if (!fs.existsSync(this.epicsDir)) {
      fs.mkdirSync(this.epicsDir, { recursive: true });
      return {
        epics: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Find all subdirectories (each = one epic)
    const entries = fs.readdirSync(this.epicsDir, { withFileTypes: true });
    const epicDirs = entries.filter((e) => e.isDirectory());

    for (const epicDir of epicDirs) {
      try {
        const epicMeta = await this.scanEpic(epicDir.name);
        if (epicMeta) {
          epics.push(epicMeta);
        }
      } catch (error: any) {
        errors.push(`Error scanning epic ${epicDir.name}: ${error.message}`);
      }
    }

    // Sort epics by ID (numeric prefix if present)
    epics.sort((a, b) => {
      const aNum = this.extractPriority(a.id);
      const bNum = this.extractPriority(b.id);
      return aNum - bNum;
    });

    return {
      epics,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Scan a single epic directory
   */
  private async scanEpic(epicId: string): Promise<EpicMetadata | null> {
    const epicDir = path.join(this.epicsDir, epicId);

    // Read epic metadata from epic.yaml or infer from structure
    const name = await this.extractEpicName(epicDir, epicId);
    const description = await this.extractEpicDescription(epicDir);
    const goals = await this.extractEpicGoals(epicDir);

    // Scan tasks from tasks/ subdirectory
    const tasks = await this.scanEpicTasks(epicDir);

    // Scan checks from checks/ subdirectory
    const checks = await this.scanEpicChecks(epicDir);

    return {
      id: epicId,
      name,
      description,
      directory: epicDir,
      tasks,
      checks,
      goals,
    };
  }

  /**
   * Extract epic name from epic.yaml or directory name
   */
  private async extractEpicName(epicDir: string, epicId: string): Promise<string> {
    // Try epic.yaml
    const yamlPath = path.join(epicDir, 'epic.yaml');
    if (fs.existsSync(yamlPath)) {
      try {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/);
        if (nameMatch) return nameMatch[1];
      } catch {
        // Ignore errors
      }
    }

    // Try epic.md
    const mdPath = path.join(epicDir, 'epic.md');
    if (fs.existsSync(mdPath)) {
      try {
        const content = fs.readFileSync(mdPath, 'utf-8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) return titleMatch[1];
      } catch {
        // Ignore errors
      }
    }

    // Fall back to directory name (convert kebab-case to Title Case)
    return epicId
      .replace(/^\d+-/, '') // Remove numeric prefix
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Extract epic description
   */
  private async extractEpicDescription(epicDir: string): Promise<string | undefined> {
    // Try epic.yaml
    const yamlPath = path.join(epicDir, 'epic.yaml');
    if (fs.existsSync(yamlPath)) {
      try {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const descMatch = content.match(/description:\s*["']?([^"'\n]+)["']?/);
        if (descMatch) return descMatch[1];
      } catch {
        // Ignore errors
      }
    }

    // Try epic.md (first paragraph after title)
    const mdPath = path.join(epicDir, 'epic.md');
    if (fs.existsSync(mdPath)) {
      try {
        const content = fs.readFileSync(mdPath, 'utf-8');
        const descMatch = content.match(/^#\s+.+\n\n(.+?)(?:\n\n|$)/m);
        if (descMatch) return descMatch[1];
      } catch {
        // Ignore errors
      }
    }

    return undefined;
  }

  /**
   * Extract epic goals
   */
  private async extractEpicGoals(epicDir: string): Promise<string[]> {
    const goals: string[] = [];

    // Try epic.yaml
    const yamlPath = path.join(epicDir, 'epic.yaml');
    if (fs.existsSync(yamlPath)) {
      try {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        const goalsMatch = content.match(/goals:\s*\n((?:\s*-\s*.+\n?)+)/);
        if (goalsMatch) {
          const goalLines = goalsMatch[1].split('\n').filter((l) => l.trim());
          goals.push(
            ...goalLines.map((line) => line.replace(/^\s*-\s*/, '').trim())
          );
        }
      } catch {
        // Ignore errors
      }
    }

    // Try epic.md (## Goals section)
    const mdPath = path.join(epicDir, 'epic.md');
    if (fs.existsSync(mdPath) && goals.length === 0) {
      try {
        const content = fs.readFileSync(mdPath, 'utf-8');
        const goalsMatch = content.match(/##\s+Goals?\s*\n\n((?:[-*]\s+.+\n?)+)/i);
        if (goalsMatch) {
          const goalLines = goalsMatch[1].split('\n').filter((l) => l.trim());
          goals.push(
            ...goalLines.map((line) => line.replace(/^[-*]\s+/, '').trim())
          );
        }
      } catch {
        // Ignore errors
      }
    }

    return goals;
  }

  /**
   * Scan tasks from epic's tasks/ subdirectory
   */
  private async scanEpicTasks(epicDir: string): Promise<TaskFileMetadata[]> {
    const tasksDir = path.join(epicDir, 'tasks');

    if (!fs.existsSync(tasksDir)) {
      return [];
    }

    // Find all .ts files
    const pattern = path.join(tasksDir, '*.ts');
    const files = await glob(pattern);

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

    // Sort by priority
    tasks.sort((a, b) => a.priority - b.priority);

    return tasks;
  }

  /**
   * Parse a single task file (similar to TaskFileScanner)
   */
  private async parseTaskFile(filePath: string): Promise<TaskFileMetadata | null> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.ts');

    const priority = this.extractPriority(fileName);
    const taskId = this.extractTaskId(fileName, content);

    if (!taskId) {
      return null;
    }

    return {
      filePath,
      task: {
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
      },
      priority,
      isValid: true,
      parseErrors: undefined,
    };
  }

  /**
   * Scan checks from epic's checks/ subdirectory
   */
  private async scanEpicChecks(
    epicDir: string
  ): Promise<Array<{ file: string; checkId: string }>> {
    const checksDir = path.join(epicDir, 'checks');

    if (!fs.existsSync(checksDir)) {
      return [];
    }

    const pattern = path.join(checksDir, '*.ts');
    const files = await glob(pattern);

    return files.map((file) => ({
      file,
      checkId: path.basename(file, '.ts'),
    }));
  }

  /* ------------------------------------------------------------------ */
  /*  Helper Methods (same as TaskFileScanner)                          */
  /* ------------------------------------------------------------------ */

  private extractPriority(name: string): number {
    const match = name.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 999;
  }

  private extractTaskId(fileName: string, content: string): string | null {
    const idMatch = content.match(/\.id\(['"]([^'"]+)['"]\)/);
    if (idMatch) return idMatch[1];
    return fileName.replace(/^\d+-/, '');
  }

  private extractTitle(content: string): string | null {
    const match = content.match(/\.title\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : null;
  }

  private extractDescription(content: string): string | undefined {
    const match = content.match(/\.description\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : undefined;
  }

  private extractType(content: string): string | undefined {
    const match = content.match(/\.type\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : undefined;
  }

  private extractDeps(content: string): string[] {
    const match = content.match(/\.deps\(\[([^\]]+)\]\)/);
    if (!match) return [];
    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }

  private extractChecks(content: string): string[] | undefined {
    const match = content.match(/\.checks\(\[([^\]]+)\]\)/);
    if (!match) return undefined;
    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }

  private extractInputs(content: string): string[] | undefined {
    const match = content.match(/\.inputs\(\[([^\]]+)\]\)/);
    if (!match) return undefined;
    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }

  private extractOutputs(content: string): string[] | undefined {
    const match = content.match(/\.outputs\(\[([^\]]+)\]\)/);
    if (!match) return undefined;
    return match[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean);
  }
}

/**
 * Create a new epic file scanner
 */
export function createEpicFileScanner(epicsDir: string): EpicFileScanner {
  return new EpicFileScanner(epicsDir);
}
