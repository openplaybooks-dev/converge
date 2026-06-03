/**
 * Repair Memory — playbook-level cache of (failure-signature → fix outcome).
 *
 * When the same failure signature recurs, skip the LLM call and either:
 *   - Reapply the cached patch (when one was captured), OR
 *   - At minimum, surface "you've seen this before, last fix was X" to the
 *     repair pipeline so it can converge faster.
 *
 * Persisted to .converge/journal/<playbook>/repair-memory.json.
 *
 * Signatures are deliberately coarse — the goal is "did we already solve
 * something in the same family?", not exact-match deduping.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const SCHEMA_VERSION = 1;

export interface RepairMemoryEntry {
  /** Stable hash of (script path basename + last 200 chars of normalized error). */
  signature: string;
  /** First time we saw this failure (ISO 8601). */
  firstSeen: string;
  /** Last time we saw this failure. */
  lastSeen: string;
  /** Number of times this signature has fired. */
  occurrences: number;
  /** Was the most recent attempted fix successful? */
  lastSucceeded: boolean;
  /** Strategy name that last fixed it (e.g. "seed-script-repair"). */
  strategy: string;
  /** Human-readable note (free-form, written by the strategy on success). */
  note?: string;
  /**
   * Optional captured patch — used if the strategy wants to re-apply the same
   * change deterministically next time. Today we just store the script path
   * and a copy of the post-fix file contents; future strategies can store a
   * diff instead.
   */
  patch?: {
    type: "file-replace";
    path: string; // relative to projectDir
    content: string; // post-fix content
  };
}

interface RepairMemoryFile {
  schemaVersion: number;
  entries: RepairMemoryEntry[];
}

function memoryPath(projectDir: string, playbookName: string): string {
  return join(
    projectDir,
    ".converge",
    "journal",
    playbookName,
    "repair-memory.json",
  );
}

function loadFile(path: string): RepairMemoryFile {
  if (!existsSync(path)) {
    return { schemaVersion: SCHEMA_VERSION, entries: [] };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.entries) &&
      parsed.schemaVersion === SCHEMA_VERSION
    ) {
      return parsed as RepairMemoryFile;
    }
  } catch {
    /* fall through to empty */
  }
  return { schemaVersion: SCHEMA_VERSION, entries: [] };
}

function saveFile(path: string, data: RepairMemoryFile): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

/**
 * Normalize an error string so cosmetically-different errors with the same
 * root cause hash to the same signature.
 *
 * - Strip absolute paths down to basenames (PIDs, tmpdirs, journal session
 *   timestamps all change between runs).
 * - Strip line:col numbers.
 * - Lowercase, collapse whitespace.
 * - Take last 200 chars (the actual error tail, not the stack walk-up).
 */
function normalizeError(message: string): string {
  let s = message;
  s = s.replace(/\/[^\s:'")]+\//g, "/"); // collapse paths
  s = s.replace(/:\d+:\d+/g, ":N:N"); // line:col
  s = s.replace(/:\d+\b/g, ":N"); // bare line numbers
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  return s.slice(-200);
}

/**
 * Compute a signature from an error message + an identifier for the failure
 * site (e.g. script path, task id).
 */
export function computeSignature(siteId: string, errorMessage: string): string {
  const norm = normalizeError(errorMessage);
  const siteBase = siteId.split("/").pop() || siteId;
  return createHash("sha256")
    .update(siteBase)
    .update("\0")
    .update(norm)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Look up a prior entry for this signature, if any.
 */
export function lookup(
  projectDir: string,
  playbookName: string,
  signature: string,
): RepairMemoryEntry | null {
  const file = loadFile(memoryPath(projectDir, playbookName));
  const entry = file.entries.find((e) => e.signature === signature);
  return entry ?? null;
}

/**
 * Record (or update) an entry. Idempotent: replays bump occurrences + lastSeen.
 */
export function record(
  projectDir: string,
  playbookName: string,
  entry: Omit<RepairMemoryEntry, "firstSeen" | "lastSeen" | "occurrences"> & {
    occurrences?: number;
  },
): void {
  const path = memoryPath(projectDir, playbookName);
  const file = loadFile(path);
  const now = new Date().toISOString();
  const existing = file.entries.find((e) => e.signature === entry.signature);
  if (existing) {
    existing.lastSeen = now;
    existing.occurrences += 1;
    existing.lastSucceeded = entry.lastSucceeded;
    existing.strategy = entry.strategy;
    if (entry.note) existing.note = entry.note;
    if (entry.patch) existing.patch = entry.patch;
  } else {
    file.entries.push({
      ...entry,
      firstSeen: now,
      lastSeen: now,
      occurrences: entry.occurrences ?? 1,
    });
  }
  saveFile(path, file);
}
