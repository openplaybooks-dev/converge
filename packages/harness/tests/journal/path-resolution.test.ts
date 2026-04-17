/**
 * Path Resolution Tests
 *
 * Verifies that getJournalStructure() and constructJournalPath() produce matching results.
 */

import { describe, it, expect } from 'vitest';
import { getJournalStructure } from '../../src/journal/structure.ts';
import { constructJournalPath } from '../../src/unit/path-utils.ts';
import path from 'node:path';

describe('Path Resolution Consistency', () => {
  const projectDir = '/test/project';
  const epicId = '02-prepare-designs';

  it('should match for root-level task (no /tasks/ subdirectory)', () => {
    const taskId = '001-breakdown-ux-to-screens';
    const taskPath = path.join(projectDir, '.harness/epics', epicId, taskId, 'TASK.md');

    const journalFromStructure = getJournalStructure(projectDir, epicId, taskId).task;
    const journalFromConstruct = constructJournalPath(taskPath);

    expect(journalFromStructure).toBe(journalFromConstruct);
    expect(journalFromStructure).toBe(path.join(projectDir, '.harness/journal/default/tasks', epicId, taskId));
  });

  it('should match for WBS subtask (under /tasks/ subdirectory)', () => {
    // journalTaskId for WBS subtask uses hierarchical format: "parent/child"
    // (the /tasks/ markers are stripped by extractJournalTaskId)
    const taskId = '002-pages/002-001-prompt-home-dashboard';
    const taskPath = path.join(projectDir, '.harness/epics', epicId, '002-pages/tasks/002-001-prompt-home-dashboard', 'TASK.md');

    const journalFromStructure = getJournalStructure(projectDir, epicId, taskId).task;
    const journalFromConstruct = constructJournalPath(taskPath);

    expect(journalFromStructure).toBe(journalFromConstruct);
    // Root segment directly under epic, child gets /tasks/
    expect(journalFromStructure).toBe(path.join(projectDir, '.harness/journal/default/tasks', epicId, '002-pages/tasks/002-001-prompt-home-dashboard'));
  });

  it('should match for deeply nested task', () => {
    // Hierarchical taskId (no /tasks/ markers — stripped by extractJournalTaskId)
    const taskId = '002-pages/002-001-home';
    const taskPath = path.join(projectDir, '.harness/epics', epicId, '002-pages/tasks/002-001-home', 'TASK.md');

    const journalFromStructure = getJournalStructure(projectDir, epicId, taskId).task;
    const journalFromConstruct = constructJournalPath(taskPath);

    expect(journalFromStructure).toBe(journalFromConstruct);
    expect(journalFromStructure).toBe(path.join(projectDir, '.harness/journal/default/tasks', epicId, '002-pages/tasks/002-001-home'));
  });

  it('should never add /tasks/ if not present in taskId', () => {
    const taskId = '002-generate-design-system';
    const journalPath = getJournalStructure(projectDir, epicId, taskId).task;

    // Should NOT contain /tasks/ subdirectory
    expect(journalPath).not.toContain('/tasks/002-generate-design-system');
    expect(journalPath).toBe(path.join(projectDir, '.harness/journal/default/tasks', epicId, taskId));
  });

  it('should handle hierarchical taskId with two segments', () => {
    // taskIds with 2+ segments: first segment is root (no /tasks/), rest get /tasks/
    const taskId = 'parent/002-001-home';
    const journalPath = getJournalStructure(projectDir, epicId, taskId).task;

    expect(journalPath).toContain('/tasks/002-001-home');
    expect(journalPath).toBe(path.join(projectDir, '.harness/journal/default/tasks', epicId, 'parent/tasks/002-001-home'));
  });
});
