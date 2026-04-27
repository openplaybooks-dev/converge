import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { sessionsDir, sessionDir } from './paths';
import { readEvents, SimpleLogTailer } from '@converge/core/studio-api';

type EventType =
  | 'SESSION_START' | 'SESSION_END' | 'ITERATION_START' | 'ITERATION_COMPLETE'
  | 'GAP_DETECTED' | 'GAP_RESOLVED' | 'TASK_START' | 'TASK_COMPLETE' | 'TASK_FAILED'
  | 'EPIC_START' | 'EPIC_COMPLETE' | 'EPIC_FAILED' | 'PROJECT_START' | 'PROJECT_COMPLETE'
  | 'ERROR' | 'DECISION' | 'RETRY' | 'CHECK_RUN' | 'CHECK_FAILED'
  | 'GAP_RESOLVED' | 'GAP_FIX_FAILED' | 'TASKS_CHANGED'
  | 'CLAUDEFN_START' | 'CLAUDEFN_COMPLETE' | 'CLAUDEFN_FAILED'
  | 'PLAN_START' | 'PLAN_COMPLETE' | 'PLAN_FAILED'
  | 'UPSTREAM_TRIGGERED' | 'UPSTREAM_RESOLVED' | 'UPSTREAM_FAILED' | 'UPSTREAM_SKIPPED'
  | 'STRATEGY_ATTEMPTED' | 'STRATEGY_SUCCEEDED' | 'STRATEGY_FAILED'
  | 'TIMELINE_BEGIN' | 'TIMELINE_FINISH' | 'REWIND_TRIGGERED' | 'REWIND_SUCCEEDED' | 'REWIND_FAILED'
  | 'PRUNE_MARKER' | 'LIFECYCLE_BEFORE_START' | 'LIFECYCLE_BEFORE_COMPLETE' | 'LIFECYCLE_BEFORE_FAILED'
  | 'INPUT_SNAPSHOT_TAKEN' | 'CONTEXT_DOC_BUILT' | 'DEPENDENCY_MISSING' | 'DEPENDENCY_SATISFIED'
  | 'LIFECYCLE_AFTER_START' | 'LIFECYCLE_AFTER_COMPLETE' | 'LIFECYCLE_AFTER_FAILED'
  | 'DIFF_CAPTURED' | 'CHECKS_RUN' | 'CHECK_PASSED' | 'CHECK_FAILED_DETAIL'
  | 'OUTCOME_WRITTEN' | 'BACKLOGS_COLLECTED' | 'SUMMARY_WRITTEN'
  | 'CORRECTION_LOOP_START' | 'CORRECTION_LOOP_EXHAUSTED' | 'CORRECTION_ATTEMPTED'
  | 'CORRECTION_DIAGNOSIS' | 'CORRECTION_APPLIED' | 'CORRECTION_VERIFIED' | 'CORRECTION_FAILED'
  | 'WBS_SEED' | 'TASK_CRASH' | 'SKILL_VALIDATION_FAILED' | 'CLAUDEFN_PROMPT'
  | 'CLAUDEFN_CRASH_RETRY' | 'CLAUDEFN_TIMEOUT_RETRY' | 'CHECK_SELF_HEALED' | 'HEALTH_CHECK_ISSUES'
  | 'WBS_SPAWN_BLOCKED' | 'WBS_SPAWN_ISSUES' | 'INCOMPLETE_PRODUCER_FIXED' | 'PATTERN_AUTO_FIXED'
  | 'AWAITING_USER_INPUT' | 'USER_INPUT_RECEIVED' | 'WBS_GENERATOR_FIXED' | 'TOOL_ENVIRONMENT_REPAIRED';

interface JournalEvent {
  timestamp: string;
  eventType: EventType;
  level: 'project' | 'epic' | 'task';
  scope: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionSummary {
  playbook: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  status?: 'running' | 'completed' | 'failed' | 'unknown';
  iterations?: number;
}

export interface SessionMetadata {
  sessionId: string;
  projectName: string;
  startTime: string;
  endTime?: string;
  status?: string;
  config?: Record<string, unknown>;
  environment?: Record<string, unknown>;
  duration?: number;
  outcomes?: Record<string, unknown>;
}

export async function listSessions(playbook: string, root?: string): Promise<SessionSummary[]> {
  const dir = sessionsDir(playbook, root);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const sessions: SessionSummary[] = await Promise.all(
    entries.map(async (sessionId) => {
      try {
        const metaPath = path.join(dir, sessionId, 'metadata.json');
        const text = await fs.readFile(metaPath, 'utf-8');
        const meta: SessionMetadata = JSON.parse(text);
        return {
          playbook,
          sessionId: meta.sessionId,
          startTime: meta.startTime,
          endTime: meta.endTime,
          status: meta.status === 'error' ? 'failed' : (meta.status as SessionSummary['status'] | undefined),
          iterations: meta.outcomes?.totalIterations as number | undefined,
        };
      } catch {
        // infer from directory mtime if metadata missing/malformed
        const stat = await fs.stat(path.join(dir, sessionId));
        return {
          playbook,
          sessionId,
          startTime: stat.mtime.toISOString(),
          status: 'unknown',
        };
      }
    })
  );

  return sessions.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

export async function readMetadata(
  playbook: string,
  sessionId: string,
  root?: string,
): Promise<SessionMetadata> {
  const metaPath = path.join(sessionDir(playbook, sessionId, root), 'metadata.json');
  const text = await fs.readFile(metaPath, 'utf-8');
  return JSON.parse(text);
}

export async function readEventsPaginated(
  playbook: string,
  sessionId: string,
  opts: { offset?: number; limit?: number },
  root?: string,
): Promise<JournalEvent[]> {
  const sDir = sessionDir(playbook, sessionId, root);
  return readEvents(sDir, 'epic', sessionId, { offset: opts.offset, last: opts.limit });
}

export async function* tailEvents(
  playbook: string,
  sessionId: string,
  root?: string,
): AsyncIterable<JournalEvent> {
  const sDir = sessionDir(playbook, sessionId, root);
  const eventsPath = path.join(sDir, 'events.jsonl');
  const tailer = new SimpleLogTailer(sDir);
  let offset = 0;

  try {
    // Prime the tailer so it starts watching
    await tailer.start();

    while (true) {
      try {
        const stat = await fs.stat(eventsPath);
        const size = stat.size;

        if (size > offset) {
          const fd = await fs.open(eventsPath, 'r');
          try {
            const buf = Buffer.alloc(size - offset);
            await fd.read(buf, 0, buf.length, offset);
            await fd.close();
            const text = buf.toString('utf-8');
            const lines = text.split('\n').filter(l => l.trim());
            for (const line of lines) {
              yield JSON.parse(line) as JournalEvent;
            }
            offset = size;
          } catch {
            await fd.close();
          }
        }
      } catch {
        // events.jsonl may not exist yet
      }

      // Brief poll — SimpleLogTailer handles file watching for discovery;
      // we poll events.jsonl directly to stream new lines
      await new Promise(r => setTimeout(r, 500));
    }
  } finally {
    tailer.stop();
  }
}
