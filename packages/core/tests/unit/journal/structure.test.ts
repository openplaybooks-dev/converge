/**
 * Tests for journal structure - verifying hierarchical path construction
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import {
  getJournalStructure,
  getTaskAttemptDir,
  getAncestorJournalPaths,
} from '../../../src/journal/structure.ts';

describe('journal structure', () => {
  const projectDir = '/Users/test/project';

  describe('getJournalStructure', () => {
    it('should create root structure without epic or task', () => {
      const structure = getJournalStructure(projectDir);

      expect(structure.root).toBe(join(projectDir, '.converge', 'journal'));
      expect(structure.project).toBe(join(projectDir, '.converge', 'journal', 'project'));
      expect(structure.epic).toBeUndefined();
      expect(structure.task).toBeUndefined();
    });

    it('should create epic-level structure', () => {
      const structure = getJournalStructure(projectDir, '03-implement-app');

      expect(structure.epic).toBe(join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app'));
      expect(structure.task).toBeUndefined();
    });

    it('should create task-level structure for root tasks', () => {
      const structure = getJournalStructure(projectDir, '03-implement-app', '002-pages');

      // Root task — directly under epic, no /tasks/ prefix
      expect(structure.task).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages')
      );
    });

    it('should create proper hierarchy for nested tasks (one level)', () => {
      const structure = getJournalStructure(
        projectDir,
        '03-implement-app',
        '002-pages/002-001-home'
      );

      // First segment is root (no /tasks/ prefix), subsequent get /tasks/
      expect(structure.task).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages', 'tasks', '002-001-home')
      );
    });

    it('should create proper hierarchy for deeply nested tasks (two levels)', () => {
      const structure = getJournalStructure(
        projectDir,
        '03-implement-app',
        '002-pages/002-001-home/002-001-001-header'
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          '.converge',
          'journal',
          'default',
          'tasks',
          '03-implement-app',
          '002-pages',
          'tasks',
          '002-001-home',
          'tasks',
          '002-001-001-header'
        )
      );
    });

    it('should create proper hierarchy for very deeply nested tasks (three levels)', () => {
      const structure = getJournalStructure(
        projectDir,
        '03-implement-app',
        '002-pages/002-001-home/002-001-001-header/002-001-001-001-logo'
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          '.converge',
          'journal',
          'default',
          'tasks',
          '03-implement-app',
          '002-pages',
          'tasks',
          '002-001-home',
          'tasks',
          '002-001-001-header',
          'tasks',
          '002-001-001-001-logo'
        )
      );
    });

    it('should handle taskId with trailing slash', () => {
      const structure = getJournalStructure(
        projectDir,
        '03-implement-app',
        '002-pages/002-001-home/'
      );

      expect(structure.task).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages', 'tasks', '002-001-home')
      );
    });

    it('should handle taskId with multiple slashes', () => {
      const structure = getJournalStructure(
        projectDir,
        '03-implement-app',
        '002-pages//002-001-home'
      );

      expect(structure.task).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages', 'tasks', '002-001-home')
      );
    });
  });

  describe('getTaskAttemptDir', () => {
    it('should create attempt dir for root task', () => {
      const attemptDir = getTaskAttemptDir(projectDir, '03-implement-app', '002-pages', 1);

      expect(attemptDir).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages', 'attempts', '01')
      );
    });

    it('should create attempt dir for nested task', () => {
      const attemptDir = getTaskAttemptDir(
        projectDir,
        '03-implement-app',
        '002-pages/002-001-home',
        2
      );

      expect(attemptDir).toBe(
        join(
          projectDir,
          '.converge',
          'journal',
          'default',
          'tasks',
          '03-implement-app',
          '002-pages',
          'tasks',
          '002-001-home',
          'attempts',
          '02'
        )
      );
    });

    it('should handle string attempt numbers', () => {
      const attemptDir = getTaskAttemptDir(
        projectDir,
        '03-implement-app',
        '002-pages',
        'wip'
      );

      expect(attemptDir).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages', 'attempts', 'wip')
      );
    });

    it('should pad numeric attempt numbers', () => {
      const attemptDir = getTaskAttemptDir(
        projectDir,
        '03-implement-app',
        '002-pages',
        9
      );

      expect(attemptDir).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages', 'attempts', '09')
      );
    });

    it('should verify attempts/ and tasks/ are siblings for WBS tasks', () => {
      const attemptDir = getTaskAttemptDir(projectDir, '03-implement-app', '002-pages', 1);
      const structure = getJournalStructure(projectDir, '03-implement-app', '002-pages');

      const parentOfAttempts = join(attemptDir, '..', '..');
      const parentOfTasks = structure.task!;

      expect(parentOfAttempts).toBe(parentOfTasks);
      expect(attemptDir).toContain('/002-pages/attempts/01');
    });
  });

  describe('getAncestorJournalPaths', () => {
    it('should return empty array for root tasks', () => {
      const ancestors = getAncestorJournalPaths(projectDir, '03-implement-app', '002-pages');
      expect(ancestors).toEqual([]);
    });

    it('should return parent path for one level of nesting', () => {
      const ancestors = getAncestorJournalPaths(
        projectDir,
        '03-implement-app',
        '002-pages/002-001-home'
      );

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0]).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages')
      );
    });

    it('should return all ancestor paths for deeply nested tasks', () => {
      const ancestors = getAncestorJournalPaths(
        projectDir,
        '03-implement-app',
        '002-pages/002-001-home/002-001-001-header'
      );

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0]).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages')
      );
      expect(ancestors[1]).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app', '002-pages', 'tasks', '002-001-home')
      );
    });

    it('should return ancestors in order from root to immediate parent', () => {
      const ancestors = getAncestorJournalPaths(
        projectDir,
        '03-implement-app',
        'a/b/c/d'
      );

      expect(ancestors).toHaveLength(3);
      expect(ancestors[0]).toContain('/03-implement-app/a');
      expect(ancestors[1]).toContain('/a/tasks/b');
      expect(ancestors[2]).toContain('/a/tasks/b/tasks/c');
    });
  });

  describe('journal structure consistency', () => {
    it('should maintain sibling relationship between attempts/ and tasks/', () => {
      const taskId = '002-pages';
      const structure = getJournalStructure(projectDir, '03-implement-app', taskId);
      const attemptDir = getTaskAttemptDir(projectDir, '03-implement-app', taskId, 1);

      const taskParent = structure.task!;
      const attemptParent = join(attemptDir, '..', '..');

      expect(attemptParent).toBe(taskParent);
      expect(structure.task).toMatch(/\/002-pages$/);
      expect(attemptDir).toMatch(/\/002-pages\/attempts\/01$/);
    });

    it('should maintain correct structure for spawned subtasks', () => {
      const parentTaskId = '002-pages';
      const childTaskId = '002-pages/002-001-home';

      const parentStructure = getJournalStructure(projectDir, '03-implement-app', parentTaskId);
      const childStructure = getJournalStructure(projectDir, '03-implement-app', childTaskId);

      const expectedChildPath = join(parentStructure.task!, 'tasks', '002-001-home');
      expect(childStructure.task).toBe(expectedChildPath);
    });

    it('should verify epic structure mirrors journal structure', () => {
      const taskId = '002-pages/002-001-home';
      const structure = getJournalStructure(projectDir, '03-implement-app', taskId);

      expect(structure.task).toContain('/journal/default/tasks/03-implement-app/002-pages/tasks/002-001-home');
    });
  });

  describe('PlaybookContext routing', () => {
    it('should route epic paths through playbook journal', () => {
      const ctx = { playbook: 'react-app' };
      const structure = getJournalStructure(projectDir, '03-implement-app', undefined, ctx);

      // journal/{playbook}/tasks/{epicId}
      expect(structure.epic).toBe(
        join(projectDir, '.converge', 'journal', 'react-app', 'tasks', '03-implement-app')
      );
    });

    it('should route task paths through playbook journal', () => {
      const ctx = { playbook: 'react-app' };
      const structure = getJournalStructure(projectDir, '03-implement-app', '002-pages', ctx);

      expect(structure.task).toBe(
        join(projectDir, '.converge', 'journal', 'react-app', 'tasks', '03-implement-app', '002-pages')
      );
    });

    it('should route nested task paths through playbook journal', () => {
      const ctx = { playbook: 'react-app' };
      const structure = getJournalStructure(projectDir, '03-implement-app', '002-pages/002-001-home', ctx);

      expect(structure.task).toBe(
        join(projectDir, '.converge', 'journal', 'react-app', 'tasks', '03-implement-app', '002-pages', 'tasks', '002-001-home')
      );
    });

    it('should use "default" playbook name for default runs', () => {
      const ctx = { playbook: 'default' };
      const structure = getJournalStructure(projectDir, '03-implement-app', undefined, ctx);

      expect(structure.epic).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app')
      );
    });

    it('should fall back to legacy paths when no context', () => {
      const structure = getJournalStructure(projectDir, '03-implement-app');

      expect(structure.epic).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app')
      );
    });

    it('should preserve root and project paths regardless of context', () => {
      const ctx = { playbook: 'react-app' };
      const structure = getJournalStructure(projectDir, undefined, undefined, ctx);

      expect(structure.root).toBe(join(projectDir, '.converge', 'journal'));
      expect(structure.project).toBe(join(projectDir, '.converge', 'journal', 'project'));
      expect(structure.epic).toBeUndefined();
    });
  });

  describe('PlaybookContext from env vars', () => {
    afterEach(() => {
      delete process.env.CONVERGE_PLAYBOOK;
    });

    it('should resolve playbook context from CONVERGE_PLAYBOOK env var', () => {
      process.env.CONVERGE_PLAYBOOK = 'react-app';

      const structure = getJournalStructure(projectDir, '03-implement-app');

      expect(structure.epic).toBe(
        join(projectDir, '.converge', 'journal', 'react-app', 'tasks', '03-implement-app')
      );
    });

    it('should use legacy paths when env var is not set', () => {
      const structure = getJournalStructure(projectDir, '03-implement-app');

      expect(structure.epic).toBe(
        join(projectDir, '.converge', 'journal', 'default', 'tasks', '03-implement-app')
      );
    });

    it('should prefer explicit context over env var', () => {
      process.env.CONVERGE_PLAYBOOK = 'from-env';

      const explicitCtx = { playbook: 'from-param' };
      const structure = getJournalStructure(projectDir, '03-implement-app', undefined, explicitCtx);

      expect(structure.epic).toContain('from-param');
      expect(structure.epic).not.toContain('from-env');
    });

    it('should route nested task paths through env-based context', () => {
      process.env.CONVERGE_PLAYBOOK = 'fix-issue';

      const structure = getJournalStructure(projectDir, '03-implement-app', '002-pages/002-001-home');

      expect(structure.task).toBe(
        join(projectDir, '.converge', 'journal', 'fix-issue', 'tasks', '03-implement-app', '002-pages', 'tasks', '002-001-home')
      );
    });
  });
});
