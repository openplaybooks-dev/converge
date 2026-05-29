import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type HumanReviewDecision = "approve" | "revise" | "reject";

export interface HumanReviewEntry {
  ts: string;
  playbook: string;
  taskId: string;
  template?: string;
  reportTitle: string;
  summary: string;
  decision: HumanReviewDecision;
  feedback: string;
}

export function getHumanReviewArtifactPath(
  projectDir: string,
  playbook: string,
  taskId: string,
): string {
  return join(projectDir, ".converge", "inventory", playbook, "reports", `${taskId}.html`);
}

export function getHumanReviewReviewsPath(
  projectDir: string,
  playbook: string,
  taskId: string,
): string {
  return join(projectDir, ".converge", "inventory", playbook, "reports", `${taskId}.jsonl`);
}

/**
 * Read the most recent review verdict for a task. Used by the gates
 * (`run-gateway.ts`, `verify.ts`) to decide whether to pause or proceed.
 */
export async function loadLatestHumanReview(
  projectDir: string,
  playbook: string,
  taskId: string,
): Promise<HumanReviewEntry | null> {
  const path = getHumanReviewReviewsPath(projectDir, playbook, taskId);
  if (!existsSync(path)) return null;
  try {
    const content = await readFile(path, "utf8");
    const lines = content.split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const review = JSON.parse(lines[i]!) as HumanReviewEntry;
        if (review.playbook === playbook && review.taskId === taskId) {
          return review;
        }
      } catch {
        // Skip malformed rows and keep scanning backward.
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Append a human review verdict to the task's review JSONL. The single
 * write path shared by the CLI (`converge review`) and the Studio's
 * review endpoint. Inventory is the runtime source of truth per
 * CLAUDE.md §7.1 — verdicts live with the task they apply to.
 */
export async function appendHumanReview(
  projectDir: string,
  playbook: string,
  taskId: string,
  decision: HumanReviewDecision,
  opts?: {
    feedback?: string;
    reportTitle?: string;
    summary?: string;
    template?: string;
  },
): Promise<HumanReviewEntry> {
  const path = getHumanReviewReviewsPath(projectDir, playbook, taskId);
  await mkdir(dirname(path), { recursive: true });
  const entry: HumanReviewEntry = {
    ts: new Date().toISOString(),
    playbook,
    taskId,
    template: opts?.template,
    reportTitle: opts?.reportTitle ?? taskId,
    summary: opts?.summary ?? "",
    decision,
    feedback: opts?.feedback ?? "",
  };
  await appendFile(path, JSON.stringify(entry) + "\n", "utf8");
  return entry;
}
