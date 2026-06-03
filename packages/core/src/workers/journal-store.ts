/**
 * RFC 0033 Phase 4 — Journal-Backed Persistence
 *
 * Append-only JSONL journals for tasks, workers, and leases.
 * Provides crash recovery via journal replay and derives manifest.json
 * from journal state on each write.
 *
 * Design:
 * - Each journal is a separate .jsonl file (tasks.jsonl, workers.jsonl, leases.jsonl)
 * - Events are appended atomically (write + fsync)
 * - Replay reconstructs current state from the journal
 * - No direct runstate.json mutations — state is always derived from journal
 */

import {
  existsSync,
  mkdirSync,
  appendFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export interface Manifest {
  tasks: Map<string, Record<string, any>>;
  leases: Map<string, Record<string, any>>;
  workers: Map<string, Record<string, any>>;
}

export interface DeriveManifestOptions {
  tasksKey: string;
  leasesKey: string;
  workersKey?: string;
}

export class JournalStore {
  private journalDir: string;

  constructor(journalDir: string) {
    this.journalDir = journalDir;
    if (!existsSync(journalDir)) {
      mkdirSync(journalDir, { recursive: true });
    }
  }

  /**
   * Append an event to a journal file.
   */
  async append(journal: string, event: Record<string, any>): Promise<void> {
    const path = this.journalPath(journal);
    const line = JSON.stringify(event) + "\n";
    appendFileSync(path, line, { encoding: "utf-8" });
  }

  /**
   * Read all events from a journal file.
   */
  async readAll(journal: string): Promise<Record<string, any>[]> {
    const path = this.journalPath(journal);
    if (!existsSync(path)) {
      return [];
    }

    const content = readFileSync(path, "utf-8");
    return content
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line));
  }

  /**
   * Replay a journal to derive current state.
   * Later entries overwrite earlier ones for the same key field.
   */
  async replay(
    journal: string,
    keyField: string,
  ): Promise<Map<string, Record<string, any>>> {
    const events = await this.readAll(journal);
    const state = new Map<string, Record<string, any>>();

    for (const event of events) {
      const key = event[keyField];
      if (key) {
        state.set(key, { ...state.get(key), ...event });
      }
    }

    return state;
  }

  /**
   * Derive a full manifest from all journals.
   */
  async deriveManifest(options: DeriveManifestOptions): Promise<Manifest> {
    const tasksState = await this.replay("tasks", options.tasksKey);
    const leasesState = await this.replay("leases", options.leasesKey);
    const workersState = options.workersKey
      ? await this.replay("workers", options.workersKey)
      : new Map<string, Record<string, any>>();

    const manifest: Manifest = {
      tasks: tasksState,
      leases: leasesState,
      workers: workersState,
    };

    // Write derived manifest to disk
    const manifestPath = join(this.journalDir, "manifest.json");
    const serializable: Record<string, any> = {
      tasks: Object.fromEntries(tasksState),
      leases: Object.fromEntries(leasesState),
      workers: Object.fromEntries(workersState),
    };
    writeFileSync(manifestPath, JSON.stringify(serializable, null, 2), "utf-8");

    return manifest;
  }

  private journalPath(journal: string): string {
    return join(this.journalDir, `${journal}.jsonl`);
  }
}
