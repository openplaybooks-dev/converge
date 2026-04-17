/**
 * Inspect Command
 *
 * Comprehensive inspection tool for harness sessions.
 * Navigate through: sessions → tasks → attempts → phases → tool calls
 * Display session directory structure and detailed execution logs.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';
import type { CommonOptions } from './commands.ts';
import type { SessionEvent, SessionMetadata, ProgressSnapshot } from '../journal/session-types.ts';
import { getSessionsDir, getEpicsDir } from '../journal/structure.ts';
import {
  renderSingleSessionTimeline,
  renderMultiSessionTimeline,
  renderDirectoryTree,
  renderAggregatedInspection,
  renderConvergenceView,
  color,
  COLORS,
  type SessionData,
  type SessionInfo,
} from './inspect-display.ts';

/* ------------------------------------------------------------------ */
/*  Inspect Options                                                   */
/* ------------------------------------------------------------------ */

export interface InspectOptions extends CommonOptions {
  /** Session ID to display (default: show all sessions) */
  session?: string;

  /** Show last N sessions (default: 10) */
  last?: number;

  /** Show only the last session */
  lastSession?: boolean;

  /** Filter by task ID */
  task?: string;

  /** Drill into specific attempt number */
  attempt?: number;

  /** Filter to specific phase */
  phase?: string;

  /** Show only specific event types (comma-separated) */
  events?: string;

  /** Show directory structure */
  dirs?: boolean;

  /** Show detailed tool usage */
  tools?: boolean;

  /** Show full tool parameters and results */
  toolDetails?: boolean;

  /** Show AI activity details */
  ai?: boolean;

  /** Show validation check details */
  validation?: boolean;

  /** Export to JSON format */
  json?: boolean;

  /** Compact view (fewer details) */
  compact?: boolean;

  /** Tree view of session directories */
  tree?: boolean;

  /** Show convergence graph progress for a task (requires --task) */
  converge?: boolean;
}

// Deprecated: Keep TimelineOptions as alias for backward compatibility
export type TimelineOptions = InspectOptions;

/* ------------------------------------------------------------------ */
/*  Session Discovery                                                 */
/* ------------------------------------------------------------------ */

/**
 * Find project root by looking for .harness directory
 */
async function findProjectRoot(startDir?: string): Promise<string> {
  let dir = startDir || process.cwd();
  while (dir !== '/') {
    if (existsSync(join(dir, '.harness'))) {
      return dir;
    }
    dir = join(dir, '..');
  }
  throw new Error('Not inside a harness project (no .harness directory found)');
}

/**
 * Get all session directories
 */
async function findSessions(projectDir: string): Promise<SessionInfo[]> {
  const sessionsDir = getSessionsDir(projectDir);

  if (!existsSync(sessionsDir)) {
    return [];
  }

  const entries = await readdir(sessionsDir, { withFileTypes: true });
  const sessions: SessionInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'latest') {
      continue;
    }

    const sessionId = entry.name;
    const sessionDir = join(sessionsDir, sessionId);
    const metadataPath = join(sessionDir, 'metadata.json');

    if (!existsSync(metadataPath)) {
      continue;
    }

    try {
      const metadataRaw = await readFile(metadataPath, 'utf-8');

      // Skip empty files (interrupted sessions)
      if (!metadataRaw.trim()) {
        continue;
      }

      const metadata: SessionMetadata = JSON.parse(metadataRaw);

      sessions.push({
        sessionId,
        sessionDir,
        metadata,
      });
    } catch (err) {
      console.warn(`Warning: Failed to parse metadata for session ${sessionId}`);
      continue;
    }
  }

  // Sort by session ID (most recent first)
  sessions.sort((a, b) => b.sessionId.localeCompare(a.sessionId));

  return sessions;
}

/**
 * Get latest session ID
 */
async function getLatestSession(projectDir: string): Promise<string | null> {
  const sessions = await findSessions(projectDir);
  return sessions.length > 0 ? sessions[0].sessionId : null;
}

/**
 * Get session data by ID
 */
