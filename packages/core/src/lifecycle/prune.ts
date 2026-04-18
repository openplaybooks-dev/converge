/**
 * Journal Self-Pruning
 *
 * Called at the start of each new task execution to keep journals focused
 * on what matters for the next attempt. Discards outdated noise while
 * preserving the audit trail needed for context propagation.
 */

import { readdir, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
  getTaskCorrectionsDir,
  getJournalStructure,
} from "../journal/structure.ts";
import { logTaskEvent } from "../journal/writer.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface PrunePolicy {
  /** Keep raw agent logs for last N runs (default: 2) */
  maxLogRuns: number;
  /** Keep full correction records for last N attempts (default: 3) */
  maxCorrectionHistory: number;
  /** Never delete the last successful outcome.json (default: true) */
  keepSuccessfulOutcome: boolean;
}

export interface PruneSummary {
  executionId: string;
  logsDeleted: number;
  correctionsCompressed: number;
  pruneMarkerWritten: boolean;
}

/* ------------------------------------------------------------------ */
/*  Default policy                                                      */
/* ------------------------------------------------------------------ */

export const DEFAULT_PRUNE_POLICY: PrunePolicy = {
  maxLogRuns: 2,
  maxCorrectionHistory: 3,
  keepSuccessfulOutcome: true,
};

/* ------------------------------------------------------------------ */
/*  Main prune function                                                 */
/* ------------------------------------------------------------------ */

export async function pruneTaskJournal(
  projectDir: string,
  epicId: string,
  taskId: string,
  executionId: string,
  policy: PrunePolicy = DEFAULT_PRUNE_POLICY,
): Promise<PruneSummary> {
  const summary: PruneSummary = {
    executionId,
    logsDeleted: 0,
    correctionsCompressed: 0,
    pruneMarkerWritten: false,
  };

  const structure = getJournalStructure(projectDir, epicId, taskId);
  if (!structure.task) return summary;

  // 1. Prune logs/ — keep last maxLogRuns
  const logsDir = join(structure.task, "logs");
  summary.logsDeleted = await pruneLogRuns(logsDir, policy.maxLogRuns);

  // 2. Prune corrections/ — compress old attempts into history-summary.md
  const correctionsDir = getTaskCorrectionsDir(projectDir, epicId, taskId);
  summary.correctionsCompressed = await compressOldCorrections(
    correctionsDir,
    policy.maxCorrectionHistory,
  );

  // 3. Write PRUNE_MARKER to events.jsonl so readers know where this run starts
  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "PRUNE_MARKER",
    `New execution started: ${executionId}`,
    {
      executionId,
      logsDeleted: summary.logsDeleted,
      correctionsCompressed: summary.correctionsCompressed,
    },
  );
  summary.pruneMarkerWritten = true;

  return summary;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function pruneLogRuns(logsDir: string, maxRuns: number): Promise<number> {
  if (!existsSync(logsDir)) return 0;

  let entries: string[] = [];
  try {
    entries = await readdir(logsDir);
  } catch {
    return 0;
  }

  // Sort by name (timestamp-based dirs sort chronologically)
  const sorted = entries.sort();
  const toDelete = sorted.slice(0, Math.max(0, sorted.length - maxRuns));

  let deleted = 0;
  for (const entry of toDelete) {
    try {
      await rm(join(logsDir, entry), { recursive: true, force: true });
      deleted++;
    } catch {
      // ignore individual deletion failures
    }
  }
  return deleted;
}

async function compressOldCorrections(
  correctionsDir: string,
  maxHistory: number,
): Promise<number> {
  if (!existsSync(correctionsDir)) return 0;

  let entries: string[] = [];
  try {
    entries = await readdir(correctionsDir);
  } catch {
    return 0;
  }

  // Find attempt-{N}.json files
  const attemptFiles = entries
    .filter((f) => /^attempt-\d+\.json$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
      return na - nb;
    });

  if (attemptFiles.length <= maxHistory) return 0;

  const toCompress = attemptFiles.slice(0, attemptFiles.length - maxHistory);
  const rows: string[] = [];

  for (const file of toCompress) {
    try {
      const raw = await readFile(join(correctionsDir, file), "utf8");
      const record = JSON.parse(raw) as Record<string, unknown>;
      const date =
        typeof record.timestamp === "string"
          ? record.timestamp.slice(0, 10)
          : "????-??-??";
      const fixDesc =
        typeof record.fixApplied === "string"
          ? record.fixApplied.slice(0, 80)
          : "(unknown fix)";
      const outcome = record.resolved === true ? "SUCCESS" : "FAILED";
      const cause =
        typeof (record.diagnosis as Record<string, unknown>)?.likelyCause ===
        "string"
          ? ` — ${((record.diagnosis as Record<string, unknown>).likelyCause as string).slice(0, 60)}`
          : "";
      rows.push(`| ${date} | ${fixDesc} | ${outcome}${cause} |`);
    } catch {
      rows.push(`| ? | ${file} | (unreadable) |`);
    }
  }

  if (rows.length > 0) {
    // Append to existing history-summary.md or create fresh
    const historyPath = join(correctionsDir, "history-summary.md");
    let existing = "";
    try {
      existing = await readFile(historyPath, "utf8");
    } catch {
      /* new file */
    }

    const header = existing.includes("| Date |")
      ? ""
      : "# Correction History (compressed)\n\n| Date | Fix Tried | Outcome |\n|------|-----------|--------|\n";

    await mkdir(correctionsDir, { recursive: true });
    await writeFile(
      historyPath,
      header +
        existing.replace(/^#.*\n\n\|.*\|.*\n\|.*\|\n/, "") +
        rows.join("\n") +
        "\n",
    );
  }

  // Delete the compressed files
  let compressed = 0;
  for (const file of toCompress) {
    try {
      await rm(join(correctionsDir, file), { force: true });
      compressed++;
    } catch {
      /* ignore */
    }
  }

  return compressed;
}
