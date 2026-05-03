/**
 * Task Tree
 *
 * Unified tree data structure for task traversal.
 * ALL tree operations (finding, querying, mutating) go through this class.
 *
 * Design:
 * - Tree is built from filesystem scan
 * - Checkpoint is shadow tree (1:1 mapping with nodes)
 * - All state queries use tree traversal, not file scanning
 * - Tree is reloaded (shaken) after each task execution
 */

import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import type { ConvergeConfig } from "../config/types.ts";
import { TaskStateManager } from "../checkpoint/state.ts";
import { createDiscoveryScanner } from "../task/discovery/scanner.ts";
import { Unit } from "../task/unit/unit.ts";
import { TreeNode } from "./dag-node-wrapper.ts";
import type {
  TreeNodeData,
  TaskStates,
  NextTaskResult,
  WbsProgress,
} from "./dag-types.ts";
import { parseTaskMd } from "../config/task-md-definition.ts";
import { getJournalStructure, getEpicsDir } from "../journal/structure.ts";
import { extractJournalTaskId } from "../task/unit/path-utils.ts";
import { expandTestRefs } from "../config/test-expander.ts";
import type { ParsedTask, InlineCheck, TestRefCheck } from "../config/test-expander.ts";
import type { TestDef } from "../config/test-md-definition.ts";
import type { Check } from "../config/task-definition.ts";

/**
 * TaskTree - unified tree data structure.
 *
 * This is the single source of truth for task state and relationships.
 * All operations use tree traversal instead of file scanning.
 */
export class TaskTree {
  /** Project directory */
  private projectDir: string;

  /** Root node (virtual - contains epics as children) */
  private root: TreeNode;

  /** Fast O(1) lookup by journalTaskId */
  private nodes: Map<string, TreeNode>;

  /** Checkpoint manager (shadow tree - 1:1 with nodes) */
  private checkpoint: TaskStateManager;

  /** Converge config (for discovery) */
  private convergeConfig: ConvergeConfig;

  private constructor(
    projectDir: string,
    root: TreeNode,
    nodes: Map<string, TreeNode>,
    checkpoint: TaskStateManager,
    convergeConfig: ConvergeConfig,
  ) {
    this.projectDir = projectDir;
    this.root = root;
    this.nodes = nodes;
    this.checkpoint = checkpoint;
    this.convergeConfig = convergeConfig;
  }

  /* ── Construction ─────────────────────────────────────────────── */

