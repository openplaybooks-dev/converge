/**
 * Test: Epic indicators in tree display
 *
 * This test ensures that epics containing running or next tasks get the ▶ indicator.
 *
 * Scenarios:
 * 1. Epic with running task → should get ▶
 * 2. Epic with next task → should get ▶
 * 3. Epic with both running and next tasks → should get ▶
 * 4. Epic with no active tasks → should NOT get ▶
 */

import { describe, it, expect, vi } from 'vitest';
import { printTaskTree } from '../../src/cli/tree-display.ts';
import type { TaskNode, TaskStates } from '../../src/cli/next-task.ts';

describe('Tree Display - Epic Indicators', () => {
  // Helper to capture console.log output
  function captureTreeOutput(
    tree: TaskNode[],
    states: TaskStates,
    nextTaskId: string,
    runningTaskId?: string
  ): string[] {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = vi.fn((...args) => {
      logs.push(args.join(' '));
    });

    printTaskTree(tree, states, nextTaskId, runningTaskId);

    console.log = originalLog;
    return logs;
  }

  it('should mark epic with running task with ▶ indicator', () => {
    const tree: TaskNode[] = [
      {
        epicId: '01-prepare-requirements',
        taskId: '001-gather-idea-generate-ux',
        filePath: '.harness/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md',
        relPath: '.harness/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md',
        journalTaskId: '001-gather-idea-generate-ux',
        blocking: true,
        status: 'running',
      },
      {
        epicId: '02-prepare-designs',
        taskId: '001-breakdown-ux-to-screens',
        filePath: '.harness/epics/02-prepare-designs/001-breakdown-ux-to-screens/TASK.md',
        relPath: '.harness/epics/02-prepare-designs/001-breakdown-ux-to-screens/TASK.md',
        journalTaskId: '001-breakdown-ux-to-screens',
        blocking: true,
        status: 'pending',
      },
    ];

    const states: TaskStates = {
      completed: new Set<string>(),
      failed: new Set<string>(),
      seeded: new Set<string>(),
      locked: new Set<string>(),
      wbsProgress: new Map(),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    const output = captureTreeOutput(
      tree,
      states,
      '001-breakdown-ux-to-screens', // next task
      '001-gather-idea-generate-ux'  // running task
    );

    // Find epic lines
    const epic01Line = output.find(line => line.includes('01-prepare-requirements'));
    const epic02Line = output.find(line => line.includes('02-prepare-designs'));

    // Both epics should have ▶ indicator
    expect(epic01Line).toContain('▶');
    expect(epic01Line).toContain('01-prepare-requirements');

    expect(epic02Line).toContain('▶');
    expect(epic02Line).toContain('02-prepare-designs');
  });

  it('should mark epic with next task with ▶ indicator (no running task)', () => {
    const tree: TaskNode[] = [
      {
        epicId: '01-prepare-requirements',
        taskId: '001-gather-idea-generate-ux',
        filePath: '.harness/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md',
        relPath: '.harness/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md',
        journalTaskId: '001-gather-idea-generate-ux',
        blocking: true,
        status: 'pending',
      },
    ];

    const states: TaskStates = {
      completed: new Set<string>(),
      failed: new Set<string>(),
      seeded: new Set<string>(),
      locked: new Set<string>(),
      wbsProgress: new Map(),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    const output = captureTreeOutput(
      tree,
      states,
      '001-gather-idea-generate-ux', // next task
      undefined  // no running task
    );

    const epic01Line = output.find(line => line.includes('01-prepare-requirements'));
    expect(epic01Line).toContain('▶');
    expect(epic01Line).toContain('01-prepare-requirements');
  });

  it('should NOT mark epic without active tasks with ▶ indicator', () => {
    const tree: TaskNode[] = [
      {
        epicId: '01-prepare-requirements',
        taskId: '001-gather-idea-generate-ux',
        filePath: '.harness/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md',
        relPath: '.harness/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md',
        journalTaskId: '001-gather-idea-generate-ux',
        blocking: true,
        status: 'running',
      },
      {
        epicId: '02-prepare-designs',
        taskId: '001-breakdown-ux-to-screens',
        filePath: '.harness/epics/02-prepare-designs/001-breakdown-ux-to-screens/TASK.md',
        relPath: '.harness/epics/02-prepare-designs/001-breakdown-ux-to-screens/TASK.md',
        journalTaskId: '001-breakdown-ux-to-screens',
        blocking: true,
        status: 'pending',
      },
      {
        epicId: '03-implement-app',
        taskId: '001-implement-design-system',
        filePath: '.harness/epics/03-implement-app/001-implement-design-system/TASK.md',
        relPath: '.harness/epics/03-implement-app/001-implement-design-system/TASK.md',
        journalTaskId: '001-implement-design-system',
        blocking: true,
        status: 'pending',
      },
    ];

    const states: TaskStates = {
      completed: new Set<string>(),
      failed: new Set<string>(),
      seeded: new Set<string>(),
      locked: new Set<string>(),
      wbsProgress: new Map(),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    const output = captureTreeOutput(
      tree,
      states,
      '001-breakdown-ux-to-screens', // next task (in epic 02)
      '001-gather-idea-generate-ux'  // running task (in epic 01)
    );

    const epic03Line = output.find(line => line.includes('03-implement-app'));

    // Epic 03 should NOT have ▶ indicator (no running or next task)
    expect(epic03Line).toBeDefined();
    expect(epic03Line).not.toContain('▶');
  });

  it('should mark parent task epic when child is next task', () => {
    const tree: TaskNode[] = [
      {
        epicId: '01-prepare-designs',
        taskId: '003-generate-screens',
        filePath: '.harness/epics/01-prepare-designs/003-generate-screens/TASK.md',
        relPath: '.harness/epics/01-prepare-designs/003-generate-screens/TASK.md',
        journalTaskId: '003-generate-screens',
        blocking: true,
        status: 'running',
      },
      {
        epicId: '01-prepare-designs',
        taskId: '003-001-generate-home-screen',
        filePath: '.harness/epics/01-prepare-designs/003-generate-screens/tasks/003-001-generate-home-screen/TASK.md',
        relPath: '.harness/epics/01-prepare-designs/003-generate-screens/tasks/003-001-generate-home-screen/TASK.md',
        journalTaskId: '003-generate-screens/003-001-generate-home-screen',
        parentTaskId: '003-generate-screens',
        blocking: true,
        status: 'pending',
      },
    ];

    const states: TaskStates = {
      completed: new Set<string>(),
      failed: new Set<string>(),
      seeded: new Set(['003-generate-screens']),
      locked: new Set<string>(),
      wbsProgress: new Map([
        ['003-generate-screens', {
          seeded: true,
          spawnCount: 1,
          completedSubtasks: 0,
          failedSubtasks: 0,
          subtaskIds: ['003-001-generate-home-screen'],
        }],
      ]),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    const output = captureTreeOutput(
      tree,
      states,
      '003-generate-screens/003-001-generate-home-screen', // next child task
      '003-generate-screens'  // running parent task
    );

    const epicLine = output.find(line => line.includes('01-prepare-designs'));

    // Epic should have ▶ indicator (contains both running parent and next child)
    expect(epicLine).toContain('▶');
    expect(epicLine).toContain('01-prepare-designs');

    // Parent task should have ▶ indicator (ancestor of next child)
    const parentLine = output.find(line => line.includes('003-generate-screens') && !line.includes('003-001'));
    expect(parentLine).toContain('▶');
  });
});
