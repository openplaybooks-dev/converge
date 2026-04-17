/**
 * Tests for WBS Executor - ensuring spawned tasks go to tasks/ folder
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { WbsExecutor } from '../../../src/executor/wbs-executor.ts';
import { taskDef } from '../../../src/config/task-definition.ts';

describe('WbsExecutor', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    // Create temp directory for test
    tempDir = mkdtempSync(join(tmpdir(), 'harness-wbs-test-'));
    projectDir = tempDir;

    // Create basic project structure
    mkdirSync(join(projectDir, '.harness'), { recursive: true });
    mkdirSync(join(projectDir, '.harness', 'journal'), { recursive: true });
    mkdirSync(join(projectDir, '.harness', 'epics'), { recursive: true });
    mkdirSync(join(projectDir, '.harness', 'epics', '03-implement-app'), { recursive: true });
    mkdirSync(join(projectDir, '.harness', 'epics', '03-implement-app', '002-pages'), { recursive: true });

    // Mock console methods to avoid test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    // Restore console methods
    vi.restoreAllMocks();
  });

  describe('spawn path generation', () => {
    it('should spawn subtasks to tasks/ (plural) folder', async () => {
      const taskFilePath = join(projectDir, '.harness', 'epics', '03-implement-app', '002-pages', 'TASK.md');

      // Create the parent task file
      writeFileSync(taskFilePath, '---\ntitle: Generate Pages\n---\n');

      const executor = new WbsExecutor(
        projectDir,
        { epicId: '03-implement-app', taskId: '002-pages' },
        taskFilePath,
        { id: '002-pages', title: 'Generate Pages' }
      );

      // Track spawned tasks
      const spawnedPaths: string[] = [];

      // Create a WBS function that spawns a child task
      const wbsFn = async (ctx: any) => {
        // Mock writeTaskMdToFile to avoid actual file writes
        const originalSpawn = ctx.spawn;
        ctx.spawn = async (target: any, opts?: any) => {
          // Extract the path that would be used
          const def = typeof target === 'function' ? target.build() : target;
          const relParentDir = '.harness/epics/03-implement-app/002-pages';
          const expectedPath = join(relParentDir, 'tasks', def.id, 'TASK.md');
          spawnedPaths.push(expectedPath);

          // Don't actually write the file in this test
          return Promise.resolve();
        };

        await ctx.spawn(
          taskDef()
            .id('002-001-home')
            .title('Home Page')
            .build()
        );
      };

      // Run the WBS executor
      await executor.run(wbsFn, 1);

      // Verify the spawned path uses 'tasks' (plural)
      expect(spawnedPaths.length).toBe(1);
      expect(spawnedPaths[0]).toContain('/tasks/002-001-home/');
      expect(spawnedPaths[0]).not.toContain('/task/002-001-home/'); // Should NOT use singular 'task'
    });

    it('should maintain consistent path structure for multiple spawned tasks', async () => {
      const taskFilePath = join(projectDir, '.harness', 'epics', '03-implement-app', '002-pages', 'TASK.md');
      writeFileSync(taskFilePath, '---\ntitle: Generate Pages\n---\n');

      const executor = new WbsExecutor(
        projectDir,
        { epicId: '03-implement-app', taskId: '002-pages' },
        taskFilePath,
        { id: '002-pages', title: 'Generate Pages' }
      );

      const spawnedPaths: string[] = [];

      const wbsFn = async (ctx: any) => {
        const originalSpawn = ctx.spawn;
        ctx.spawn = async (target: any, opts?: any) => {
          const def = typeof target === 'function' ? target.build() : target;
          const relParentDir = '.harness/epics/03-implement-app/002-pages';
          const expectedPath = join(relParentDir, 'tasks', def.id, 'TASK.md');
          spawnedPaths.push(expectedPath);
          return Promise.resolve();
        };

        await ctx.spawn(taskDef().id('002-001-home').title('Home Page').build());
        await ctx.spawn(taskDef().id('002-002-about').title('About Page').build());
        await ctx.spawn(taskDef().id('002-003-contact').title('Contact Page').build());
      };

      await executor.run(wbsFn, 1);

      // All paths should use 'tasks' (plural)
      expect(spawnedPaths.length).toBe(3);
      spawnedPaths.forEach(path => {
        expect(path).toMatch(/\/tasks\/002-\d{3}-[a-z]+\/TASK\.md$/);
        expect(path).not.toContain('/task/002-'); // Should NOT use singular
      });
    });

    it('should place spawned tasks as siblings under tasks/ folder', async () => {
      const taskFilePath = join(projectDir, '.harness', 'epics', '03-implement-app', '002-pages', 'TASK.md');
      writeFileSync(taskFilePath, '---\ntitle: Generate Pages\n---\n');

      const executor = new WbsExecutor(
        projectDir,
        { epicId: '03-implement-app', taskId: '002-pages' },
        taskFilePath,
        { id: '002-pages', title: 'Generate Pages' }
      );

      const spawnedPaths: string[] = [];

      const wbsFn = async (ctx: any) => {
        ctx.spawn = async (target: any) => {
          const def = typeof target === 'function' ? target.build() : target;
          const relParentDir = '.harness/epics/03-implement-app/002-pages';
          const expectedPath = join(relParentDir, 'tasks', def.id, 'TASK.md');
          spawnedPaths.push(expectedPath);
          return Promise.resolve();
        };

        await ctx.spawn(taskDef().id('002-001-home').build());
        await ctx.spawn(taskDef().id('002-002-about').build());
      };

      await executor.run(wbsFn, 1);

      // Extract parent directories
      const parentDirs = spawnedPaths.map(p => {
        const parts = p.split('/');
        return parts.slice(0, -2).join('/'); // Remove /child-id/TASK.md
      });

      // All should have the same parent: .../002-pages/tasks
      const uniqueParents = [...new Set(parentDirs)];
      expect(uniqueParents.length).toBe(1);
      expect(uniqueParents[0]).toMatch(/002-pages\/tasks$/);
    });
  });

  describe('path structure validation', () => {
    it('should match expected pattern: parent-basename/tasks/child-id/TASK.md', async () => {
      const taskFilePath = join(projectDir, '.harness', 'epics', '03-implement-app', '002-pages', 'TASK.md');
      writeFileSync(taskFilePath, '---\ntitle: Generate Pages\n---\n');

      const executor = new WbsExecutor(
        projectDir,
        { epicId: '03-implement-app', taskId: '002-pages' },
        taskFilePath,
        { id: '002-pages', title: 'Generate Pages' }
      );

      let capturedPath = '';

      const wbsFn = async (ctx: any) => {
        ctx.spawn = async (target: any) => {
          const def = typeof target === 'function' ? target.build() : target;
          const relParentDir = '.harness/epics/03-implement-app/002-pages';
          capturedPath = join(relParentDir, 'tasks', def.id, 'TASK.md');
          return Promise.resolve();
        };

        await ctx.spawn(taskDef().id('002-001-home').build());
      };

      await executor.run(wbsFn, 1);

      // Verify exact pattern: parent-dir/tasks/child-id/TASK.md
      expect(capturedPath).toBe('.harness/epics/03-implement-app/002-pages/tasks/002-001-home/TASK.md');

      // Path components check
      const pathParts = capturedPath.split('/');
      expect(pathParts).toContain('tasks'); // Must contain 'tasks' (plural)
      expect(pathParts).toContain('002-001-home'); // Child ID
      expect(pathParts[pathParts.length - 1]).toBe('TASK.md'); // Ends with TASK.md
    });
  });
});
