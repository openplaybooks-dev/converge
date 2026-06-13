/**
 * RFC 0050 — the durable step journal.
 *
 * Append-only `steps.jsonl` under `.converge/journal/<flow>/`. Each record is
 * one journaled checkpoint (a `Task` step, or a journaled deterministic value
 * like `now()`/`uuid()`). The journal IS the durable mid-flight state: on
 * resume, the runtime replays every record whose key matches the re-executed
 * call instead of running it again.
 *
 * Fresh (non-resume) runs truncate the file so a prior journal can never cause
 * a false replay. Resume runs load the prior records (last write wins per key).
 */

import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";

export interface StepRecord {
  /** Deterministic step key — stable across replays of the same flow. */
  key: string;
  kind: "step" | "value";
  status: "done";
  /** Fingerprint of the resolved task (step records only). */
  fingerprint?: string;
  taskId?: string;
  phase?: string;
  /** Returned output JSON (step records). */
  output?: unknown;
  /** Journaled deterministic value (value records: now/uuid). */
  value?: unknown;
}

export class StepJournal {
  private readonly records = new Map<string, StepRecord>();
  /** Keys referenced during THIS run — used to detect resume divergence. */
  private readonly referenced = new Set<string>();
  private loadedKeys: string[] = [];

  private constructor(private readonly path: string) {}

  static open(
    projectDir: string,
    flowName: string,
    opts: { resume: boolean },
  ): StepJournal {
    const path = join(
      projectDir,
      ".converge",
      "journal",
      flowName,
      "steps.jsonl",
    );
    mkdirSync(dirname(path), { recursive: true });
    const journal = new StepJournal(path);

    if (opts.resume && existsSync(path)) {
      const content = readFileSync(path, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const rec = JSON.parse(trimmed) as StepRecord;
          if (rec && rec.key) journal.records.set(rec.key, rec);
        } catch {
          // skip malformed line — partial trailing write from a crash
        }
      }
      journal.loadedKeys = [...journal.records.keys()];
    } else {
      writeFileSync(path, "");
    }
    return journal;
  }

  get(key: string): StepRecord | undefined {
    return this.records.get(key);
  }

  has(key: string): boolean {
    return this.records.has(key);
  }

  /** Record that this run referenced `key` (replayed or freshly appended). */
  markReferenced(key: string): void {
    this.referenced.add(key);
  }

  /**
   * Journaled step keys (excluding internal value records) that this run never
   * referenced — i.e. steps that existed in a prior run but the re-executed
   * flow no longer asks for. A non-empty list means the control flow diverged
   * (a step was removed/renamed/reordered out), so replay is no longer a
   * faithful continuation. Warning-only; safe under `parallel` since every live
   * key is still referenced.
   */
  orphanedKeys(): string[] {
    return this.loadedKeys.filter(
      (k) => !k.startsWith("__") && !this.referenced.has(k),
    );
  }

  append(rec: StepRecord): void {
    this.records.set(rec.key, rec);
    // Crash-safe append: write + fsync so a journaled step survives a crash or
    // power loss before the next OS flush. open('a') is atomic per write, so
    // concurrent appends from a fanned-out `parallel` interleave by whole
    // lines (never torn); resume dedupes by key (last write wins).
    const fd = openSync(this.path, "a");
    try {
      writeSync(fd, JSON.stringify(rec) + "\n");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
}
