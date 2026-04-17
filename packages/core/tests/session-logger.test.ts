/**
 * Session Logger Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SessionLogger, generateSessionId } from '../src/journal/session-logger.ts';
import type { ProgressSnapshot } from '../src/journal/session-types.ts';

describe('SessionLogger', () => {
  let testDir: string;
  let sessionLogger: SessionLogger;
  let sessionId: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'converge-session-test-'));
    sessionId = generateSessionId();
    sessionLogger = new SessionLogger(testDir, sessionId, 'Test Project', {
      maxIterations: 10,
      maxAttemptsPerTask: 2,
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should generate session IDs in expected format', () => {
      const id = generateSessionId();
      // Format: YYYY-MM-DDTHH-mm-ss-hash
      expect(id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9]{6}$/);
    });
  });

  describe('writeSessionStart', () => {
    it('should create session directory structure', async () => {
      await sessionLogger.writeSessionStart();

      const sessionDir = sessionLogger.getSessionDir();
      const files = await readdir(sessionDir);

      expect(files).toContain('session.log');
      expect(files).toContain('events.jsonl');
      expect(files).toContain('metadata.json');
      expect(files).toContain('errors');
    });

    it('should write metadata.json with correct structure', async () => {
      await sessionLogger.writeSessionStart();

      const metadataPath = join(sessionLogger.getSessionDir(), 'metadata.json');
      const content = await readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      expect(metadata.sessionId).toBe(sessionId);
      expect(metadata.projectName).toBe('Test Project');
      expect(metadata.status).toBe('running');
      expect(metadata.config.maxIterations).toBe(10);
      expect(metadata.config.maxAttemptsPerTask).toBe(2);
      expect(metadata.environment.nodeVersion).toBeTruthy();
      expect(metadata.environment.platform).toBeTruthy();
    });

    it('should write session start event', async () => {
      await sessionLogger.writeSessionStart();

      const eventsPath = join(sessionLogger.getSessionDir(), 'events.jsonl');
      const content = await readFile(eventsPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBeGreaterThanOrEqual(1);

      const firstEvent = JSON.parse(lines[0]);
      expect(firstEvent.eventType).toBe('SESSION_START');
      expect(firstEvent.timestamp).toBeTruthy();
    });

    it('should write to session log', async () => {
      await sessionLogger.writeSessionStart();

      const logPath = join(sessionLogger.getSessionDir(), 'session.log');
      const content = await readFile(logPath, 'utf-8');

      expect(content).toContain('Autonomous AI Orchestrator Starting');
      expect(content).toContain('Session ID:');
      expect(content).toContain(sessionId);
    });
  });

  describe('writeIterationSnapshot', () => {
    beforeEach(async () => {
      await sessionLogger.writeSessionStart();
    });

    it('should write iteration snapshot to progress.jsonl', async () => {
      const snapshot: ProgressSnapshot = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        tasksComplete: 0,
        tasksTotal: 5,
        currentTask: {
          id: 'test-task',
          epic: 'test-epic',
          attempt: 1,
          status: 'running',
        },
        gaps: [],
      };

      await sessionLogger.writeIterationSnapshot(snapshot);

      const progressPath = join(sessionLogger.getSessionDir(), 'progress.jsonl');
      const content = await readFile(progressPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);

      const progressEntry = JSON.parse(lines[0]);
      expect(progressEntry.iteration).toBe(1);
      expect(progressEntry.tasksComplete).toBe(0);
      expect(progressEntry.tasksTotal).toBe(5);
      expect(progressEntry.currentTask.id).toBe('test-task');
    });

    it('should write iteration event', async () => {
      const snapshot: ProgressSnapshot = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        tasksComplete: 0,
        tasksTotal: 5,
        gaps: [],
      };

      await sessionLogger.writeIterationSnapshot(snapshot);

      const eventsPath = join(sessionLogger.getSessionDir(), 'events.jsonl');
      const content = await readFile(eventsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const iterationEvent = lines.find(line => {
        const event = JSON.parse(line);
        return event.eventType === 'ITERATION_START';
      });

      expect(iterationEvent).toBeTruthy();
    });

    it('should write human-readable iteration to session log', async () => {
      const snapshot: ProgressSnapshot = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        tasksComplete: 0,
        tasksTotal: 5,
        currentTask: {
          id: 'test-task',
          epic: 'test-epic',
          attempt: 1,
          status: 'running',
        },
        gaps: [],
      };

      await sessionLogger.writeIterationSnapshot(snapshot);

      const logPath = join(sessionLogger.getSessionDir(), 'session.log');
      const content = await readFile(logPath, 'utf-8');

      expect(content).toContain('Iteration 1');
      expect(content).toContain('Progress: 0/5 tasks complete');
      expect(content).toContain('Next task: test-task');
    });
  });

  describe('writeSessionEnd', () => {
    beforeEach(async () => {
      await sessionLogger.writeSessionStart();
    });

    it('should finalize metadata with outcomes', async () => {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: 5,
          tasksCompleted: 3,
          tasksFailed: 1,
          gapsResolved: 10,
          convergenceAchieved: true,
        },
        'complete'
      );

      const metadataPath = join(sessionLogger.getSessionDir(), 'metadata.json');
      const content = await readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      expect(metadata.status).toBe('complete');
      expect(metadata.endTime).toBeTruthy();
      expect(metadata.duration).toBeGreaterThan(0);
      expect(metadata.outcomes.totalIterations).toBe(5);
      expect(metadata.outcomes.tasksCompleted).toBe(3);
      expect(metadata.outcomes.tasksFailed).toBe(1);
      expect(metadata.outcomes.gapsResolved).toBe(10);
      expect(metadata.outcomes.convergenceAchieved).toBe(true);
    });

    it('should write session end event', async () => {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: 5,
          tasksCompleted: 3,
          tasksFailed: 1,
          gapsResolved: 10,
          convergenceAchieved: true,
        },
        'complete'
      );

      const eventsPath = join(sessionLogger.getSessionDir(), 'events.jsonl');
      const content = await readFile(eventsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const sessionEndEvent = lines.find(line => {
        const event = JSON.parse(line);
        return event.eventType === 'SESSION_END';
      });

      expect(sessionEndEvent).toBeTruthy();
      const event = JSON.parse(sessionEndEvent!);
      expect(event.metadata?.status).toBe('complete');
    });

    it('should write summary to session log', async () => {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: 5,
          tasksCompleted: 3,
          tasksFailed: 1,
          gapsResolved: 10,
          convergenceAchieved: true,
        },
        'complete'
      );

      const logPath = join(sessionLogger.getSessionDir(), 'session.log');
      const content = await readFile(logPath, 'utf-8');

      expect(content).toContain('SESSION COMPLETE');
      expect(content).toContain('Iterations: 5');
      expect(content).toContain('Tasks Completed: 3');
      expect(content).toContain('Tasks Failed: 1');
      expect(content).toContain('Gaps Resolved: 10');
      expect(content).toContain('Convergence: Yes');
    });
  });

  describe('Task-level logging', () => {
    beforeEach(async () => {
      await sessionLogger.writeSessionStart();
    });

    it('should log task selection', async () => {
      await sessionLogger.logTaskSelected('test-task', 'test-epic', 1);

      const eventsPath = join(sessionLogger.getSessionDir(), 'events.jsonl');
      const content = await readFile(eventsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const taskSelectedEvent = lines.find(line => {
        const event = JSON.parse(line);
        return event.eventType === 'TASK_SELECTED';
      });

      expect(taskSelectedEvent).toBeTruthy();
      const event = JSON.parse(taskSelectedEvent!);
      expect(event.metadata?.taskId).toBe('test-task');
      expect(event.metadata?.epicId).toBe('test-epic');
      expect(event.metadata?.attempt).toBe(1);
    });

    it('should log task attempt completion', async () => {
      await sessionLogger.logTaskAttemptComplete('test-task', 1, true, 5000);

      const eventsPath = join(sessionLogger.getSessionDir(), 'events.jsonl');
      const content = await readFile(eventsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const taskCompleteEvent = lines.find(line => {
        const event = JSON.parse(line);
        return event.eventType === 'TASK_ATTEMPT_COMPLETE';
      });

      expect(taskCompleteEvent).toBeTruthy();
      const event = JSON.parse(taskCompleteEvent!);
      expect(event.metadata?.taskId).toBe('test-task');
      expect(event.metadata?.attempt).toBe(1);
      expect(event.metadata?.success).toBe(true);
      expect(event.metadata?.duration).toBe(5000);
    });

    it('should log convergence', async () => {
      await sessionLogger.logConvergence('test-task', true);

      const eventsPath = join(sessionLogger.getSessionDir(), 'events.jsonl');
      const content = await readFile(eventsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const convergenceEvent = lines.find(line => {
        const event = JSON.parse(line);
        return event.eventType === 'CONVERGENCE_ACHIEVED';
      });

      expect(convergenceEvent).toBeTruthy();
    });

    it('should log stalled convergence', async () => {
      await sessionLogger.logConvergence('test-task', false);

      const eventsPath = join(sessionLogger.getSessionDir(), 'events.jsonl');
      const content = await readFile(eventsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      const stallEvent = lines.find(line => {
        const event = JSON.parse(line);
        return event.eventType === 'CONVERGENCE_STALLED';
      });

      expect(stallEvent).toBeTruthy();
    });
  });
});
