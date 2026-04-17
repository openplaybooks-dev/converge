#!/usr/bin/env node
/**
 * Session Inspector CLI
 *
 * Quick utility to inspect session logs without manual jq commands.
 *
 * Usage:
 *   pnpm harness inspect-session [sessionId]
 *   pnpm harness inspect-session --latest
 *   pnpm harness inspect-session --list
 *   pnpm harness inspect-session <id> --gaps
 *   pnpm harness inspect-session <id> --strategies
 *   pnpm harness inspect-session <id> --tasks
 *   pnpm harness inspect-session <id> --timeline
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { getSessionsDir } from '../journal/structure.ts';

interface SessionEvent {
  timestamp: string;
  eventType: string;
  message?: string;
  metadata?: Record<string, any>;
}

interface SessionMetadata {
  sessionId: string;
  projectName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: string;
  config: {
    maxIterations: number;
    maxAttemptsPerTask?: number;
  };
  outcomes?: {
    totalIterations: number;
    tasksCompleted: number;
    tasksFailed: number;
    gapsResolved: number;
    convergenceAchieved: boolean;
  };
}

async function findProjectRoot(): Promise<string> {
  let dir = process.cwd();
  while (dir !== '/') {
    if (existsSync(join(dir, '.harness'))) {
      return dir;
    }
    dir = join(dir, '..');
  }
  throw new Error('Not inside a harness project (no .harness directory found)');
}

async function listSessions(projectDir: string): Promise<void> {
  const sessionsDir = getSessionsDir(projectDir);

  if (!existsSync(sessionsDir)) {
    console.log('No sessions found. Run `pnpm harness run` to create a session.');
    return;
  }

  const entries = await readdir(sessionsDir, { withFileTypes: true });
  const sessions = entries.filter(e => e.isDirectory() && e.name !== 'latest');

  if (sessions.length === 0) {
    console.log('No sessions found.');
    return;
  }

  console.log(`\nFound ${sessions.length} session(s):\n`);

  for (const session of sessions.sort((a, b) => b.name.localeCompare(a.name))) {
    const metadataPath = join(sessionsDir, session.name, 'metadata.json');
    if (existsSync(metadataPath)) {
      const metadata: SessionMetadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
      const duration = metadata.duration ? `${Math.round(metadata.duration / 1000)}s` : 'running';
      const status = metadata.status === 'complete' ? '✅' :
                     metadata.status === 'error' ? '❌' :
                     metadata.status === 'stalled' ? '⚠️' : '🔄';
      console.log(`${status} ${session.name}`);
      console.log(`   Project: ${metadata.projectName}`);
      console.log(`   Status: ${metadata.status} | Duration: ${duration}`);
      if (metadata.outcomes) {
        console.log(`   Tasks: ${metadata.outcomes.tasksCompleted}/${metadata.outcomes.tasksCompleted + metadata.outcomes.tasksFailed} | Gaps: ${metadata.outcomes.gapsResolved}`);
      }
      console.log('');
    }
  }
}

async function showSessionSummary(projectDir: string, sessionId: string): Promise<void> {
  const sessionDir = join(getSessionsDir(projectDir), sessionId);

  if (!existsSync(sessionDir)) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const metadataPath = join(sessionDir, 'metadata.json');
  const metadata: SessionMetadata = JSON.parse(await readFile(metadataPath, 'utf-8'));

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  Session Summary: ${sessionId.slice(0, 30).padEnd(30)} ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  console.log(`Project: ${metadata.projectName}`);
  console.log(`Status: ${metadata.status}`);
  console.log(`Started: ${metadata.startTime}`);
  if (metadata.endTime) {
    console.log(`Ended: ${metadata.endTime}`);
  }
  if (metadata.duration) {
    const minutes = Math.floor(metadata.duration / 60000);
    const seconds = Math.floor((metadata.duration % 60000) / 1000);
    console.log(`Duration: ${minutes}m ${seconds}s`);
  }

  console.log(`\nConfiguration:`);
  console.log(`  Max Iterations: ${metadata.config.maxIterations}`);
  console.log(`  Max Attempts Per Task: ${metadata.config.maxAttemptsPerTask || 2}`);

  if (metadata.outcomes) {
    console.log(`\nOutcomes:`);
    console.log(`  Total Iterations: ${metadata.outcomes.totalIterations}`);
    console.log(`  Tasks Completed: ${metadata.outcomes.tasksCompleted}`);
    console.log(`  Tasks Failed: ${metadata.outcomes.tasksFailed}`);
    console.log(`  Gaps Resolved: ${metadata.outcomes.gapsResolved}`);
    console.log(`  Convergence: ${metadata.outcomes.convergenceAchieved ? 'Yes ✅' : 'No ❌'}`);
  }

  console.log(`\nSession directory: ${sessionDir}\n`);
}

async function showGaps(projectDir: string, sessionId: string): Promise<void> {
  const eventsPath = join(getSessionsDir(projectDir), sessionId, 'events.jsonl');

  if (!existsSync(eventsPath)) {
    console.error(`Events file not found for session: ${sessionId}`);
    process.exit(1);
  }

  const content = await readFile(eventsPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());

  const gaps = lines
    .map(line => JSON.parse(line) as SessionEvent)
    .filter(e => e.eventType === 'GAP_DETECTED');

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  Gaps Detected (${String(gaps.length).padEnd(3)})                                       ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  if (gaps.length === 0) {
    console.log('No gaps detected in this session.\n');
    return;
  }

  for (const gap of gaps) {
    const taskId = gap.metadata?.taskId || 'unknown';
    const gapType = gap.metadata?.gapType || 'unknown';
    console.log(`[${gap.timestamp}] ${taskId}`);
    console.log(`  Type: ${gapType}`);
    console.log(`  Message: ${gap.message || '(no message)'}\n`);
  }
}

async function showStrategies(projectDir: string, sessionId: string): Promise<void> {
  const eventsPath = join(getSessionsDir(projectDir), sessionId, 'events.jsonl');

  if (!existsSync(eventsPath)) {
    console.error(`Events file not found for session: ${sessionId}`);
    process.exit(1);
  }

  const content = await readFile(eventsPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());

  const strategies = lines
    .map(line => JSON.parse(line) as SessionEvent)
    .filter(e => e.eventType === 'STRATEGY_ATTEMPTED');

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  Strategies Attempted (${String(strategies.length).padEnd(3)})                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  if (strategies.length === 0) {
    console.log('No strategies attempted in this session.\n');
    return;
  }

  // Group by strategy name
  const strategyCount = new Map<string, number>();
  for (const s of strategies) {
    const name = s.metadata?.strategy || 'unknown';
    strategyCount.set(name, (strategyCount.get(name) || 0) + 1);
  }

  console.log('Strategy Usage:\n');
  for (const [name, count] of Array.from(strategyCount.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(40)} ${count}x`);
  }

  console.log('');
}

async function showTasks(projectDir: string, sessionId: string): Promise<void> {
  const eventsPath = join(getSessionsDir(projectDir), sessionId, 'events.jsonl');

  if (!existsSync(eventsPath)) {
    console.error(`Events file not found for session: ${sessionId}`);
    process.exit(1);
  }

  const content = await readFile(eventsPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());

  const taskEvents = lines
    .map(line => JSON.parse(line) as SessionEvent)
    .filter(e => ['TASK_SELECTED', 'TASK_ATTEMPT_COMPLETE'].includes(e.eventType));

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  Task Execution Timeline                                   ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  let currentTask: string | null = null;
  let taskStartTime: string | null = null;

  for (const event of taskEvents) {
    if (event.eventType === 'TASK_SELECTED') {
      currentTask = event.metadata?.taskId || 'unknown';
      taskStartTime = event.timestamp;
      console.log(`\n▶  ${currentTask}`);
      console.log(`   Selected at: ${event.timestamp}`);
    } else if (event.eventType === 'TASK_ATTEMPT_COMPLETE' && currentTask) {
      const success = event.metadata?.success;
      const duration = event.metadata?.duration;
      const icon = success ? '✅' : '❌';
      const durationStr = duration ? `${Math.round(duration / 1000)}s` : 'unknown';
      console.log(`   ${icon} ${success ? 'Completed' : 'Failed'} in ${durationStr}`);
      currentTask = null;
      taskStartTime = null;
    }
  }

  console.log('');
}

async function showTimeline(projectDir: string, sessionId: string): Promise<void> {
  const eventsPath = join(getSessionsDir(projectDir), sessionId, 'events.jsonl');

  if (!existsSync(eventsPath)) {
    console.error(`Events file not found for session: ${sessionId}`);
    process.exit(1);
  }

  const content = await readFile(eventsPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const events = lines.map(line => JSON.parse(line) as SessionEvent);

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  Full Event Timeline                                       ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  for (const event of events) {
    const icon = event.eventType === 'SESSION_START' ? '🚀' :
                 event.eventType === 'SESSION_END' ? '🏁' :
                 event.eventType === 'TASK_SELECTED' ? '▶' :
                 event.eventType === 'TASK_ATTEMPT_COMPLETE' ? '✅' :
                 event.eventType === 'GAP_DETECTED' ? '⚠️' :
                 event.eventType === 'STRATEGY_ATTEMPTED' ? '🔧' :
                 '•';

    console.log(`${icon} [${event.timestamp}] ${event.eventType}`);
    if (event.message) {
      console.log(`  ${event.message}`);
    }
  }

  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const projectDir = await findProjectRoot();

  // No args or --list: show all sessions
  if (args.length === 0 || args[0] === '--list') {
    await listSessions(projectDir);
    return;
  }

  // --latest: find most recent session
  let sessionId = args[0];
  if (sessionId === '--latest' || sessionId === 'latest') {
    const sessionsDir = getSessionsDir(projectDir);
    const entries = await readdir(sessionsDir, { withFileTypes: true });
    const sessions = entries
      .filter(e => e.isDirectory() && e.name !== 'latest')
      .sort((a, b) => b.name.localeCompare(a.name));

    if (sessions.length === 0) {
      console.error('No sessions found.');
      process.exit(1);
    }

    sessionId = sessions[0].name;
  }

  // Show specific view based on flags
  const hasFlag = (flag: string) => args.includes(flag);

  if (hasFlag('--gaps')) {
    await showGaps(projectDir, sessionId);
  } else if (hasFlag('--strategies')) {
    await showStrategies(projectDir, sessionId);
  } else if (hasFlag('--tasks')) {
    await showTasks(projectDir, sessionId);
  } else if (hasFlag('--timeline')) {
    await showTimeline(projectDir, sessionId);
  } else {
    // Default: show summary
    await showSessionSummary(projectDir, sessionId);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