  /**
   * Load task tree from filesystem.
   * Scans for tasks, builds tree structure with edges, resolves dependencies.
   * Optionally accepts a pre-scanned discovery result to avoid duplicate scanning.
   */
  static async load(
    projectDir: string,
    convergeConfig: ConvergeConfig,
    preScannedDiscovery?: import("../task/discovery/types.ts").DiscoveryResult,
  ): Promise<TaskTree> {
    const checkpoint = new TaskStateManager(projectDir);

    // 1. Scan filesystem for all tasks (or use pre-scanned result)
    let discovery: import("../task/discovery/types.ts").DiscoveryResult;
    if (preScannedDiscovery) {
      discovery = preScannedDiscovery;
    } else {
      const scanner = createDiscoveryScanner(
        convergeConfig.discovery || { epics: [], tasks: [] },
        projectDir,
      );
      discovery = await scanner.scan();
    }

    // Fail fast on discovery errors
    if (discovery.errors.length > 0) {
      const errorMessages = discovery.errors
        .map(({ file, error }) => `  - ${file}: ${error}`)
        .join("\n");
      throw new Error(
        `Discovery errors found:\n${errorMessages}\n\nFix these errors and try again.`,
      );
    }

    const epics = discovery.files.filter((f) => f.type === "epic");
    const epicPaths = new Set(epics.map((e) => e.filePath));
    const tasks = discovery.files.filter(
      (f) => f.type === "task" && !epicPaths.has(f.filePath),
    );

    // Sort epics by sort index (will be set when Unit is created)
    // Note: This sorts by file path for discovery, actual Unit sorting happens after loading

    // 2. Create TreeNode for each task (load Unit)
    const nodes = new Map<string, TreeNode>();

    // Create virtual root node (wraps a virtual Unit)
    const rootUnit = Unit.fromDefinition(
      {
        id: "__root__",
        title: "Root",
      },
      null as any, // Root has no parent
    );
    const root = new TreeNode(rootUnit, checkpoint, projectDir);

    // Load all tasks and create nodes (parallel)
    const allEpicTasks: Array<{ task: (typeof tasks)[0]; epicDir: string }> =
      [];
    for (const epic of epics) {
      const epicDir = path.dirname(epic.filePath);
      const epicTasks = tasks.filter((t) => t.filePath.startsWith(epicDir));
      for (const task of epicTasks) {
        allEpicTasks.push({ task, epicDir });
      }
    }

    const epicResults = await Promise.all(
      allEpicTasks.map(async ({ task }) => {
        const taskDir = path.dirname(task.filePath);
        const taskId = path.basename(taskDir);
        const journalTaskId = extractJournalTaskId(task.filePath);
        try {
          const unit = await Unit.fromPath(task.filePath);
          return { journalTaskId, unit, taskId };
        } catch (err) {
          console.warn(
            `⚠️  Failed to load ${taskId}: ${(err as Error).message}`,
          );
          return null;
        }
      }),
    );

    for (const result of epicResults) {
      if (!result) continue;
      result.unit.id = result.journalTaskId;
      const node = new TreeNode(result.unit, checkpoint, projectDir);
      nodes.set(result.journalTaskId, node);
    }

    // Handle orphaned tasks (not under any epic)
    const epicDirs = new Set(epics.map((e) => path.dirname(e.filePath)));
    const orphans = tasks
      .filter((t) => ![...epicDirs].some((d) => t.filePath.startsWith(d)))
      .sort((a, b) => a.filePath.localeCompare(b.filePath));

    const orphanResults = await Promise.all(
      orphans.map(async (task) => {
        const taskDir = path.dirname(task.filePath);
        const taskId = path.basename(taskDir);

        let journalTaskId: string;
        try {
          journalTaskId = extractJournalTaskId(task.filePath);
        } catch {
          journalTaskId = taskId;
        }

        try {
          const unit = await Unit.fromPath(task.filePath);
          return { journalTaskId, unit };
        } catch {
          return null;
        }
      }),
    );

    for (const result of orphanResults) {
      if (!result) continue;
      result.unit.id = result.journalTaskId;
      const node = new TreeNode(result.unit, checkpoint, projectDir);
      nodes.set(result.journalTaskId, node);
    }

    // 2b. Expand test refs in all units using the test registry
    if (discovery.testRegistry && discovery.testRegistry.size > 0) {
      for (const node of nodes.values()) {
        expandUnitTestRefs(node.unit, discovery.testRegistry);
      }
    }

    // 3. Build parent-child edges from children: declarations (DAG data model).
    //    This is the primary source of truth — folder structure is fallback only.
    //    dbt-style: the DAG is constructed from explicit declarations, not filesystem walking.
    const childrenMap = new Map<string, TreeNode[]>();
    const childIdsFromDeclarations = new Set<string>(); // track nodes already claimed

    // 3a. Primary: edges from children: and from_seed: declarations in TASK.md frontmatter
    for (const node of nodes.values()) {
      const declaredChildren = (node.unit as any).__declaredChildren;
      if (declaredChildren && declaredChildren.length > 0) {
        for (const child of declaredChildren) {
          // Find child by ID — the id in children: is relative to the parent playbook
          const childNode = nodes.get(child.id) || nodes.get(`${node.id}/${child.id}`);
          if (childNode && childNode !== node) {
            if (!childrenMap.has(node.id)) {
              childrenMap.set(node.id, []);
            }
            childrenMap.get(node.id)!.push(childNode);
            childIdsFromDeclarations.add(childNode.id);
          }
        }
      }
      // from_seed: declares dynamic children spawned at runtime — these are virtual
      // until the seed runs, so we don't add edges now. The WBS will add them later.
    }

    // 3b. Fallback: folder-structure edges for nodes not claimed by declarations.
    //    These are tasks whose parent wasn't migrated to children: yet.
    for (const node of nodes.values()) {
      if (childIdsFromDeclarations.has(node.id)) continue; // already claimed
      const parts = node.id.split("/");
      if (parts.length >= 2) {
        const parentId = parts.slice(0, -1).join("/");
        // Only use folder fallback if parent doesn't have children: declarations
        const parentNode = nodes.get(parentId);
        if (parentNode && !(parentNode.unit as any).__declaredChildren?.length) {
          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
          }
          childrenMap.get(parentId)!.push(node);
        } else if (!parentNode) {
          root.children.push(node);
        }
      } else {
        root.children.push(node);
      }
    }

    // Assign children arrays to parent nodes and sort by Unit.sortIndex
    for (const [parentId, children] of childrenMap.entries()) {
      const parentNode = nodes.get(parentId);
      children.sort((a: any, b: any) => Unit.compareBySortIndex(a.unit, b.unit));

      if (parentNode) {
        parentNode.children.push(...children);
      } else {
        root.children.push(...children);
      }
    }

    // Sort root.children by Unit.sortIndex
    root.children.sort((a: any, b: any) => Unit.compareBySortIndex(a.unit, b.unit));

    // 4. Build dependency edges (resolve unit.dependencies to TreeNodes)
    for (const node of nodes.values()) {
      const deps = node.unit.dependencies || [];
      for (const depId of deps) {
        if (depId.startsWith("tag:")) {
          // Tag dependency - find all nodes with this tag
          const tag = depId.substring(4);
          const taggedNodes = Array.from(nodes.values()).filter((n) =>
            n.unit.tags?.includes(tag),
          );
          node.dependencies.push(...taggedNodes);
          taggedNodes.forEach((t) => t.dependents.push(node));
        } else {
          // Direct dependency - resolve by unit.id
          const dep = nodes.get(depId);
          if (dep) {
            node.dependencies.push(dep);
            dep.dependents.push(node);
          } else {
            // Try finding by matching unit.id patterns
            const byTaskId = Array.from(nodes.values()).find(
              (n) => n.unit.id === depId || n.unit.id.endsWith(`/${depId}`),
            );
            if (byTaskId) {
              node.dependencies.push(byTaskId);
              byTaskId.dependents.push(node);
            }
          }
        }
      }
    }

