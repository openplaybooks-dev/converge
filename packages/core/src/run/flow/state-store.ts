/**
 * RFC 0051 — durable flow state, stored in the INVENTORY layer.
 *
 * State lives under `.converge/inventory/<flow>/`, not the journal: the journal
 * is ephemeral execution evidence (gitignored), while the inventory is the
 * authoritative, committed runtime state (RFC 0033). Durable flow state — the
 * metadata/notes/durations/counters a flow accumulates — belongs with the
 * source of truth, so it survives across runs and is version-controllable.
 *
 * Two files, mirroring Converge's event-log + projection split:
 *   - `state.jsonl` — append-only event log of writes (the durable record).
 *     Each `set(key, …)` is keyed `<key>#<n>` by a per-key write counter, so it
 *     is idempotent across replays (resume re-runs the flow but never re-appends
 *     a write it already recorded) and the log never grows on repeated resumes.
 *   - `state.json`  — last-write-wins snapshot (the read surface for `inspect`
 *     / Studio / humans). Derived; rewritten on every `set`.
 *
 * The live map is rebuilt by re-applying writes IN ORDER as the flow replays,
 * so a `get` taken in the replayed prefix returns its as-of value.
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
import { join } from "node:path";

interface StateRecord {
  /** Idempotent write key: `<stateKey>#<per-key sequence>`. */
  key: string;
  stateKey: string;
  value: unknown;
}

export class FlowStateStore {
  /** jkey → recorded write (for replay). */
  private readonly records = new Map<string, StateRecord>();
  /** Live projection: stateKey → current value. */
  private readonly map = new Map<string, unknown>();

  private constructor(
    private readonly logPath: string,
    private readonly snapPath: string,
    private readonly dry: boolean,
  ) {}

  static open(
    projectDir: string,
    flowName: string,
    opts: { resume: boolean; dry?: boolean },
  ): FlowStateStore {
    const dir = join(projectDir, ".converge", "inventory", flowName);
    const logPath = join(dir, "state.jsonl");
    const snapPath = join(dir, "state.json");
    const store = new FlowStateStore(logPath, snapPath, !!opts.dry);
    if (opts.dry) return store; // no disk side effects in --dry

    mkdirSync(dir, { recursive: true });
    if (opts.resume && existsSync(logPath)) {
      for (const line of readFileSync(logPath, "utf-8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const rec = JSON.parse(trimmed) as StateRecord;
          if (rec && rec.key) store.records.set(rec.key, rec);
        } catch {
          // skip a partial trailing line from a crash
        }
      }
    } else {
      // Fresh run: reset both files, mirroring the steps.jsonl truncation.
      writeFileSync(logPath, "");
      store.writeSnapshot();
    }
    return store;
  }

  /** A prior recorded write for `jkey`, if any (replay path). */
  recordFor(jkey: string): StateRecord | undefined {
    return this.records.get(jkey);
  }

  has(stateKey: string): boolean {
    return this.map.has(stateKey);
  }

  read(stateKey: string): unknown {
    return this.map.get(stateKey);
  }

  all(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of this.map) obj[k] = v;
    return obj;
  }

  /** Apply a value to the live map without journaling (replay re-application). */
  apply(stateKey: string, value: unknown): void {
    this.map.set(stateKey, value);
    this.writeSnapshot();
  }

  /** Apply + durably append the write, then refresh the snapshot. */
  append(jkey: string, stateKey: string, value: unknown): void {
    const rec: StateRecord = { key: jkey, stateKey, value };
    this.records.set(jkey, rec);
    this.map.set(stateKey, value);
    if (this.dry) return;
    // Crash-safe append (open('a') is atomic per write; fsync flushes).
    const fd = openSync(this.logPath, "a");
    try {
      writeSync(fd, JSON.stringify(rec) + "\n");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    this.writeSnapshot();
  }

  private writeSnapshot(): void {
    if (this.dry) return;
    writeFileSync(this.snapPath, JSON.stringify(this.all(), null, 2));
  }
}
