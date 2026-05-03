/**
 * Journal Tree - Execution History Tree
 *
 * Loads execution tree from journal (logs), showing actual task execution history
 * with attempts, timestamps, and outcomes. Parallel to TaskTree which shows
 * the task definition tree.
 *
 * Structure:
 * - TaskTree = what to execute (from .converge/epics/)
 * - JournalTree = what was executed (from .converge/journal/)
 */

import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { UnitCheckpoint } from "../checkpoint/state.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * Journal node - represents one execution attempt
 *
 * Each retry is a separate node in the tree:
 * - Task nodes represent the task definition (aggregates all attempts)
 * - Attempt nodes represent individual execution attempts
 */
export interface JournalNode {
  /** Node type */
  type: "task" | "attempt";

  /** Task ID (e.g., "001-implement-design-system") */
  id: string;

  /** Epic ID this task belongs to */
  epicId: string;

  /** Parent task ID (for Seed subtasks) */
  parentId?: string;

  /** Execution status (for task nodes: aggregate, for attempts: specific) */
  status:
    | "pending"
    | "running"
    | "complete"
    | "failed"
    | "seeded"
    | "interrupted"
    | "partial";

  /** Child nodes (for task nodes: attempts + Seed children, for attempts: empty) */
  children: JournalNode[];

  /** Attempt-specific data (only for attempt nodes) */
  attempt?: {
    attemptNumber: number;
    startedAt: string;
    completedAt?: string;
    outcome?: "success" | "failed" | "interrupted";
    durationMs?: number;
    journalPath: string; // Path to attempt directory
  };

  /** Task-specific data (only for task nodes) */
  task?: {
    totalAttempts: number;
    currentAttempt?: number;
    createdAt: string;
    lastUpdated: string;
    journalPath: string; // Path to task directory
    progress?: {
      totalChildren: number;
      completedChildren: number;
      failedChildren: number;
    };
  };
}

/* ------------------------------------------------------------------ */
/*  Journal Tree Class                                                */
/* ------------------------------------------------------------------ */

/**
 * Loads execution tree from journal directory.
 * Shows actual task execution history with attempts.
 */
export class JournalTree {
  private root: JournalNode;
  private nodes: Map<string, JournalNode> = new Map();

  private constructor(root: JournalNode, nodes: Map<string, JournalNode>) {
    this.root = root;
    this.nodes = nodes;
  }