    return new TaskTree(projectDir, root, nodes, checkpoint, convergeConfig);
  }

  /**
   * Reload tree from filesystem (tree shake).
   * Called after each task execution to pick up new WBS-spawned tasks.
   */
  async reload(): Promise<void> {
    const newTree = await TaskTree.load(this.projectDir, this.convergeConfig);
    this.root = newTree.root;
    this.nodes = newTree.nodes;
    // Checkpoint is NOT reloaded - it's the shadow tree that persists across reloads
  }

  /* ── Status Cache Helpers ────────────────────────────────────── */

  /**
   * Inject a pre-computed status map into all tree nodes for O(1) lookups.
   */
  private populateStatusCache(): void {
    const statusMap = this.checkpoint.getStatusMap();
    for (const node of this.nodes.values()) {
      node.setStatusCache(statusMap);
    }
    // Also set on root's children (virtual root children)
    for (const child of this.root.children) {
      child.setStatusCache(statusMap);
    }
  }

  /**
   * Clear status cache from all tree nodes.
   */
  private clearStatusCache(): void {
    for (const node of this.nodes.values()) {
      node.clearStatusCache();
    }
    for (const child of this.root.children) {
      child.clearStatusCache();
    }
  }

  /* ── Hierarchical Tree Traversal ─────────────────────────────── */

  /**
   * Find next runnable task via hierarchical traversal.
   *
   * HIERARCHICAL: Only searches immediate children (depth 1 from root).
   * Returns first epic that has work to do.
   * Consumer then calls epic.findNextTask() to get task within that epic.
   */
  async findNextTask(
    filter?: string,
    force?: boolean,
  ): Promise<NextTaskResult | null> {
    this.populateStatusCache();
    try {
      return await this._findNextTaskInner(filter, force);
    } finally {
      this.clearStatusCache();
    }
  }

  private async _findNextTaskInner(
    filter?: string,
    force?: boolean,
  ): Promise<NextTaskResult | null> {
    let nextNode: TreeNode | null;

    if (filter) {
      nextNode = await this.findFirstRunnableMatch(filter, force);
    } else {
      nextNode = await this.root.findNextTask();
    }

    // Get task states for progress counting
    const allNodes = Array.from(this.nodes.values());
    const completedCount = await Promise.all(
      allNodes.map(async (n) => ((await n.isComplete()) ? 1 : 0)),
    ).then((counts) =>
      counts.reduce((sum: number, c: number) => sum + c, 0 as number),
    );

    // Compute failed task IDs (for null return case)
    const failedIds: string[] = [];
    for (const n of allNodes) {
      if (await n.isFailed()) {
        failedIds.push(n.id);
      }
    }

    if (!nextNode) {
      return { node: null, completedCount, totalCount: allNodes.length, failedIds };
    }

    // Convert TreeNode to TreeNodeData (lightweight API response)
    return {
      node: {
        id: nextNode.id,
        unit: nextNode.unit,
        epicId: nextNode.epicId,
        isWbsParent: nextNode.isWbsParent,
        blocking: nextNode.blocking,
        tags: nextNode.tags,
      },
      completedCount,
      totalCount: allNodes.length,
      failedIds,
    };
  }

  /**
   * Find the first runnable node matching a filter string, searching the entire tree.
   * When a matching node is a WBS parent, drills into its children via findNextTask().
   */
  private async findFirstRunnableMatch(
    filter: string,
    force?: boolean,
  ): Promise<TreeNode | null> {
    // BFS to find matching nodes in tree order
    const queue: TreeNode[] = [...this.root.getChildren()];
    while (queue.length > 0) {
      const node = queue.shift()!;
      const leafId = node.id.split("/").pop() ?? "";
      const epicId = node.epicId ?? "";
      const idMatch = node.id.includes(filter) || leafId.includes(filter) || epicId.includes(filter);

      if (idMatch) {
        let isComplete = false;
        let isFailed = false;
        let isBlocked = false;
        if (!force) {
          isComplete = await node.isComplete();
          isFailed = await node.isFailed();
          isBlocked = await node.isBlocked();
          if (isComplete || isFailed || isBlocked) {
            // Still enqueue children — a completed parent may have pending children
            queue.push(...node.getChildren());
            continue;
          }
        }
        // If this is a WBS parent with children, drill down to find the runnable leaf.
        // Skip sibling blocking — user explicitly targeted this task via filter,
        // so failed siblings shouldn't prevent running pending ones.
        if (node.children.length > 0) {
          const leaf = await node.findNextTask(
            /* skipSiblingBlocking */ true,
            force,
          );
          if (leaf) return leaf;
          // No runnable children — if this node itself is a leaf (no children),
          // return it. Container parents with all-children-resolved should
          // auto-complete via findNextTask; we must NOT return them here or
          // we get the select→skip→select infinite loop.
          if (node.children.length === 0 && !force && !isComplete && !isFailed && !isBlocked) {
            return node;
          }
          continue;
        }
        return node;
      }

      queue.push(...node.getChildren());
    }

    return null;
  }

  /**
   * Generic tree traversal with visitor pattern.
   */
  async traverse(
    visitor: (node: TreeNode) => void | Promise<void> | "stop",
    order: "pre" | "post" | "bfs" = "pre",
  ): Promise<void> {
    if (order === "bfs") {
      await this.bfs(this.root, visitor);
    } else if (order === "pre") {
      await this.preOrder(this.root, visitor);
    } else {
      await this.postOrder(this.root, visitor);
    }
  }

  /**
   * Generic tree traversal with visitor (sync version).
   */
  traverseSync(
    visitor: (node: TreeNode) => void | "stop",
    order: "pre" | "post" | "bfs" = "pre",
  ): void {
    if (order === "bfs") {
      this.bfsSync(this.root, visitor);
    } else if (order === "pre") {
      this.preOrderSync(this.root, visitor);
    } else {
      this.postOrderSync(this.root, visitor);
    }
  }

  private async preOrder(
    node: TreeNode,
    visitor: (node: TreeNode) => void | Promise<void> | "stop",
  ): Promise<"stop" | void> {
    const result = await visitor(node);
    if (result === "stop") return "stop";

    for (const child of node.children) {
      const childResult = await this.preOrder(child, visitor);
      if (childResult === "stop") return "stop";
    }
  }

  private async postOrder(
    node: TreeNode,
    visitor: (node: TreeNode) => void | Promise<void> | "stop",
  ): Promise<"stop" | void> {
    for (const child of node.children) {
      const childResult = await this.postOrder(child, visitor);
      if (childResult === "stop") return "stop";
    }

    const result = await visitor(node);
    if (result === "stop") return "stop";
  }

  private async bfs(
    root: TreeNode,
    visitor: (node: TreeNode) => void | Promise<void> | "stop",
  ): Promise<void> {
    const queue: TreeNode[] = [root];

    while (queue.length > 0) {
      const node = queue.shift()!;
      const result = await visitor(node);
      if (result === "stop") return;

      queue.push(...node.children);
    }
  }

  private preOrderSync(
    node: TreeNode,
    visitor: (node: TreeNode) => void | "stop",
  ): "stop" | void {
    const result = visitor(node);
    if (result === "stop") return "stop";

    for (const child of node.children) {
      const childResult = this.preOrderSync(child, visitor);
      if (childResult === "stop") return "stop";
    }
  }

  private postOrderSync(
    node: TreeNode,
    visitor: (node: TreeNode) => void | "stop",
  ): "stop" | void {
    for (const child of node.children) {
      const childResult = this.postOrderSync(child, visitor);
      if (childResult === "stop") return "stop";
    }

    const result = visitor(node);
    if (result === "stop") return "stop";
  }

  private bfsSync(
    root: TreeNode,
    visitor: (node: TreeNode) => void | "stop",
  ): void {
    const queue: TreeNode[] = [root];

    while (queue.length > 0) {
      const node = queue.shift()!;
      const result = visitor(node);
      if (result === "stop") return;

      queue.push(...node.children);
    }
  }

  /**
   * Filter nodes via traversal.
   */
  async filter(
    predicate: (node: TreeNode) => boolean | Promise<boolean>,
  ): Promise<TreeNode[]> {
    const results: TreeNode[] = [];
    await this.traverse(async (node) => {
      if (await predicate(node)) {
        results.push(node);
      }
    });
    return results;
  }

  /**
   * Filter nodes via traversal (sync version).
   */
  filterSync(predicate: (node: TreeNode) => boolean): TreeNode[] {
    const results: TreeNode[] = [];
    this.traverseSync((node) => {
      if (predicate(node)) {
        results.push(node);
      }
    });
    return results;
  }

  /* ── Node Queries ────────────────────────────────────────────── */

  /**
   * Get node by ID (O(1) lookup).
   */
  getNode(id: string): TreeNode | null {
    return this.nodes.get(id) || null;
  }

  /**
   * Get all nodes (for iteration).
   */
  /**
   * Get node by file path (for wiring with JournalTree)
   */
  getNodeByPath(filePath: string): TreeNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.unit.path === filePath) {
        return node;
      }
    }
    return undefined;
  }

  /**
   * Get all nodes in tree order (pre-order traversal).
   * This ensures nodes are returned in the same order they appear in the tree structure.
   */
  getAllNodes(): TreeNode[] {
    const result: TreeNode[] = [];
    const visit = (node: TreeNode) => {
      result.push(node);
      // Visit children in order (already sorted by numeric prefix)
      for (const child of node.children) {
        visit(child);
      }
    };
    // Start from root's children (skip virtual root itself)
    for (const child of this.root.children) {
      visit(child);
    }
    return result;
  }

  /* ── State Queries ───────────────────────────────────────────── */

  /**
   * Get task states (completed, failed, blocked, etc.).
   * This is computed via tree traversal + checkpoint.
   */
  /**
   * Reconcile flat checkpoint from individual journal checkpoint files.
   *
   * Traverses .converge/journal/tasks/** for per-task checkpoint.json files,
   * derives the authoritative status for each task, auto-completes parents
   * when all children are done, and syncs the result back to the flat
   * .checkpoint.json.
   *
   * Individual checkpoints win over flat checkpoint for tasks that have them.
   * Flat checkpoint is preserved as fallback for tasks without individual files.
   */
  async reconcileFromJournal(): Promise<{
    added: string[];
    removed: string[];
    autoCompleted: string[];
    completed: Set<string>;
    failed: Set<string>;
    seeded: Set<string>;
  }> {
    const journalEpicsDir = getEpicsDir(this.projectDir);
    const corrections = {
      added: [] as string[],
      removed: [] as string[],
      autoCompleted: [] as string[],
    };

    // Load individual task checkpoints from journal directory tree
    const journalCompleted = new Set<string>();
    const journalFailed = new Set<string>();
    const journalSeeded = new Set<string>();

    if (existsSync(journalEpicsDir)) {
      // Recursively collect all checkpoint.json paths under the epics dir
      // Skip directories we don't need (sessions, logs, attempts)
      const collectCheckpoints = async (dir: string): Promise<string[]> => {
        const results: string[] = [];
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            // Skip directories that don't contain task checkpoints
            const skipDirs = ["sessions", "logs", "attempts"];
            if (skipDirs.includes(entry.name)) {
              continue;
            }
            results.push(...(await collectCheckpoints(full)));
          } else if (entry.name === "checkpoint.json") {
            results.push(full);
          }
        }
        return results;
      };

      const epicEntries = await readdir(journalEpicsDir, {
        withFileTypes: true,
      });
      for (const epicEntry of epicEntries) {
        if (!epicEntry.isDirectory()) continue;
        const epicDir = path.join(journalEpicsDir, epicEntry.name);
        const ckptPaths = await collectCheckpoints(epicDir);

        for (const ckptPath of ckptPaths) {
          // journalTaskId = path relative to epic dir, with forward slashes
          const taskDir = path.dirname(ckptPath);
          const rel = path.relative(epicDir, taskDir).replace(/\\/g, "/");

          try {
            const raw = JSON.parse(await readFile(ckptPath, "utf-8"));

            // Epic-level checkpoint (rel === '.' or '') — the epic IS the task.
            // Use epicId as the journalTaskId.
            const journalId = !rel || rel === "." ? epicEntry.name : rel;

            if (raw.status === "complete") journalCompleted.add(journalId);
            else if (raw.status === "failed") journalFailed.add(journalId);
            else if (raw.status === "seeded") journalSeeded.add(journalId);
          } catch {
            /* ignore corrupt files */
          }
        }
      }
    }

    // Load existing flat checkpoint as fallback for tasks with no individual file
    const existing = await this.checkpoint.load();
    let flatCompleted = new Set<string>();
    let flatFailed = new Set<string>();
    let flatSeeded = new Set<string>();

    if (existing) {
      // V2 checkpoint - get from filesystem via TaskStateManager
      const completed = await this.checkpoint.getCompletedTasks();
      const failed = await this.checkpoint.getFailedTasks();
      flatCompleted = new Set(completed);
      flatFailed = new Set(failed);
    }

    // Merge: individual checkpoint wins; flat checkpoint fills gaps
    const allKnownIds = new Set([
      ...journalCompleted,
      ...journalFailed,
      ...journalSeeded,
      ...flatCompleted,
      ...flatFailed,
      ...flatSeeded,
    ]);

    const completed = new Set<string>();
    const failed = new Set<string>();
    const seeded = new Set<string>();

    for (const id of allKnownIds) {
      const hasIndividual =
        journalCompleted.has(id) ||
        journalFailed.has(id) ||
        journalSeeded.has(id);
      if (hasIndividual) {
        if (journalCompleted.has(id)) completed.add(id);
        else if (journalFailed.has(id)) failed.add(id);
        else if (journalSeeded.has(id)) seeded.add(id);
      } else {
        // Fall back to flat checkpoint
        if (flatCompleted.has(id)) completed.add(id);
        else if (flatFailed.has(id)) failed.add(id);
        else if (flatSeeded.has(id)) seeded.add(id);
      }
    }

    // Auto-complete seeded parents whose all children are now complete.
    // Process bottom-up (reverse of getAllNodes which is top-down pre-order).
    for (const node of [...this.getAllNodes()].reverse()) {
      if (node.children.length === 0) continue;
      if (!seeded.has(node.id) && !completed.has(node.id)) continue;

      const allChildrenComplete = node.children.every((c) =>
        completed.has(c.id),
      );
      if (allChildrenComplete && seeded.has(node.id)) {
        seeded.delete(node.id);
        completed.add(node.id);
        corrections.autoCompleted.push(node.id);
      }
    }

    // Compute corrections vs current flat checkpoint
    for (const id of completed) {
      if (!flatCompleted.has(id)) corrections.added.push(id);
    }
    for (const id of flatCompleted) {
      if (!completed.has(id)) corrections.removed.push(id);
    }

    // Write synced state back to flat checkpoint
    // V2 checkpoint doesn't store task arrays - they're derived from filesystem
    if (existing && existing.version === 2) {
      // V2 - just update metadata
      await this.checkpoint.save({
        version: 2,
        timestamp: new Date().toISOString(),
        iteration: existing.iteration,
        totalGapsResolved: existing.totalGapsResolved,
        totalErrors: existing.totalErrors,
        lastSuccessfulIteration: existing.lastSuccessfulIteration,
        _cache: existing._cache,
      });
    } else {
      // V1 - save task arrays
      const locked = new Set([...completed, ...failed, ...seeded]);
      await this.checkpoint.save({
        version: existing?.version ?? 1,
        timestamp: new Date().toISOString(),
        iteration: existing?.iteration ?? 0,
        totalGapsResolved: existing?.totalGapsResolved ?? 0,
        totalErrors: existing?.totalErrors ?? 0,
        completedTasks: [...completed],
        failedTasks: [...failed],
        seededTasks: [...seeded],
        lockedTasks: [...locked],
        taskAttempts: existing?.taskAttempts,
        taskMetadata: existing?.taskMetadata,
      });
    }

    return { ...corrections, completed, failed, seeded };
  }

  async getTaskStates(): Promise<TaskStates> {
    // Reconcile from journal — returns the authoritative completed/failed/seeded sets
    // so we don't need to re-scan the filesystem via getCompletedTasks/getFailedTasks/getLockedTasks.
    const reconciled = await this.reconcileFromJournal();
    this.checkpoint.invalidate();

    const completed = new Set<string>();
    const failed = new Set<string>();
    const seeded = new Set<string>();
    const locked = new Set<string>();
    const blocked = new Set<string>();
    const blockingFailures = new Set<string>();
    const failureBlocked = new Set<string>();
    const wbsProgress = new Map<string, any>();

    // reconcileFromJournal returns IDs that may include structural prefixes (e.g. "tasks/").
    // The journal IDs use the same format as tree node IDs (journalTaskId), so use directly.
    // Also strip "epicId/" prefix to match tree node IDs for V2-style keys.
    for (const id of reconciled.completed) {
      completed.add(id);
      if (id.includes("/")) {
        const taskPart = id.split("/").slice(1).join("/");
        if (taskPart) completed.add(taskPart);
      }
    }
    for (const id of reconciled.failed) {
      failed.add(id);
      if (id.includes("/")) {
        const taskPart = id.split("/").slice(1).join("/");
        if (taskPart) failed.add(taskPart);
      }
    }
    for (const id of reconciled.seeded) {
      seeded.add(id);
      if (id.includes("/")) {
        const taskPart = id.split("/").slice(1).join("/");
        if (taskPart) seeded.add(taskPart);
      }
    }
    // Locked = union of completed + failed + seeded
    for (const id of [...completed, ...failed, ...seeded]) {
      locked.add(id);
    }

    // Compute WBS progress for parents
    for (const node of this.nodes.values()) {
      if (node.children.length > 0) {
        let completedSubtasks = 0;
        let failedSubtasks = 0;
        const subtaskIds: string[] = [];

        for (const child of node.children) {
          subtaskIds.push(child.id);
          if (completed.has(child.id)) {
            completedSubtasks++;
          } else if (failed.has(child.id)) {
            failedSubtasks++;
          }
        }

        wbsProgress.set(node.id, {
          seeded: seeded.has(node.id),
          spawnCount: node.children.length,
          completedSubtasks,
          failedSubtasks,
          subtaskIds,
        });
      }
    }

    // Compute blocking failures
    for (const node of this.nodes.values()) {
      if (node.blocking && failed.has(node.id)) {
        blockingFailures.add(node.id);
      }
    }

    // Inject status cache for O(1) isComplete/isFailed in blocked computation
    this.populateStatusCache();

    // Compute blocked tasks via tree traversal
    // Step 1: Check explicit dependencies and transitive blocking
    for (const node of this.nodes.values()) {
      if (await node.isBlocked()) {
        blocked.add(node.id);
      }

      // Also check if dependencies are complete - block if any dependency is incomplete
      for (const dep of node.dependencies) {
        if (!completed.has(dep.id)) {
          blocked.add(node.id);
          // Only failure-block when the dep actually failed (not just incomplete/running)
          if (
            failed.has(dep.id) ||
            blockingFailures.has(dep.id) ||
            failureBlocked.has(dep.id)
          ) {
            failureBlocked.add(node.id);
          }
          break;
        }
      }
    }

    // Step 2: Block tasks that come after failed blocking tasks (epic sequential order)
    // Group nodes by epic
    const epicNodesMap = new Map<string, TreeNode[]>();
    for (const node of this.nodes.values()) {
      const epicId = node.epicId || "unknown";
      if (!epicNodesMap.has(epicId)) {
        epicNodesMap.set(epicId, []);
      }
      epicNodesMap.get(epicId)!.push(node);
    }

    // Sort epics by numeric prefix (execution order)
    const sortedEpicIds = Array.from(epicNodesMap.keys()).sort((a, b) => {
      const aMatch = a.match(/^(\d+)-/);
      const bMatch = b.match(/^(\d+)-/);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : 999;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 999;
      return aNum - bNum;
    });

    let globalBlockingFailure = false;
    let globalFailureBlocked = false; // true only when cause is an actual failure

    // For each epic (in execution order), block tasks that come after incomplete blocking tasks
    for (const epicId of sortedEpicIds) {
      const epicNodes = epicNodesMap.get(epicId)!;
      // Sort nodes by Unit.sortIndex (execution order within epic)
      // Only consider top-level tasks (not children) - children are handled separately
      const topLevelNodes = epicNodes
        .filter((n) => !n.parent || n.parent.id === "__root__")
        .sort((a, b) => {
          // Sort by ID (e.g., "001-task" < "002-task")
          return a.id.localeCompare(b.id);
        });

      for (const node of topLevelNodes) {
        // If global blocking failure encountered, block this and all subsequent tasks
        // EXCEPT if this is a child task (ID starts with a parent's ID + /)
        // Children should be runnable to complete their parent
        const isChild = epicNodes.some(
          (parent) =>
            parent.id !== node.id && node.id.startsWith(parent.id + "/"),
        );

        if (globalBlockingFailure && !isChild) {
          blocked.add(node.id);
          if (globalFailureBlocked) {
            failureBlocked.add(node.id);
          }
          continue;
        }

        // Check if THIS task is blocking AND not complete
        if (node.blocking && !completed.has(node.id)) {
          // If task has children, check if all children are done
          const wbs = wbsProgress.get(node.id);
          if (wbs && wbs.spawnCount > 0) {
            const allChildrenDone =
              wbs.completedSubtasks + wbs.failedSubtasks === wbs.spawnCount;
            if (!allChildrenDone) {
              // Parent incomplete (children still pending) - block subsequent siblings
              globalBlockingFailure = true;
              // Only failure-block if the parent actually failed (not just running/seeded)
              if (failed.has(node.id)) {
                globalFailureBlocked = true;
              }
              const icon = failed.has(node.id) ? "🚫" : "⟳";
              console.log(
                `${icon} Blocking task (incomplete): ${node.id} - children (${wbs.completedSubtasks}/${wbs.spawnCount} done), subsequent siblings blocked`,
              );
              continue;
            }
          }

          // Task has no children but is incomplete (failed/seeded/locked)
          if (
            failed.has(node.id) ||
            seeded.has(node.id) ||
            locked.has(node.id)
          ) {
            globalBlockingFailure = true;
            // Only failure-block if the task actually failed
            if (failed.has(node.id)) {
              globalFailureBlocked = true;
            }
            const icon = failed.has(node.id) ? "🚫" : "⟳";
            console.log(
              `${icon} Blocking task (incomplete): ${node.id} - subsequent siblings blocked`,
            );
            continue;
          }
        }
      }
    }

    // Step 2b: Apply sibling blocking within WBS parent groups.
    // The first non-completed blocking sibling blocks all subsequent siblings.
    for (const parentNode of this.nodes.values()) {
      if (parentNode.children.length === 0) continue;
      const sortedChildren = [...parentNode.children].sort((a, b) =>
        a.id.localeCompare(b.id),
      );
      let siblingBlocker = false;
      let siblingFailureBlocker = false;
      for (const child of sortedChildren) {
        if (siblingBlocker) {
          blocked.add(child.id);
          if (siblingFailureBlocker) {
            failureBlocked.add(child.id);
          }
          continue;
        }
        if (child.blocking !== false && !completed.has(child.id)) {
          siblingBlocker = true;
          // Only failure-block subsequent siblings if this sibling actually failed
          if (failed.has(child.id) || failureBlocked.has(child.id)) {
            siblingFailureBlocker = true;
          }
        }
      }
    }

    // Block children whose parent tasks are blocked (slash-separated IDs)
    for (const node of Array.from(this.nodes.values())) {
      // Check if this is a child task (ID contains /)
      if (node.id.includes("/")) {
        const parentId = node.id.split("/")[0];
        // If parent is blocked, block the child too
        if (blocked.has(parentId)) {
          blocked.add(node.id);
          if (failureBlocked.has(parentId)) {
            failureBlocked.add(node.id);
          }
        }
      }
    }

    // Step 3: Block ALL children of blocked tasks
    // UNLESS the parent is a WBS parent with incomplete children - in that case, children should run
    for (const node of this.nodes.values()) {
      if (node.parent && node.parent.id !== "__root__") {
        // Find parent node
        const parentNode = Array.from(this.nodes.values()).find(
          (n) => n.unit === node.parent,
        );

        // Check if parent is blocked
        if (parentNode && blocked.has(parentNode.id)) {
          // Check if parent is a WBS parent with incomplete children (partial failure or seeded)
          const parentWbs = wbsProgress.get(parentNode.id);
          const isWbsPartialState =
            parentWbs &&
            parentWbs.spawnCount > 0 &&
            (failed.has(parentNode.id) || seeded.has(parentNode.id));

          if (!isWbsPartialState) {
            // Normal case: parent is blocked, block all children
            blocked.add(node.id);
            if (failureBlocked.has(parentNode.id)) {
              failureBlocked.add(node.id);
            }
          }
          // else: WBS partial state - children should run to complete/unblock parent
        }

        // Also check blockingFailures for backward compatibility
        if (parentNode && blockingFailures.has(parentNode.id)) {
          const parentWbs = wbsProgress.get(parentNode.id);
          const isWbsPartialFailure = parentWbs && parentWbs.spawnCount > 0;

          if (!isWbsPartialFailure) {
            // Normal blocking failure - block all children
            blocked.add(node.id);
            failureBlocked.add(node.id);
          }
          // else: WBS partial failure - children should run to complete parent
        }
      }
    }

    this.clearStatusCache();

    return {
      completed,
      failed,
      seeded,
      locked,
      blocked,
      blockingFailures,
      failureBlocked,
      wbsProgress,
    };
  }

  /**
   * Get blocked tasks.
   */
  async getBlockedTasks(): Promise<TreeNode[]> {
    return await this.filter(async (node) => await node.isBlocked());
  }

  /**
   * Get blocking failures.
   */
  async getBlockingFailures(): Promise<TreeNode[]> {
    return await this.filter(async (node: TreeNode) => {
      return node.blocking && (await node.isFailed());
    });
  }

  /**
   * Find ancestor TreeNodes for a given node.
   * Walks up Unit.parent chain and finds corresponding TreeNodes.
   */
  findAncestorNodes(node: TreeNode): TreeNode[] {
    const ancestors: TreeNode[] = [];
    let current = node.parent; // Unit

    while (current && current.id !== "__root__") {
      const ancestorNode = Array.from(this.nodes.values()).find(
        (n) => n.unit === current,
      );
      if (ancestorNode) {
        ancestors.push(ancestorNode);
      }
      current = current.parent;
    }

    return ancestors;
  }

  /**
   * Get progress (completed vs total).
   */
  async getProgress(): Promise<{
    completed: number;
    total: number;
    byEpic: Map<string, number>;
  }> {
    this.populateStatusCache();
    try {
      const allNodes = Array.from(this.nodes.values());
      const completedCount = await Promise.all(
        allNodes.map(async (n) => ((await n.isComplete()) ? 1 : 0)),
      ).then((counts) =>
        counts.reduce((sum: number, c: number) => sum + c, 0 as number),
      );

      const byEpic = new Map<string, number>();
      for (const node of allNodes) {
        if ((await node.isComplete()) && node.epicId) {
          byEpic.set(node.epicId, (byEpic.get(node.epicId) || 0) + 1);
        }
      }

      return {
        completed: completedCount,
        total: allNodes.length,
        byEpic,
      };
    } finally {
      this.clearStatusCache();
    }
  }

  /* ── State Mutations ─────────────────────────────────────────── */

  /**
   * Mark task as completed.
   * Propagates up parent chain to check for auto-completion.
   */
  async markCompleted(node: TreeNode): Promise<void> {
    // If this node has children, don't mark it complete unless all children are done.
    // The parent's own output may exist (pre-flight passes), but children still need work.
    if (node.children.length > 0) {
      const allChildrenDone = await Promise.all(
        node.children.map(async (c: TreeNode) => {
          const completed = await c.isComplete();
          const failed = await c.isFailed();
          return completed || failed;
        }),
      ).then((results: boolean[]) => results.every((r: boolean) => r));

      if (!allChildrenDone) {
        // Don't mark parent complete — children still pending
        console.log(
          `  ↻ Skipping completion of ${node.id}: ${node.children.length} children not all done`,
        );
        return;
      }
    }

    await this.checkpoint.markTaskCompleted(node.id);

    // Check if parent should auto-complete
    // node.parent is a Unit - need to find its TreeNode
    if (node.parent && node.parent.id !== "__root__") {
      const parentNode = Array.from(this.nodes.values()).find(
        (n) => n.unit === node.parent,
      );
      if (parentNode && parentNode.children.length > 0) {
        const allChildrenDone = await Promise.all(
          parentNode.children.map(async (c: TreeNode) => {
            const completed = await c.isComplete();
            const failed = await c.isFailed();
            return completed || failed;
          }),
        ).then((results: boolean[]) => results.every((r: boolean) => r));

        if (allChildrenDone) {
          await this.markCompleted(parentNode); // Recursive
        }
      }
    }
  }

  /**
   * Mark task as failed.
   * Blocking propagation is handled via tree traversal (isBlocked()).
   */
  async markFailed(node: TreeNode): Promise<void> {
    await this.checkpoint.markTaskFailed(node.id);
    // No need to mark dependents as blocked - that's computed dynamically via isBlocked()
  }

  /**
   * Mark task as seeded (WBS parent spawned children).
   */
  async markSeeded(node: TreeNode, childIds: string[]): Promise<void> {
    await this.checkpoint.markTaskSeeded(node.id);
    // Children are discovered on next tree shake (reload)
  }
}

