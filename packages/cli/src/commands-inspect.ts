/**
 * Inspect Command
 *
 * Project timeline view showing sessions, tasks, and nested subtasks.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { CommonOptions } from "./commands.ts";
import type { ExecutionMetadata } from "@converge/core/journal";
import {
  getExecutionsDir,
  getEpicsDir,
  getJournalStructure,
} from "@converge/core/journal";
import {
  renderProjectOverview,
  renderSessionsSummary,
  renderTaskTree,
  renderTaskDetail,
  renderConvergenceView,
  type SessionInfo,
  type TaskNode,
} from "./inspect-display.ts";

/* ------------------------------------------------------------------ */
/*  Inspect Options                                                   */
/* ------------------------------------------------------------------ */

export interface InspectOptions extends CommonOptions {
  /** Drill into a specific task path (e.g., "03-build-screens/001-home") */
  task?: string;

  /** Show convergence graph (requires --task) */
  converge?: boolean;

  /** Export to JSON format */
  json?: boolean;

  /** Tree depth (default 2, 0 = full) */
  depth?: number;

  /** Show only sessions summary */
  sessions?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Session Discovery                                                 */
/* ------------------------------------------------------------------ */

async function findProjectRoot(startDir?: string): Promise<string> {
  let dir = startDir || process.cwd();
  const resolved = join(dir); // Resolve to absolute path

  // If startDir is provided and contains .converge, use it directly
  if (startDir && existsSync(join(resolved, ".converge"))) {
    return resolved;
  }

  // Otherwise search upwards
  dir = resolved;
  while (dir !== "/") {
    if (existsSync(join(dir, ".converge"))) {
      return dir;
    }
    dir = join(dir, "..");
  }
  throw new Error(
    "Not inside a converge project (no .converge directory found)",
  );
}

async function findSessions(projectDir: string): Promise<SessionInfo[]> {
  const executionsDir = getExecutionsDir(projectDir);

  if (!existsSync(executionsDir)) {
    return [];
  }

  const entries = await readdir(executionsDir, { withFileTypes: true });
  const sessions: SessionInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "latest") {
      continue;
    }

    const sessionId = entry.name;
    const sessionDir = join(executionsDir, sessionId);
    const metadataPath = join(sessionDir, "metadata.json");

    if (!existsSync(metadataPath)) {
      continue;
    }

    try {
      const metadataRaw = await readFile(metadataPath, "utf-8");
      if (!metadataRaw.trim()) {
        continue;
      }

      const metadata: ExecutionMetadata = JSON.parse(metadataRaw);

      sessions.push({
        sessionId,
        sessionDir,
        metadata,
      });
    } catch {
      continue;
    }
  }

  sessions.sort((a, b) => b.sessionId.localeCompare(a.sessionId));
  return sessions;
}

/* ------------------------------------------------------------------ */
/*  Task Tree Walking                                                 */
/* ------------------------------------------------------------------ */

interface CheckpointData {
  type?: string;
  id?: string;
  status?: string;
  lastUpdated?: string;
  createdAt?: string;
  currentAttempt?: number;
  attempts?: Array<{
    attempt: number;
    startedAt?: string;
    completedAt?: string;
    outcome?: string;
    durationMs?: number;
  }>;
  progress?: {
    totalChildren?: number;
    completedChildren?: number;
    failedChildren?: number;
    childTaskIds?: string[];
  };
}

/**
 * Recursively walk the task tree under a tasks directory,
 * reading checkpoint.json at each level.
 */
