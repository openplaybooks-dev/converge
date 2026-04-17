/**
 * Filesystem Helper
 *
 * Provides safe filesystem operations for repair strategies.
 * All methods handle errors gracefully and provide clear error messages.
 */

import { readFile as fsReadFile, writeFile as fsWriteFile, symlink, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { glob } from 'glob';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { FilesystemHelper, TaskDefinition } from '../types.ts';

/* ------------------------------------------------------------------ */
/*  Filesystem Helper Implementation                                  */
/* ------------------------------------------------------------------ */

export class FilesystemHelperImpl implements FilesystemHelper {
  constructor(private readonly projectDir: string) {}

  /**
   * Read file contents
   */
  async readFile(path: string): Promise<string> {
    try {
      const fullPath = this.resolvePath(path);
      return await fsReadFile(fullPath, 'utf-8');
    } catch (err: any) {
      throw new Error(`Failed to read file ${path}: ${err.message}`);
    }
  }

  /**
   * Write file contents (creates parent directories if needed)
   */
  async writeFile(path: string, content: string): Promise<void> {
    try {
      const fullPath = this.resolvePath(path);
      const dir = dirname(fullPath);

      // Create parent directory if it doesn't exist
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await fsWriteFile(fullPath, content, 'utf-8');
    } catch (err: any) {
      throw new Error(`Failed to write file ${path}: ${err.message}`);
    }
  }

  /**
   * List files in directory matching pattern
   */
  async listDirectory(path: string, pattern?: string): Promise<string[]> {
    try {
      const fullPath = this.resolvePath(path);
      const globPattern = pattern ? join(fullPath, pattern) : join(fullPath, '**/*');

      const files = await glob(globPattern, {
        nodir: true,
        absolute: true,
      });

      // Return paths relative to project directory
      return files.map(f => relative(this.projectDir, f));
    } catch (err: any) {
      throw new Error(`Failed to list directory ${path}: ${err.message}`);
    }
  }

  /**
   * Create symbolic link
   */
  async createSymlink(target: string, link: string): Promise<void> {
    try {
      const fullTarget = this.resolvePath(target);
      const fullLink = this.resolvePath(link);

      // Remove existing symlink if it exists
      if (existsSync(fullLink)) {
        await rm(fullLink, { force: true });
      }

      // Create parent directory for link if needed
      const linkDir = dirname(fullLink);
      if (!existsSync(linkDir)) {
        await mkdir(linkDir, { recursive: true });
      }

      // Calculate relative path from link to target
      const relTarget = relative(dirname(fullLink), fullTarget);

      await symlink(relTarget, fullLink);
    } catch (err: any) {
      throw new Error(`Failed to create symlink ${link} -> ${target}: ${err.message}`);
    }
  }

  /**
   * Update TASK.md frontmatter with new definition
   */
  async updateSkillMd(path: string, updates: Partial<TaskDefinition>): Promise<void> {
    try {
      const fullPath = this.resolvePath(path);

      // Read existing TASK.md
      const content = await this.readFile(fullPath);

      // Extract frontmatter and body
      const { frontmatter, body } = this.parseTaskMd(content);

      // Merge updates into frontmatter
      const updated = { ...frontmatter, ...updates };

      // Reconstruct TASK.md
      const newContent = this.stringifySkillMd(updated, body);

      await this.writeFile(fullPath, newContent);
    } catch (err: any) {
      throw new Error(`Failed to update TASK.md ${path}: ${err.message}`);
    }
  }

  /**
   * Remove directory recursively
   */
  async removeDirectory(path: string): Promise<void> {
    try {
      const fullPath = this.resolvePath(path);

      if (existsSync(fullPath)) {
        await rm(fullPath, { recursive: true, force: true });
      }
    } catch (err: any) {
      throw new Error(`Failed to remove directory ${path}: ${err.message}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                  */
  /* ------------------------------------------------------------------ */

  private resolvePath(path: string): string {
    // If path is already absolute, use it; otherwise resolve relative to projectDir
    if (path.startsWith('/')) {
      return path;
    }
    return join(this.projectDir, path);
  }

  private parseTaskMd(content: string): { frontmatter: TaskDefinition; body: string } {
    // TASK.md format:
    // ---
    // frontmatter YAML
    // ---
    // body content

    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) {
      throw new Error('Invalid TASK.md format: missing frontmatter');
    }

    const frontmatter = parseYaml(match[1]) as TaskDefinition;
    const body = match[2];

    return { frontmatter, body };
  }

  async removeFile(filePath: string): Promise<void> {
    const absPath = join(this.projectDir, filePath);
    const { unlink } = await import('node:fs/promises');
    await unlink(absPath);
  }

  private stringifySkillMd(frontmatter: TaskDefinition, body: string): string {
    const yaml = stringifyYaml(frontmatter, {
      defaultStringType: 'QUOTE_DOUBLE',
      defaultKeyType: 'PLAIN',
    });

    return `---\n${yaml}---\n${body}`;
  }
}

/* ------------------------------------------------------------------ */
/*  Factory                                                           */
/* ------------------------------------------------------------------ */

export function createFilesystemHelper(projectDir: string): FilesystemHelper {
  return new FilesystemHelperImpl(projectDir);
}