/* ------------------------------------------------------------------ */
/*  Test Ref Expansion                                                  */
/* ------------------------------------------------------------------ */

function expandUnitTestRefs(unit: Unit, registry: Map<string, TestDef>): void {
  const checks = unit.checks;
  if (!checks || typeof checks === "function") return;

  // Only process static Check arrays (no dynamic per-check callbacks)
  const hasCallback = checks.some((c) => typeof c === "function");
  if (hasCallback) return;

  const staticChecks = checks as Check[];
  const hasTestRefs = staticChecks.some((c) => c.type === "test");
  if (!hasTestRefs) return;

  // Build ParsedTask from Unit
  const parsedTask: ParsedTask = {
    id: unit.id,
    checks: staticChecks.map((c): InlineCheck | TestRefCheck => {
      if (c.type === "test" && c.name) {
        return { type: "test", name: c.name, args: c.args };
      }
      return {
        id: c.id,
        description: c.description,
        cmd: c.cmd,
        type: c.type as "cmd" | "ai" | undefined,
      };
    }),
  };

  try {
    const expanded = expandTestRefs(parsedTask, registry);
    // Replace unit checks with expanded inline checks, preserving extra fields
    unit.checks = expanded.checks.map((c): Check => {
      const ic = c as InlineCheck;
      return {
        id: ic.id,
        description: ic.description,
        cmd: ic.cmd,
        type: ic.type,
      };
    });
  } catch {
    // If expansion fails (e.g. unresolved ref), leave checks as-is.
    // The runtime check runner will report the error.
  }
}