function walkTaskTree(tasksDir: string, parentPath = ""): TaskNode[] {
  if (!existsSync(tasksDir)) {
    return [];
  }

  let entries: string[];
  try {
    entries = readdirSync(tasksDir)
      .filter((name) => {
        const fullPath = join(tasksDir, name);
        try {
          return (
            readdirSync(fullPath, { withFileTypes: true }) !== undefined &&
            existsSync(join(fullPath, "checkpoint.json"))
          );
        } catch {
          return false;
        }
      })
      .sort();
  } catch {
    return [];
  }

  const nodes: TaskNode[] = [];

  for (const name of entries) {
    const taskDir = join(tasksDir, name);
    const cpPath = join(taskDir, "checkpoint.json");

    let cp: CheckpointData = {};
    try {
      cp = JSON.parse(readFileSync(cpPath, "utf-8"));
    } catch {
      continue;
    }

    const path = parentPath ? `${parentPath}/${name}` : name;

    const children = walkTaskTree(join(taskDir, "tasks"), path);

    const node: TaskNode = {
      id: name,
      path,
      status: cp.status || "pending",
      totalChildren: cp.progress?.totalChildren ?? children.length,
      completedChildren: cp.progress?.completedChildren ?? 0,
      failedChildren: cp.progress?.failedChildren ?? 0,
      currentAttempt: cp.currentAttempt,
      attempts: cp.attempts?.map((a) => ({
        attempt: a.attempt,
        outcome: a.outcome,
        durationMs: a.durationMs,
      })),
      children,
      lastUpdated: cp.lastUpdated,
      createdAt: cp.createdAt,
    };

    nodes.push(node);
  }

  return nodes;
}

/**
 * Find a specific node in the task tree by path.
 */
function findTaskNode(nodes: TaskNode[], taskPath: string): TaskNode | null {
  const segments = taskPath.split("/");

  let current = nodes;
  let node: TaskNode | null = null;

  for (const segment of segments) {
    node = current.find((n) => n.id === segment) || null;
    if (!node) return null;
    current = node.children;
  }

  return node;
}

/* ------------------------------------------------------------------ */
/*  Main Command Handler                                              */
/* ------------------------------------------------------------------ */

export async function inspectCommand(
  options: InspectOptions = {},
): Promise<void> {
  try {
    const projectDir = await findProjectRoot(options.dir);
    const tasksDir = getEpicsDir(projectDir);

    // --converge --task: convergence graph view
    if (options.converge) {
      if (!options.task) {
        console.error("");
        console.error("--converge requires --task=<taskPath>");
        console.error("");
        console.error(
          "Usage: converge inspect --converge --task=<taskPath>",
        );
        console.error("");
        process.exit(1);
      }

      const playbookName = process.env.CONVERGE_PLAYBOOK;
      const epicId = playbookName ?? "default";
      const structure = getJournalStructure(projectDir, epicId, options.task);
      const taskDir =
        structure.task ??
        join(getEpicsDir(projectDir), ...options.task.split("/"));
      const convergencePath = join(taskDir, "logs", "convergence.json");

      if (!existsSync(convergencePath)) {
        console.error("");
        console.error(`No convergence.json found for task: ${options.task}`);
        console.error(`   Expected: ${convergencePath}`);
        console.error("");
        process.exit(1);
      }

      try {
        const raw = await readFile(convergencePath, "utf-8");
        const walkerState = JSON.parse(raw);

        if (options.json) {
          console.log(JSON.stringify(walkerState, null, 2));
          return;
        }

        renderConvergenceView(options.task, walkerState, {});
      } catch (err: any) {
        console.error(`Failed to parse convergence.json: ${err.message}`);
        process.exit(1);
      }
      return;
    }

    // Build full task tree (needed for most views)
    const taskTree = walkTaskTree(tasksDir);

    // --task (no --converge): task detail view
    if (options.task) {
      const node = findTaskNode(taskTree, options.task);
      if (!node) {
        console.error(`Task not found: ${options.task}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(node, null, 2));
        return;
      }

      console.log("");
      renderTaskDetail(node, projectDir, options.task, options);
      return;
    }

    // --sessions: sessions-only view
    const allSessions = await findSessions(projectDir);

    if (options.sessions) {
      if (options.json) {
        const data = allSessions.map((s) => ({
          ...s.metadata,
          sessionId: s.sessionId,
        }));
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      console.log("");
      renderSessionsSummary(allSessions, options);
      return;
    }

    // --json: full project export
    if (options.json) {
      const data = {
        sessions: allSessions.map((s) => ({
          ...s.metadata,
          sessionId: s.sessionId,
        })),
        tasks: taskTree,
      };
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // Default: project overview + sessions + task tree
    console.log("");
    renderProjectOverview(projectDir);
    renderSessionsSummary(allSessions, options);
    renderTaskTree(taskTree, options);
  } catch (error: any) {
    console.error(`\nInspect error: ${error.message}`);
    if (options.verbose) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}
