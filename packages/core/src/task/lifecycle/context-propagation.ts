/**
 * Context Propagation
 *
 * Loads ancestor and sibling task summaries so that the before phase can
 * build a context.md that gives the agent awareness of what has already
 * been done (and tried) across the task hierarchy.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import {
  getJournalStructure,
  getTaskAfterDir,
  getTaskCorrectionsDir,
} from "../../journal/structure.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AncestorSummary {
  taskId: string;
  depth: number; // 1 = parent, 2 = grandparent
  summaryExcerpt: string; // first 800 chars of summary.md
  status: "complete" | "failed" | "running" | "unknown";
  keyOutputs: string[]; // files listed in after/outcome.json
}

export interface SiblingOutcome {
  taskId: string;
  status: "complete" | "failed" | "skipped";
  filesCreated: string[];
  summarySnippet: string; // outcome.summaryForDownstream
}

export interface AncestorContext {
  ancestorSummaries: AncestorSummary[];
  siblingOutcomes: SiblingOutcome[];
  correctionHistory?: string; // content of corrections/history-summary.md if present
}

interface TaskOutcomeJson {
  success?: boolean;
  filesCreated?: string[];
  summaryForDownstream?: string;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                    */
/* ------------------------------------------------------------------ */

export async function loadAncestorContext(
  projectDir: string,
  epicId: string,
  taskId: string,
  depth: number = 2,
): Promise<AncestorContext> {
  const segments = taskId.split("/").filter(Boolean);

  // Collect ancestor summaries
  const ancestorSummaries: AncestorSummary[] = [];
  for (let d = 1; d <= Math.min(depth, segments.length - 1); d++) {
    const ancestorId = segments.slice(0, segments.length - d).join("/");
    const summary = await loadAncestorSummary(
      projectDir,
      epicId,
      ancestorId,
      d,
    );
    if (summary) ancestorSummaries.push(summary);
  }

  // Collect sibling outcomes (same parent, lower numeric prefix, completed)
  const siblingOutcomes: SiblingOutcome[] = [];
  if (segments.length > 1) {
    const parentId = segments.slice(0, -1).join("/");
    const siblings = await findCompletedSiblings(
      projectDir,
      epicId,
      parentId,
      segments[segments.length - 1],
    );
    siblingOutcomes.push(...siblings.slice(0, 10));
  }

  // Load correction history from current task (prior compressed attempts)
  const correctionHistory = await loadCorrectionHistory(
    projectDir,
    epicId,
    taskId,
  );

  return { ancestorSummaries, siblingOutcomes, correctionHistory };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function loadAncestorSummary(
  projectDir: string,
  epicId: string,
  ancestorId: string,
  depth: number,
): Promise<AncestorSummary | null> {
  const s = getJournalStructure(projectDir, epicId, ancestorId);
  if (!s.task) return null;

  // Read summary.md (first 800 chars)
  const summaryPath = join(s.task, "summary.md");
  const summaryExcerpt = await safeRead(summaryPath, 800);

  // Read status from after/outcome.json
  const afterDir = getTaskAfterDir(projectDir, epicId, ancestorId);
  const outcomePath = join(afterDir, "outcome.json");
  let status: AncestorSummary["status"] = "unknown";
  let keyOutputs: string[] = [];
  try {
    const outcome = JSON.parse(
      await readFile(outcomePath, "utf8"),
    ) as TaskOutcomeJson;
    status = outcome.success ? "complete" : "failed";
    keyOutputs = outcome.filesCreated ?? [];
  } catch {
    // Fall back to status.json
    const statusPath = join(s.task, "status.json");
    try {
      const st = JSON.parse(await readFile(statusPath, "utf8")) as {
        status?: string;
      };
      if (st.status === "complete") status = "complete";
      else if (st.status === "failed") status = "failed";
      else if (st.status === "running") status = "running";
    } catch {
      /* unknown */
    }
  }

  if (!summaryExcerpt && status === "unknown") return null;

  return { taskId: ancestorId, depth, summaryExcerpt, status, keyOutputs };
}

async function findCompletedSiblings(
  projectDir: string,
  epicId: string,
  parentId: string,
  currentLeaf: string,
): Promise<SiblingOutcome[]> {
  const s = getJournalStructure(projectDir, epicId, parentId);
  const tasksDir = s.task ? join(s.task, "tasks") : undefined;
  if (!tasksDir || !existsSync(tasksDir)) return [];

  let entries: string[] = [];
  try {
    entries = await readdir(tasksDir);
  } catch {
    return [];
  }

  // Only take siblings with a lower numeric prefix than current task
  const currentNum = extractNumericPrefix(currentLeaf);
  const candidates = entries
    .filter((e) => {
      const n = extractNumericPrefix(e);
      return n !== null && currentNum !== null && n < currentNum;
    })
    .sort();

  const outcomes: SiblingOutcome[] = [];
  for (const sibling of candidates) {
    const siblingId = parentId ? `${parentId}/${sibling}` : sibling;
    const afterDir = getTaskAfterDir(projectDir, epicId, siblingId);
    const outcomePath = join(afterDir, "outcome.json");
    try {
      const outcome = JSON.parse(
        await readFile(outcomePath, "utf8"),
      ) as TaskOutcomeJson;
      outcomes.push({
        taskId: sibling,
        status: outcome.success ? "complete" : "failed",
        filesCreated: outcome.filesCreated ?? [],
        summarySnippet: (outcome.summaryForDownstream ?? "").slice(0, 200),
      });
    } catch {
      /* sibling hasn't completed yet */
    }
  }

  return outcomes;
}

async function loadCorrectionHistory(
  projectDir: string,
  epicId: string,
  taskId: string,
): Promise<string | undefined> {
  const correctionsDir = getTaskCorrectionsDir(projectDir, epicId, taskId);
  const historyPath = join(correctionsDir, "history-summary.md");
  return await safeRead(historyPath);
}

async function safeRead(path: string, maxChars?: number): Promise<string> {
  if (!existsSync(path)) return "";
  try {
    const content = await readFile(path, "utf8");
    return maxChars ? content.slice(0, maxChars) : content;
  } catch {
    return "";
  }
}

function extractNumericPrefix(name: string): number | null {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1]) : null;
}