async function getSessionById(
  projectDir: string,
  sessionId: string
): Promise<SessionData | null> {
  const sessionDir = join(getSessionsDir(projectDir), sessionId);

  if (!existsSync(sessionDir)) {
    return null;
  }

  const metadataPath = join(sessionDir, 'metadata.json');
  const eventsPath = join(sessionDir, 'events.jsonl');
  const progressPath = join(sessionDir, 'progress.jsonl');

  if (!existsSync(metadataPath) || !existsSync(eventsPath)) {
    return null;
  }

  try {
    // Read metadata
    const metadataRaw = await readFile(metadataPath, 'utf-8');
    const metadata: SessionMetadata = JSON.parse(metadataRaw);

    // Read events
    const events = await parseSessionEvents(eventsPath);

    // Read progress (optional)
    let progress: ProgressSnapshot[] = [];
    if (existsSync(progressPath)) {
      progress = await parseProgressSnapshots(progressPath);
    }

    return {
      sessionId,
      sessionDir,
      metadata,
      events,
      progress,
    };
  } catch (err) {
    console.error(`Error loading session ${sessionId}:`, err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Event Parsing                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse session events from JSONL file
 */
async function parseSessionEvents(eventsPath: string): Promise<SessionEvent[]> {
  const content = await readFile(eventsPath, 'utf-8');
  const lines = content.trim().split('\n').filter((l) => l.trim());

  const events: SessionEvent[] = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line) as SessionEvent);
    } catch (err) {
      console.warn(`Skipping malformed event: ${err}`);
    }
  }

  return events;
}

/**
 * Parse progress snapshots from JSONL file
 */
async function parseProgressSnapshots(progressPath: string): Promise<ProgressSnapshot[]> {
  const content = await readFile(progressPath, 'utf-8');
  const lines = content.trim().split('\n').filter((l) => l.trim());

  const snapshots: ProgressSnapshot[] = [];
  for (const line of lines) {
    try {
      snapshots.push(JSON.parse(line) as ProgressSnapshot);
    } catch (err) {
      console.warn(`Skipping malformed progress snapshot: ${err}`);
    }
  }

  return snapshots;
}

/**
 * Filter events based on options
 */
function filterEvents(events: SessionEvent[], options: InspectOptions): SessionEvent[] {
  let filtered = events;

  // Filter by task ID
  if (options.task) {
    const taskFilter = options.task;
    filtered = filtered.filter(
      (e) =>
        e.metadata?.taskId === taskFilter ||
        (typeof e.message === 'string' && e.message.includes(taskFilter))
    );
  }

  // Filter by event types
  if (options.events) {
    const types = options.events.split(',').map((t) => t.trim());
    filtered = filtered.filter((e) => types.includes(e.eventType));
  }

  return filtered;
}

/* ------------------------------------------------------------------ */
/*  Main Command Handler                                              */
/* ------------------------------------------------------------------ */

/**
 * Inspect command - comprehensive inspection tool for harness sessions
 */
