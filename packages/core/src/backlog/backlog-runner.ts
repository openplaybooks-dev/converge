import { execSync } from "node:child_process";
import type { BacklogDef, BacklogItem } from "./types.ts";

/**
 * Run a single backlog definition and parse output into items.
 * Each non-empty line of stdout becomes one BacklogItem.
 */
export function runBacklog(def: BacklogDef, projectDir: string): BacklogItem[] {
  let stdout: string;
  try {
    stdout = execSync(def.cmd, {
      cwd: projectDir,
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err: any) {
    // grep returns exit 1 when no matches — that means 0 items, not an error
    stdout = (err.stdout ?? "").toString().trim();
  }

  if (!stdout) return [];

  const now = new Date().toISOString();
  return stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => parseLine(line, def, now));
}

/** Parse a line like "src/pages/Quiz.tsx:49:const QUESTIONS" into a BacklogItem */
function parseLine(
  line: string,
  def: BacklogDef,
  timestamp: string,
): BacklogItem {
  const match = line.match(/^([^:]+):(\d+):(.*)$/);

  return {
    backlogId: def.id,
    raw: line.trim(),
    file: match?.[1],
    line: match ? parseInt(match[2], 10) : undefined,
    description: def.description ?? def.id,
    severity: def.severity ?? "medium",
    collectedAt: timestamp,
  };
}

/**
 * Run all backlog definitions for a task.
 * Returns aggregated items.
 */
export function runBacklogs(
  defs: BacklogDef[],
  projectDir: string,
): BacklogItem[] {
  const items: BacklogItem[] = [];
  for (const def of defs) {
    items.push(...runBacklog(def, projectDir));
  }
  return items;
}