  /**
   * Recursively find all checkpoint.json files in a directory
   * Skips sessions, logs, and attempts directories to avoid scanning unnecessary files
   */
  private static async findCheckpoints(dir: string): Promise<string[]> {
    const results: string[] = [];

    if (!existsSync(dir)) return results;

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip directories we don't need to scan for checkpoints
        const skipDirs = ["sessions", "logs", "attempts", "project"];
        if (skipDirs.includes(entry.name)) {
          continue;
        }

        // Recursively search subdirectories
        const subCheckpoints = await this.findCheckpoints(fullPath);
        results.push(...subCheckpoints);
      } else if (entry.name === "checkpoint.json") {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Load journal tree from project directory
   */
  static async load(projectDir: string): Promise<JournalTree> {
    const journalRoot = path.join(projectDir, ".converge", "journal");

    if (!existsSync(journalRoot)) {
      // No journal yet - return empty tree
      const emptyRoot: JournalNode = {
        type: "task",
        id: "__root__",
        epicId: "__root__",
        status: "pending",
        children: [],
        task: {
          totalAttempts: 0,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          journalPath: journalRoot,
        },
      };
      return new JournalTree(emptyRoot, new Map());
    }

    const nodes = new Map<string, JournalNode>();
    const root: JournalNode = {
      type: "task",
      id: "__root__",
      epicId: "__root__",
      status: "pending",
      children: [],
      task: {
        totalAttempts: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        journalPath: journalRoot,
      },
    };

    // Load all epics (journal mirrors epics folder structure exactly)
    const epicsDir = path.join(journalRoot, "epics");
    if (existsSync(epicsDir)) {
      // Recursively find all checkpoint.json files in epics directory
      // This is more efficient than scanning each epic separately
      const checkpoints = await this.findCheckpoints(epicsDir);

      const epicIds = await readdir(epicsDir);

      for (const checkpointPath of checkpoints) {
        // Extract epic ID and task ID from checkpoint path
        const taskJournalPath = path.dirname(checkpointPath);
        const relPath = path.relative(epicsDir, taskJournalPath);
        const pathParts = relPath.split(path.sep);

        if (pathParts.length === 0) continue;

        const epicId = pathParts[0];

        // Remove epic ID and 'tasks' segments to get task ID
        let taskIdParts: string[] = [];
        for (let i = 1; i < pathParts.length; i++) {
          if (pathParts[i] !== "tasks") {
            taskIdParts.push(pathParts[i]);
          }
        }
        const taskId = taskIdParts.join("/") || epicId;

        if (!existsSync(checkpointPath)) continue;

        try {
          const checkpoint = JSON.parse(
            await readFile(checkpointPath, "utf-8"),
          ) as UnitCheckpoint;

          // Parse journalTaskId to detect parent-child relationship
          // Format: "parentId/childId" for subtasks, "taskId" for top-level
          const parts = taskId.split("/");
          const parentId = parts.length > 1 ? parts[0] : undefined;

          // Create task node (aggregates all attempts)
          const taskNode: JournalNode = {
            type: "task",
            id: taskId,
            epicId,
            parentId,
            status: checkpoint.status,
            children: [],
            task: {
              totalAttempts: checkpoint.attempts?.length || 0,
              currentAttempt: checkpoint.currentAttempt,
              createdAt: checkpoint.createdAt ?? "",
              lastUpdated: checkpoint.lastUpdated ?? "",
              journalPath: taskJournalPath,
              progress: checkpoint.progress
                ? {
                    totalChildren: checkpoint.progress.totalChildren,
                    completedChildren: checkpoint.progress.completedChildren,
                    failedChildren: checkpoint.progress.failedChildren,
                  }
                : undefined,
            },
          };

          nodes.set(taskId, taskNode);

          // Create attempt nodes (each retry is a separate node)
          if (checkpoint.attempts && checkpoint.attempts.length > 0) {
            for (const attemptRecord of checkpoint.attempts) {
              const attemptId = `${taskId}#attempt-${attemptRecord.attempt}`;
              const attemptNode: JournalNode = {
                type: "attempt",
                id: attemptId,
                epicId,
                parentId: taskId, // Parent is the task node
                status:
                  attemptRecord.outcome === "success" ? "complete" : "failed",
                children: [],
                attempt: {
                  attemptNumber: attemptRecord.attempt,
                  startedAt: attemptRecord.startedAt,
                  completedAt: attemptRecord.completedAt,
                  outcome: attemptRecord.outcome,
                  durationMs: attemptRecord.durationMs,
                  journalPath: path.join(
                    taskJournalPath,
                    "attempts",
                    String(attemptRecord.attempt).padStart(2, "0"),
                  ),
                },
              };

              nodes.set(attemptId, attemptNode);
              taskNode.children.push(attemptNode);
            }
          }
        } catch (err) {
          console.warn(`Failed to load checkpoint for ${taskId}:`, err);
        }
      }
    }

    // Build parent-child relationships for Seed tasks (not attempts)
    // Attempts are already added to their task nodes above
    for (const node of nodes.values()) {
      // Skip attempt nodes - they're already attached to task nodes
      if (node.type === "attempt") continue;

      if (node.parentId) {
        const parent = nodes.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // Parent not found - add to root
          root.children.push(node);
        }
      } else {
        // Top-level task - add to root
        root.children.push(node);
      }
    }

    // Sort task children by numeric prefix, but keep attempts in chronological order
    const sortChildren = (node: JournalNode) => {
      // Separate task children from attempt children
      const taskChildren = node.children.filter((c) => c.type === "task");
      const attemptChildren = node.children.filter((c) => c.type === "attempt");

      // Sort task children by numeric prefix
      const sortByNumericPrefix = (a: JournalNode, b: JournalNode): number => {
        const extractNum = (id: string): number[] => {
          const matches = id.match(/^(\d+)-(\d+)/);
          if (matches) {
            return [parseInt(matches[1], 10), parseInt(matches[2], 10)];
          }
          const singleMatch = id.match(/^(\d+)-/);
          if (singleMatch) {
            return [parseInt(singleMatch[1], 10)];
          }
          return [999];
        };

        const aNums = extractNum(a.id);
        const bNums = extractNum(b.id);

        for (let i = 0; i < Math.max(aNums.length, bNums.length); i++) {
          const aVal = aNums[i] || 0;
          const bVal = bNums[i] || 0;
          if (aVal !== bVal) return aVal - bVal;
        }
        return 0;
      };

      taskChildren.sort(sortByNumericPrefix);

      // Sort attempt children by attempt number (chronological)
      attemptChildren.sort((a, b) => {
        const aNum = a.attempt?.attemptNumber || 0;
        const bNum = b.attempt?.attemptNumber || 0;
        return aNum - bNum;
      });

      // Combine: attempts first (chronological), then task children (sorted)
      node.children = [...attemptChildren, ...taskChildren];
    };

    sortChildren(root);
    for (const node of nodes.values()) {
      sortChildren(node);
    }

    return new JournalTree(root, nodes);
  }

