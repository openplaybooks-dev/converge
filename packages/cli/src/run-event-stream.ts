/**
 * RunEventStream — optional NDJSON event sink for `converge run`.
 *
 * Enabled with `--events <path>`. Emits one line per state transition that
 * a babysitter (human, agent, or CI) would otherwise have to grep out of
 * the prose console log. Schema is intentionally minimal and stable.
 *
 * Each event:
 *   { ts, kind, ... }
 *
 * Kinds emitted today:
 *   - run.start          { caps: { maxIterations, maxTaskAttempts } }
 *   - run.iteration      { n, progress: { completed, total } }
 *   - task.start         { taskId, relPath }
 *   - task.complete      { taskId }                           (auto-rolled-up)
 *   - parent.auto-complete { taskId, childCount }
 *   - gap.detected       { taskId, kind, description }
 *   - gap.resolved       { taskId, count }
 *   - escalation         { taskId, reason, missingFile? }
 *   - run.end            { converged, exitCode }
 */

import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { dirname } from "node:path";

let activeStream: RunEventStream | null = null;

export class RunEventStream {
  private stream: WriteStream;
  private closed = false;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.stream = createWriteStream(path, { flags: "a" });
    this.stream.on("error", (err) => {
      // Never block the run on event-stream IO problems.
      // eslint-disable-next-line no-console
      console.error(`⚠️  RunEventStream write error: ${err.message}`);
    });
  }

  emit(kind: string, payload: Record<string, unknown> = {}): void {
    if (this.closed) return;
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        kind,
        ...payload,
      }) + "\n";
    this.stream.write(line);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.stream.end();
  }
}

export function setRunEventStream(stream: RunEventStream | null): void {
  activeStream = stream;
}

/**
 * Best-effort emit. Safe to call from anywhere — no-op when --events
 * wasn't passed. Designed so emit sites don't need to care whether the
 * stream is live.
 */
export function emitRunEvent(
  kind: string,
  payload: Record<string, unknown> = {},
): void {
  if (!activeStream) return;
  activeStream.emit(kind, payload);
}
