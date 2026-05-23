import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DagNode } from "../dag/dag-node.js";
import { TaskDag } from "../dag/task-dag.js";
import type { RunStateManager } from "../manifest/run-state-manager.js";
import type { CheckResultItem } from "../manifest/types.js";
import type { Unit } from "../task/unit/index.ts";
type NodeState = { id: string; status: "completed" | "failed" | "skipped" | "blocked"; outputs: string[] };

export async function computeOutputHashes(
  projectDir: string,
  outputs: string[],
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const outputPath of outputs) {
    const absPath = join(projectDir, outputPath);
    if (!existsSync(absPath)) continue;
    try {
      const content = await readFile(absPath);
      hashes[outputPath] =
        `sha256:${createHash("sha256").update(content).digest("hex")}`;
    } catch {
      // skip unreadable files
    }
  }
  return hashes;
}

export function readCheckResults(wipDir: string): CheckResultItem[] | undefined {
  const checkResultsPath = join(wipDir, "data", "check-results.json");
  if (!existsSync(checkResultsPath)) return undefined;
  try {
    return JSON.parse(readFileSync(checkResultsPath, "utf-8"));
  } catch {
    return undefined;
  }
}

export async function gatherAttemptData(
  unit: Unit,
  projectDir: string,
  attemptNumber: number,
  outputs?: string[],
): Promise<{
  check_results?: CheckResultItem[];
  output_hashes?: Record<string, string>;
}> {
  const data: {
    check_results?: CheckResultItem[];
    output_hashes?: Record<string, string>;
  } = {};

  if (unit.context?.journalPath) {
    const attemptDirName = String(attemptNumber).padStart(2, "0");
    const attemptDir = join(
      unit.context.journalPath,
      "attempts",
      attemptDirName,
    );
    data.check_results = readCheckResults(attemptDir);
  }

  if (outputs && outputs.length > 0) {
    data.output_hashes = await computeOutputHashes(projectDir, outputs);
  }

  return data;
}

export function computeFingerprint(node: DagNode): string {
  const hash = createHash("sha256");

  const taskPath = node.path;
  if (taskPath && existsSync(taskPath)) {
    hash.update(readFileSync(taskPath, "utf-8"));
  } else {
    const prompt = node.taskDef.prompt;
    hash.update(typeof prompt === "string" ? prompt : "");
    hash.update(node.taskDef.description ?? "");
    hash.update(
      node.taskDef.skill
        ? Array.isArray(node.taskDef.skill)
          ? node.taskDef.skill.join(",")
          : node.taskDef.skill
        : "",
    );
  }

  hash.update(JSON.stringify(node.taskDef.checks ?? []));
  hash.update(JSON.stringify(node.taskDef.inputs ?? []));

  return `sha256:${hash.digest("hex")}`;
}

export function collectNodeStates(
  dag: TaskDag,
  _resultsMgr: RunStateManager,
): NodeState[] {
  const nodes: NodeState[] = [];
  for (const [, node] of dag.nodes) {
    let status: NodeState["status"];
    if (node.status === "complete") status = "completed";
    else if (node.status === "failed") status = "failed";
    else if (node.status === "blocked") status = "blocked";
    else status = "skipped";
    nodes.push({
      id: node.id,
      status,
      outputs: node.taskDef?.outputs ?? [],
    });
  }
  return nodes;
}
