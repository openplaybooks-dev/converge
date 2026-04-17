/**
 * Test: Task Helper Path Resolution
 *
 * Verifies that getSkillPath() correctly finds TASK.md files for:
 * 1. Regular tasks (epics/{epicId}/{taskId}/TASK.md)
 * 2. WBS subtasks in tasks/ subdirectory (epics/{epicId}/tasks/{taskId}/TASK.md)
 * 3. Deeply nested tasks (recursive search)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createTaskHelper } from '../../src/repair/helpers/task.ts';
import { tmpdir } from 'node:os';

describe('Task Helper - Path Resolution', () => {
  let testDir: string;
  let projectDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `harness-test-${Date.now()}`);
    projectDir = testDir;

    // Create directory structure
    mkdirSync(join(projectDir, '.harness', 'epics', '02-prepare-designs', 'tasks', '003-001-prompt-home', 'nested'), { recursive: true });
    mkdirSync(join(projectDir, '.harness', 'epics', '02-prepare-designs', '001-breakdown-ux'), { recursive: true });
    mkdirSync(join(projectDir, '.harness', 'epics', '02-prepare-designs', '002-generate-design/subtask'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should find TASK.md in regular task directory', () => {
    const taskMdPath = join(projectDir, '.harness', 'epics', '02-prepare-designs', '001-breakdown-ux', 'TASK.md');
    writeFileSync(taskMdPath, '---\ntitle: test\n---\n');

    const helper = createTaskHelper(projectDir, '02-prepare-designs');
    const result = helper.getSkillPath('001-breakdown-ux');

    expect(result).toBe(taskMdPath);
  });

  it('should find TASK.md in WBS tasks/ subdirectory', () => {
    const taskMdPath = join(projectDir, '.harness', 'epics', '02-prepare-designs', 'tasks', '003-001-prompt-home', 'TASK.md');
    writeFileSync(taskMdPath, '---\ntitle: test\n---\n');

    const helper = createTaskHelper(projectDir, '02-prepare-designs');
    const result = helper.getSkillPath('003-001-prompt-home');

    expect(result).toBe(taskMdPath);
  });

  it('should find TASK.md in nested subdirectory (recursive search)', () => {
    const taskMdPath = join(projectDir, '.harness', 'epics', '02-prepare-designs', '002-generate-design', 'subtask', '002-001-nested', 'TASK.md');
    mkdirSync(join(projectDir, '.harness', 'epics', '02-prepare-designs', '002-generate-design', 'subtask', '002-001-nested'), { recursive: true });
    writeFileSync(taskMdPath, '---\ntitle: test\n---\n');

    const helper = createTaskHelper(projectDir, '02-prepare-designs');
    const result = helper.getSkillPath('002-001-nested');

    expect(result).toBe(taskMdPath);
  });

  it('should prioritize tasks/ subdirectory over recursive search', () => {
    // Create TASK.md in both locations
    const tasksTaskMdPath = join(projectDir, '.harness', 'epics', '02-prepare-designs', 'tasks', '003-001-prompt-home', 'TASK.md');
    const nestedTaskMdPath = join(projectDir, '.harness', 'epics', '02-prepare-designs', 'tasks', '003-001-prompt-home', 'nested', '003-001-prompt-home', 'TASK.md');

    mkdirSync(join(projectDir, '.harness', 'epics', '02-prepare-designs', 'tasks', '003-001-prompt-home', 'nested', '003-001-prompt-home'), { recursive: true });
    writeFileSync(tasksTaskMdPath, '---\ntitle: test1\n---\n');
    writeFileSync(nestedTaskMdPath, '---\ntitle: test2\n---\n');

    const helper = createTaskHelper(projectDir, '02-prepare-designs');
    const result = helper.getSkillPath('003-001-prompt-home');

    // Should find the one in tasks/ subdirectory first
    expect(result).toBe(tasksTaskMdPath);
  });

  it('should return default path if TASK.md not found anywhere', () => {
    const helper = createTaskHelper(projectDir, '02-prepare-designs');
    const result = helper.getSkillPath('999-nonexistent-task');

    const expected = join(projectDir, '.harness', 'epics', '02-prepare-designs', '999-nonexistent-task', 'TASK.md');
    expect(result).toBe(expected);
  });
});
