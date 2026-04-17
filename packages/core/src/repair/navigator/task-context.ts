/**
 * TaskContext — persistent event log + convergence state for a task.
 *
 * Two artifacts:
 *   logs/events.jsonl   — append-only event log
 *   logs/convergence.json — flat convergence state (nodes + edges)
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getJournalStructure } from '../../journal/structure.ts';
import type { Gap } from '../../gap/types.ts';
import type { GraphNode, GraphEdge } from './types.ts';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Flat convergence state — nodes + edges, no nesting.
 * This is exactly what gets written to convergence.json.
 */
export interface WalkerState {
  iteration: number;
  stallCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class TaskContext {
  private readonly logsDir: string;
  private dirEnsured = false;

  constructor(projectDir: string, epicId: string, taskId: string) {
    const structure = getJournalStructure(projectDir, epicId, taskId);
    const taskDir = structure.task ?? structure.epic ?? join(projectDir, '.converge', 'journal');
    this.logsDir = join(taskDir, 'logs');
  }

  get convergencePath(): string {
    return join(this.logsDir, 'convergence.json');
  }

  private ensureDir(): void {
    if (this.dirEnsured) return;
    try {
      mkdirSync(this.logsDir, { recursive: true });
      this.dirEnsured = true;
    } catch { /* best-effort */ }
  }

  /** Append one event line to logs/events.jsonl */
  appendEvent(entry: Record<string, unknown>): void {
    try {
      this.ensureDir();
      const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
      appendFileSync(join(this.logsDir, 'events.jsonl'), line + '\n');
    } catch { /* best-effort */ }
  }

  /** Load convergence state from convergence.json. */
  async loadWalkerState(): Promise<WalkerState | null> {
    if (!existsSync(this.convergencePath)) return null;
    try {
      const raw = JSON.parse(await readFile(this.convergencePath, 'utf-8'));
      // Current format: { iteration, stallCount, nodes, edges }
      if (typeof raw.iteration === 'number' && Array.isArray(raw.nodes)) {
        // Migrate old-format nodes (type: 'action'|'condition') to new format (status/origin)
        const nodes = (raw.nodes as any[]).map(n => {
          if ('status' in n && 'origin' in n) return n; // already new format
          // Old format: { id, type, handler?, test?, params?, result? }
          return {
            id: n.id,
            handler: n.handler ?? n.id,
            status: 'done' as const,   // old nodes were already executed
            origin: 'initial' as const,
            data: n.params ?? undefined,
            result: n.result ? {
              action: n.result.action ?? 'continue',
              durationMs: 0,
              ...(n.result.reason ? { reason: n.result.reason } : {}),
            } : undefined,
          };
        });
        return { ...raw, nodes } as WalkerState;
      }
      // Migration from old tree format
      if (raw.tree || (raw.walker && typeof raw.walker === 'object')) {
        const w = raw.walker ?? raw;
        return {
          iteration: w.iteration ?? 0,
          stallCount: w.stallCount ?? 0,
          nodes: [],
          edges: [],
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Clear stale convergence state so the navigator starts fresh. */
  async clearWalkerState(): Promise<void> {
    try {
      if (existsSync(this.convergencePath)) {
        const { rm } = await import('node:fs/promises');
        await rm(this.convergencePath);
      }
    } catch { /* best-effort */ }
  }

  /** Save convergence state to convergence.json. */
  async saveWalkerState(state: WalkerState): Promise<void> {
    try {
      await mkdir(this.logsDir, { recursive: true });
      await writeFile(this.convergencePath, JSON.stringify(state, null, 2));
    } catch { /* best-effort */ }
  }

  /* ── Convenience methods ─────────────────────────────────────────── */

  logGaps(iter: number, gaps: readonly Gap[], prev: readonly Gap[]): void {
    const kinds = [...new Set(gaps.map(g => (g.metadata?.gapKind as string) || g.type))];
    this.appendEvent({
      type: 'gaps-detected',
      iter,
      count: gaps.length,
      kinds,
      delta: gaps.length - prev.length,
    });
  }

  logAction(iter: number, handler: string, result: string, ms: number, reason?: string): void {
    this.appendEvent({
      type: 'action',
      iter,
      handler,
      result,
      ms,
      ...(reason ? { reason } : {}),
    });
  }

  logStall(iter: number, stallCount: number): void {
    this.appendEvent({ type: 'stall', iter, stallCount });
  }

  logAttemptAdvanced(iter: number, to: string): void {
    this.appendEvent({ type: 'attempt-advanced', iter, to });
  }

  logOutcome(iter: number, result: string, reason?: string): void {
    this.appendEvent({
      type: 'outcome',
      iter,
      result,
      ...(reason ? { reason } : {}),
    });
  }
}