  /**
   * Get node by ID
   */
  getNode(id: string): JournalNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get node by journal path (for wiring with TaskTree)
   * Handles both old structure (with /tasks/) and new mirrored structure
   */
  getNodeByPath(journalPath: string): JournalNode | undefined {
    // Try exact match first
    for (const node of this.nodes.values()) {
      if (node.type === "task" && node.task?.journalPath === journalPath) {
        return node;
      }
    }

    // Try matching by task ID (backward compat - old structure has /tasks/ subdirectory)
    // Extract task ID from journal path and match by ID instead
    const pathParts = journalPath.split("/");
    const taskId = pathParts[pathParts.length - 1];

    for (const node of this.nodes.values()) {
      if (node.type === "task" && node.id === taskId) {
        return node;
      }
    }

    return undefined;
  }

  /**
   * Get all nodes (pre-order traversal)
   */
  getAllNodes(): JournalNode[] {
    const result: JournalNode[] = [];
    const visit = (node: JournalNode) => {
      result.push(node);
      for (const child of node.children) {
        visit(child);
      }
    };
    for (const child of this.root.children) {
      visit(child);
    }
    return result;
  }

  /**
   * Get nodes by epic ID
   */
  getEpicNodes(epicId: string): JournalNode[] {
    return this.getAllNodes().filter((n) => n.epicId === epicId);
  }

  /**
   * Get execution statistics (task nodes only)
   */
  getStats(): {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
    totalAttempts: number;
  } {
    const taskNodes = this.getAllNodes().filter((n) => n.type === "task");
    const attemptNodes = this.getAllNodes().filter((n) => n.type === "attempt");
    return {
      total: taskNodes.length,
      completed: taskNodes.filter((n) => n.status === "complete").length,
      failed: taskNodes.filter((n) => n.status === "failed").length,
      running: taskNodes.filter((n) => n.status === "running").length,
      pending: taskNodes.filter((n) => n.status === "pending").length,
      totalAttempts: attemptNodes.length,
    };
  }

  /**
   * Get tasks with multiple attempts (had failures/retries)
   */
  getTasksWithRetries(): JournalNode[] {
    return this.getAllNodes().filter(
      (n) => n.type === "task" && (n.task?.totalAttempts || 0) > 1,
    );
  }

  /**
   * Get total execution time across all attempts
   */
  getTotalExecutionTime(): number {
    let totalMs = 0;
    for (const node of this.getAllNodes()) {
      if (node.type === "attempt" && node.attempt?.durationMs) {
        totalMs += node.attempt.durationMs;
      }
    }
    return totalMs;
  }
}
