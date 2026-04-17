/**
 * Filesystem Helper Tests
 *
 * Unit tests for filesystem operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FilesystemHelperImpl } from '../../src/repair/helpers/filesystem.ts';
import { mkdtemp, rm, writeFile, readFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

describe('FilesystemHelper', () => {
  let tempDir: string;
  let helper: FilesystemHelperImpl;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await mkdtemp(join(tmpdir(), 'converge-test-'));
    helper = new FilesystemHelperImpl(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('readFile', () => {
    it('should read file contents', async () => {
      const testFile = join(tempDir, 'test.txt');
      await writeFile(testFile, 'Hello, world!', 'utf-8');

      const content = await helper.readFile('test.txt');
      expect(content).toBe('Hello, world!');
    });

    it('should throw error for non-existent file', async () => {
      await expect(helper.readFile('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write file contents', async () => {
      await helper.writeFile('test.txt', 'Hello, world!');

      const content = await readFile(join(tempDir, 'test.txt'), 'utf-8');
      expect(content).toBe('Hello, world!');
    });

    it('should create parent directories', async () => {
      await helper.writeFile('nested/dir/test.txt', 'Hello!');

      const content = await readFile(join(tempDir, 'nested/dir/test.txt'), 'utf-8');
      expect(content).toBe('Hello!');
    });
  });

  describe('listDirectory', () => {
    it('should list files in directory', async () => {
      await mkdir(join(tempDir, 'dir'), { recursive: true });
      await writeFile(join(tempDir, 'dir/file1.txt'), 'content1');
      await writeFile(join(tempDir, 'dir/file2.txt'), 'content2');

      const files = await helper.listDirectory('dir');
      expect(files).toHaveLength(2);
      expect(files).toContain('dir/file1.txt');
      expect(files).toContain('dir/file2.txt');
    });

    it('should support glob patterns', async () => {
      await mkdir(join(tempDir, 'dir'), { recursive: true });
      await writeFile(join(tempDir, 'dir/file1.txt'), 'content1');
      await writeFile(join(tempDir, 'dir/file2.md'), 'content2');

      const files = await helper.listDirectory('dir', '*.txt');
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/file1\.txt$/);
    });
  });

  describe('createSymlink', () => {
    it('should create symbolic link', async () => {
      await mkdir(join(tempDir, 'target'), { recursive: true });
      await writeFile(join(tempDir, 'target/file.txt'), 'content');

      await helper.createSymlink('target/file.txt', 'link.txt');

      expect(existsSync(join(tempDir, 'link.txt'))).toBe(true);
      const content = await readFile(join(tempDir, 'link.txt'), 'utf-8');
      expect(content).toBe('content');
    });

    it('should replace existing symlink', async () => {
      await mkdir(join(tempDir, 'target1'), { recursive: true });
      await mkdir(join(tempDir, 'target2'), { recursive: true });
      await writeFile(join(tempDir, 'target1/file.txt'), 'content1');
      await writeFile(join(tempDir, 'target2/file.txt'), 'content2');

      await helper.createSymlink('target1/file.txt', 'link.txt');
      await helper.createSymlink('target2/file.txt', 'link.txt');

      const content = await readFile(join(tempDir, 'link.txt'), 'utf-8');
      expect(content).toBe('content2');
    });
  });

  describe('updateSkillMd', () => {
    it('should update TASK.md frontmatter', async () => {
      const skillContent = `---
title: Test Task
inputs:
  - input.txt
outputs:
  - output.txt
---

# Test Task

This is the task body.`;

      await helper.writeFile('TASK.md', skillContent);

      await helper.updateSkillMd('TASK.md', {
        outputs: ['new-output.txt', 'another-output.txt'],
      });

      const updated = await helper.readFile('TASK.md');
      expect(updated).toContain('new-output.txt');
      expect(updated).toContain('another-output.txt');
      expect(updated).toContain('# Test Task');
      expect(updated).toContain('This is the task body.');
    });
  });

  describe('removeDirectory', () => {
    it('should remove directory recursively', async () => {
      await mkdir(join(tempDir, 'dir/nested'), { recursive: true });
      await writeFile(join(tempDir, 'dir/file.txt'), 'content');
      await writeFile(join(tempDir, 'dir/nested/file.txt'), 'content');

      await helper.removeDirectory('dir');

      expect(existsSync(join(tempDir, 'dir'))).toBe(false);
    });

    it('should not throw if directory does not exist', async () => {
      await expect(helper.removeDirectory('nonexistent')).resolves.not.toThrow();
    });
  });
});