export async function inspectCommand(options: InspectOptions = {}): Promise<void> {
  try {
    const projectDir = await findProjectRoot(options.dir);

    // Find all sessions
    const allSessions = await findSessions(projectDir);

    // Convergence view (--converge --task=ID) — works without sessions
    if (options.converge) {
      if (!options.task) {
        console.error('');
        console.error('❌ --converge requires --task=<taskPath>');
        console.error('');
        console.error('Usage: harness inspect --converge --task=<epicId/taskId>');
        console.error('');
        console.error('Example:');
        console.error('  harness inspect --converge --task=02-design-system/005-generate-design-references');
        console.error('');
        process.exit(1);
      }

      const epicsRoot = getEpicsDir(projectDir);
      const convergencePath = join(epicsRoot, ...options.task.split('/'), 'logs', 'convergence.json');

      if (!existsSync(convergencePath)) {
        console.error('');
        console.error(`❌ No convergence.json found for task: ${options.task}`);
        console.error(`   Expected: ${convergencePath}`);
        console.error('');
        process.exit(1);
      }

      try {
        const raw = await readFile(convergencePath, 'utf-8');
        const walkerState = JSON.parse(raw);

        if (options.json) {
          console.log(JSON.stringify(walkerState, null, 2));
          return;
        }

        renderConvergenceView(options.task, walkerState, options);
      } catch (err: any) {
        console.error(`❌ Failed to parse convergence.json: ${err.message}`);
        process.exit(1);
      }
      return;
    }

    if (allSessions.length === 0) {
      console.log('');
      console.log('No sessions found.');
      console.log('');
      console.log('Run `pnpm harness run` to create a session.');
      console.log('');
      return;
    }

    // Last session view (--last-session)
    if (options.lastSession) {
      const latestSession = allSessions[0]; // Already sorted by date, newest first
      if (!latestSession) {
        console.log('No sessions found.');
        return;
      }

      // Load full session data
      const session = await getSessionById(projectDir, latestSession.sessionId);
      if (!session) {
        console.error(`Could not load session: ${latestSession.sessionId}`);
        process.exit(1);
      }

      // Filter events if needed
      const filteredEvents = filterEvents(session.events, options);
      const filteredSession = { ...session, events: filteredEvents };

      // JSON export
      if (options.json) {
        const output = {
          sessionId: session.sessionId,
          metadata: session.metadata,
          events: filteredEvents,
          progress: session.progress,
        };
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Render session detail
      renderSingleSessionTimeline(filteredSession, options);
      return;
    }

    // Multi-session view (--last without specific session)
    if (options.last && !options.session) {
      const count = Math.min(options.last, allSessions.length);
      const sessions = allSessions.slice(0, count);

      // If only 1 session requested, show detailed view like --last-session
      if (count === 1 && sessions.length === 1) {
        const session = await getSessionById(projectDir, sessions[0].sessionId);
        if (!session) {
          console.error(`Could not load session: ${sessions[0].sessionId}`);
          process.exit(1);
        }

        // Filter events if needed
        const filteredEvents = filterEvents(session.events, options);
        const filteredSession = { ...session, events: filteredEvents };

        // JSON export
        if (options.json) {
          const output = {
            sessionId: session.sessionId,
            metadata: session.metadata,
            events: filteredEvents,
            progress: session.progress,
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Render detailed session view
        renderSingleSessionTimeline(filteredSession, options);
        return;
      }

      // Otherwise show timeline view
      await renderAggregatedInspection(projectDir, sessions, options);
      return;
    }

    // Default behavior: show comprehensive aggregated inspection
    if (!options.session && !options.dirs) {
      await renderAggregatedInspection(projectDir, allSessions, options);
      return;
    }

    // Directory view (--dirs)
    if (options.dirs) {
      if (options.session) {
        // Show specific session directory
        const session = allSessions.find(s => s.sessionId === options.session);
        if (session) {
          renderDirectoryTree(session.sessionDir, session.sessionId);
        } else {
          console.error(`Session not found: ${options.session}`);
          process.exit(1);
        }
      } else {
        // Show all session directories
        console.log('');
        console.log(color('📁 Session Directories', COLORS.BOLD));
        console.log('');
        const count = Math.min(options.last || 10, allSessions.length);
        const sessions = allSessions.slice(0, count);
        for (const session of sessions) {
          console.log(`${session.sessionId}`);
          console.log(`  ${color(session.sessionDir, COLORS.GRAY)}`);
          console.log('');
        }
        console.log(color('Usage:', COLORS.BOLD));
        console.log('  harness inspect --dirs --session=<id>   View specific session directory');
        console.log('');
      }
      return;
    }

    // Single session view (session ID specified)
    let sessionId = options.session;

    // If no session ID provided at this point, something went wrong
    if (!sessionId) {
      console.error('No session specified. Use --session=<id> to view a specific session.');
      process.exit(1);
    }

    // Load session data
    const session = await getSessionById(projectDir, sessionId);

    if (!session) {
      console.error(`Session not found: ${sessionId}`);
      console.error('');
      console.error('Available sessions:');
      for (const s of allSessions.slice(0, 5)) {
        console.error(`  - ${s.sessionId}`);
      }
      if (allSessions.length > 5) {
        console.error(`  ... and ${allSessions.length - 5} more`);
      }
      console.error('');
      process.exit(1);
    }

    // Filter events
    const filteredEvents = filterEvents(session.events, options);
    const filteredSession = { ...session, events: filteredEvents };

    // JSON export
    if (options.json) {
      const output = {
        sessionId: session.sessionId,
        metadata: session.metadata,
        events: filteredEvents,
        progress: session.progress,
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Render timeline
    renderSingleSessionTimeline(filteredSession, options);
  } catch (error: any) {
    console.error(`\n❌ Inspect error: ${error.message}`);
    if (options.verbose) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Timeline command - DEPRECATED: Use inspectCommand instead
 * Kept for backward compatibility
 */
export async function timelineCommand(options: TimelineOptions = {}): Promise<void> {
  console.warn('⚠️  Warning: The \'timeline\' command is deprecated. Please use \'inspect\' instead.');
  console.warn('   This alias will be removed in a future version.\n');
  return inspectCommand(options);
}
