import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

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

export interface HumanReviewHandoff {
  id: string;
  playbook: string;
  taskId: string;
  createdAt: string;
  updatedAt: string;
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

export function getHumanReviewHandoffPath(
  projectDir: string,
  handoffId: string,
): string {
  return join(projectDir, ".converge", "ui", "handoffs", `${handoffId}.json`);
}

export function getHumanReviewHandoffRoute(handoffId: string): string {
  return `/studio/handoff/${encodeURIComponent(handoffId)}`;
}

export async function ensureHumanReviewHandoff(
  projectDir: string,
  playbook: string,
  taskId: string,
): Promise<HumanReviewHandoff> {
  const dir = join(projectDir, ".converge", "ui", "handoffs");
  await mkdir(dir, { recursive: true });

  const existing = await findHumanReviewHandoff(projectDir, playbook, taskId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const handoff: HumanReviewHandoff = {
    id: randomUUID().replace(/-/g, ""),
    playbook,
    taskId,
    createdAt: now,
    updatedAt: now,
  };
  await writeFile(getHumanReviewHandoffPath(projectDir, handoff.id), JSON.stringify(handoff, null, 2), "utf8");
  return handoff;
}

export async function loadHumanReviewHandoffById(
  projectDir: string,
  handoffId: string,
): Promise<HumanReviewHandoff | null> {
  const path = getHumanReviewHandoffPath(projectDir, handoffId);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as Partial<HumanReviewHandoff>;
    if (
      typeof raw.id !== "string" ||
      typeof raw.playbook !== "string" ||
      typeof raw.taskId !== "string" ||
      typeof raw.createdAt !== "string" ||
      typeof raw.updatedAt !== "string"
    ) {
      return null;
    }
    return raw as HumanReviewHandoff;
  } catch {
    return null;
  }
}

async function findHumanReviewHandoff(
  projectDir: string,
  playbook: string,
  taskId: string,
): Promise<HumanReviewHandoff | null> {
  const dir = join(projectDir, ".converge", "ui", "handoffs");
  if (!existsSync(dir)) return null;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const handoff = await loadHumanReviewHandoffById(
      projectDir,
      entry.name.slice(0, -".json".length),
    );
    if (handoff && handoff.playbook === playbook && handoff.taskId === taskId) {
      return handoff;
    }
  }
  return null;
}

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
        const review = JSON.parse(lines[i]) as HumanReviewEntry;
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
