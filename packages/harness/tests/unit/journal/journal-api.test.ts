/**
 * Journal API Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTaskJournalAPI, createEpicJournalAPI, createProjectJournalAPI } from '../../../src/journal/api.ts';
import { writeGaps, logTaskEvent } from '../../../src/journal/writer.ts';
import type { Gap } from '../../../src/gap/types.ts';

describe('Journal API', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'journal-api-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Task Journal API', () => {
    it('should read gaps', async () => {
      const gaps: Gap[] = [
        {
          id: 'gap-001',
          type: 'structural',
          level: 'task',
          scope: '01-api.setup-db',
          description: 'Missing config',
          detected: '2025-01-15T10:00:00.000Z',
          resolved: false,
          checks: ['check-config'],
        },
      ];

      await writeGaps(tempDir, 'task', '01-api.setup-db', gaps);

      const journal = createTaskJournalAPI(tempDir, '01-api', 'setup-db');
      const readGaps = await journal.getGaps();

      expect(readGaps).toHaveLength(1);
      expect(readGaps[0].id).toBe('gap-001');
    });

    it('should get gap summary', async () => {
      const gaps: Gap[] = [
        {
          id: 'gap-001',
          type: 'structural',
          level: 'task',
          scope: '01-api.setup-db',
          description: 'Missing config',
          detected: '2025-01-15T10:00:00.000Z',
          resolved: false,
          checks: ['check-config'],
          severity: 'high',
        },
        {
          id: 'gap-002',
          type: 'semantic',
          level: 'task',
          scope: '01-api.setup-db',
          description: 'Missing validation',
          detected: '2025-01-15T10:00:00.000Z',
          resolved: false,
          checks: ['check-validation'],
          severity: 'medium',
        },
      ];

      await writeGaps(tempDir, 'task', '01-api.setup-db', gaps);

      const journal = createTaskJournalAPI(tempDir, '01-api', 'setup-db');
      const summary = await journal.getSummary();

      expect(summary.total).toBe(2);
      expect(summary.byType.structural).toBe(1);
      expect(summary.byType.semantic).toBe(1);
      expect(summary.bySeverity.high).toBe(1);
      expect(summary.bySeverity.medium).toBe(1);
    });

    it('should get recent events', async () => {
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'TASK_START', 'Starting');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'ERROR', 'Failed to connect');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'RETRY', 'Retrying');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'TASK_COMPLETE', 'Done');

      const journal = createTaskJournalAPI(tempDir, '01-api', 'setup-db');
      const events = await journal.getRecentEvents(2);

      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('RETRY');
      expect(events[1].eventType).toBe('TASK_COMPLETE');
    });

    it('should find errors', async () => {
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'TASK_START', 'Starting');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'ERROR', 'Connection failed');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'TASK_FAILED', 'Task failed');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'TASK_START', 'Starting again');

      const journal = createTaskJournalAPI(tempDir, '01-api', 'setup-db');
      const errors = await journal.findErrors();

      expect(errors).toHaveLength(2);
      expect(errors[0].eventType).toBe('ERROR');
      expect(errors[1].eventType).toBe('TASK_FAILED');
    });

    it('should search log by pattern', async () => {
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'ERROR', 'Connection timeout');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'ERROR', 'Authentication failed');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'ERROR', 'Connection reset');

      const journal = createTaskJournalAPI(tempDir, '01-api', 'setup-db');
      const events = await journal.searchLog({
        eventType: 'ERROR',
        pattern: /connection/i,
      });

      expect(events).toHaveLength(2);
      expect(events[0].message).toContain('Connection timeout');
      expect(events[1].message).toContain('Connection reset');
    });

    it('should read log with filters', async () => {
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'TASK_START', 'Start 1');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'ERROR', 'Error 1');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'RETRY', 'Retry 1');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'ERROR', 'Error 2');
      await logTaskEvent(tempDir, '01-api', 'setup-db', 'TASK_COMPLETE', 'Complete');

      const journal = createTaskJournalAPI(tempDir, '01-api', 'setup-db');

      // Filter by event type
      const errors = await journal.readLog({ eventType: 'ERROR' });
      expect(errors).toHaveLength(2);

      // Get last 2 events
      const recent = await journal.readLog({ last: 2 });
      expect(recent).toHaveLength(2);
      expect(recent[0].eventType).toBe('ERROR');
      expect(recent[1].eventType).toBe('TASK_COMPLETE');
    });

    it('should return empty arrays when no journal exists', async () => {
      const journal = createTaskJournalAPI(tempDir, '01-api', 'setup-db');

      const gaps = await journal.getGaps();
      expect(gaps).toHaveLength(0);

      const events = await journal.getRecentEvents();
      expect(events).toHaveLength(0);

      const errors = await journal.findErrors();
      expect(errors).toHaveLength(0);
    });
  });

  describe('Epic Journal API', () => {
    it('should create epic journal API', async () => {
      const gaps: Gap[] = [
        {
          id: 'gap-001',
          type: 'integration',
          level: 'epic',
          scope: '01-api',
          description: 'Missing CI',
          detected: '2025-01-15T10:00:00.000Z',
          resolved: false,
          checks: ['check-ci'],
        },
      ];

      await writeGaps(tempDir, 'epic', '01-api', gaps);

      const journal = createEpicJournalAPI(tempDir, '01-api');
      const readGaps = await journal.getGaps();

      expect(readGaps).toHaveLength(1);
      expect(readGaps[0].level).toBe('epic');
    });
  });

  describe('Project Journal API', () => {
    it('should create project journal API', async () => {
      const gaps: Gap[] = [
        {
          id: 'gap-001',
          type: 'quality',
          level: 'project',
          scope: 'project',
          description: 'Missing docs',
          detected: '2025-01-15T10:00:00.000Z',
          resolved: false,
          checks: ['check-docs'],
        },
      ];

      await writeGaps(tempDir, 'project', 'project', gaps);

      const journal = createProjectJournalAPI(tempDir);
      const readGaps = await journal.getGaps();

      expect(readGaps).toHaveLength(1);
      expect(readGaps[0].level).toBe('project');
    });
  });
});
