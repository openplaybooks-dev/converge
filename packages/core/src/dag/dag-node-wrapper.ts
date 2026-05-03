/**
 * Tree Node
 *
 * Wraps a Unit and adds tree-specific functionality (children, dependencies, blocking).
 * TreeNode owns the tree structure, Unit owns execution logic.
 *
 * Design:
 * - TreeNode.unit = The actual task
 * - TreeNode.children = Tree structure (TreeNode[])
 * - Unit.parent = Single parent reference (Unit)
 * - TreeNode delegates properties to unit (no duplication)
 */

import type { Unit } from "../task/unit/unit.ts";
import type { TaskStateManager } from "../checkpoint/state.ts";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * A node in the task tree that wraps a Unit.
 * Adds tree structure (children, dependencies) on top of Unit's execution logic.
 */
export class TreeNode {
  /** The task unit (owns execution logic) */
  readonly unit: Unit;

  /** Reference to checkpoint manager for state queries */
  private checkpoint: TaskStateManager;

  /** Project root directory — needed to resolve input paths on disk */
  private projectDir: string;

  /** Injected status cache for O(1) lookups (set/cleared by TaskTree batch ops) */
  private _statusCache?: Map<string, string>;

  /** Child nodes (tree structure - depth 1 only) */
  children: TreeNode[] = [];

  /** Direct dependencies (resolved from dependency IDs) */
  dependencies: TreeNode[] = [];

  /** Tasks that depend on this one (reverse edges) */
  dependents: TreeNode[] = [];

  constructor(unit: Unit, checkpoint: TaskStateManager, projectDir: string) {
    this.unit = unit;
    this.checkpoint = checkpoint;
    this.projectDir = projectDir;
  }

  /* ── Property Delegates (no duplication with Unit) ───────────────── */

  /** Unique identifier (delegates to unit.id) */
  get id(): string {
    return this.unit.id;
  }

  /** Parent unit (delegates to unit.parent) */
  get parent(): Unit | null {
    return this.unit.parent;
  }

  /** Epic ID (derived from unit.context) */
  get epicId(): string | undefined {
    return this.unit.context?.epicId;
  }

  /** Whether this is a Seed parent (has seedFn) */
  get isSeedParent(): boolean {
    return !!this.unit.seedFn;
  }

  /** Whether this task is blocking (delegates to unit) */
  get blocking(): boolean {
    return this.unit.blocking !== false; // Default true
  }

  /** Tags for dependency matching (delegates to unit) */
  get tags(): string[] {
    return this.unit.tags || [];
  }

  /* ── Status Cache Injection ─────────────────────────────────── */

  /**
   * Inject a pre-computed status map for O(1) lookups.
   * Called by TaskTree before batch operations.
   */
  setStatusCache(cache: Map<string, string>): void {
    this._statusCache = cache;
  }

  /**
   * Clear the injected status cache.
   * Called by TaskTree after batch operations.
   */
  clearStatusCache(): void {
    this._statusCache = undefined;
  }

  /* ── State Queries (use checkpoint + tree structure) ─────────── */

  /**
   * Check if this node is complete.
   * A task is complete if:
   * 1. It's marked complete in checkpoint
   * 2. All its outputs exist (validated elsewhere)
   */
  async isComplete(): Promise<boolean> {
    // Fast path: use injected status cache
    if (this._statusCache) {
      const qualifiedId = this.epicId ? `${this.epicId}/${this.id}` : this.id;
      return (
        this._statusCache.get(this.id) === "complete" ||
        this._statusCache.get(qualifiedId) === "complete"
      );
    }

    const completedTasks = await this.checkpoint.getCompletedTasks();

    // V2 checkpoint returns task IDs in "epicId/taskId" format
    // Check both formats for compatibility
    const qualifiedId = this.epicId ? `${this.epicId}/${this.id}` : this.id;

    return (
      completedTasks.includes(this.id) || completedTasks.includes(qualifiedId)
    );
  }

  /**
   * Check if this node has failed.
   */
  async isFailed(): Promise<boolean> {
    // Fast path: use injected status cache
    if (this._statusCache) {
      const qualifiedId = this.epicId ? `${this.epicId}/${this.id}` : this.id;
      return (
        this._statusCache.get(this.id) === "failed" ||
        this._statusCache.get(qualifiedId) === "failed"
      );
    }

    return await this.checkpoint.isTaskFailed(this.id);
  }

  /**
   * Check if this node is seeded (Seed parent that spawned children).
   *
   * A node is seeded if:
   * 1. It has children in the tree structure, OR
   * 2. It was marked as seeded in the checkpoint (handles case where tree node
   *    was reused but children weren't attached yet, or children were orphaned)
   *
   * The checkpoint check is essential for correctness when:
   * - Tree node is reused across reload() but children array wasn't updated
   * - Children exist from a previous run but Seed hasn't re-run yet
   * - Parent was marked seeded but tree reload didn't pick up children
   */
  async isSeeded(): Promise<boolean> {
    // Fast path: has children in tree structure
    if (this.children.length > 0) {
      return true;
    }
    // Checkpoint verification: was this Seed parent actually marked as seeded?
    // This handles edge cases where children exist on disk but tree node
    // wasn't updated, or where children were removed after seeding
    return this.checkpoint.isTaskSeeded(this.id);
  }

  /**
   * Check if this node is blocked.
   * A task is blocked if:
   * 1. Any of its dependencies failed as blocking tasks
   * 2. Any of its dependencies are blocked (transitive)
   * 3. Its parent unit is failed/blocked (requires finding parent TreeNode)
   * 4. Earlier sibling in same epic failed (via children array)
   */
  async isBlocked(visited = new Set<string>()): Promise<boolean> {
    // Prevent infinite recursion from circular dependencies
    if (visited.has(this.id)) {
      return false;
    }
    visited.add(this.id);

    // Check dependency edges
    for (const dep of this.dependencies) {
      const depFailed = await dep.isFailed();
      const depBlocked = await dep.isBlocked(visited);

      if (dep.blocking && depFailed) {
        return true;
      }
      if (depBlocked) {
        return true; // Transitive blocking
      }
    }

    // Note: Parent blocking is handled at tree level via checkpoint
    // Unit.parent is a Unit reference, not a TreeNode
    // Tree will mark children as blocked when parent fails

    return false;
  }

  /**
   * Check if parent is blocked (requires tree context).
   * This is called by TaskTree when computing blocked state.
   */
  async isBlockedByParent(parentNode: TreeNode | null): Promise<boolean> {
    if (!parentNode) return false;

    const parentBlocked = await parentNode.isBlocked();
    const parentFailed = await parentNode.isFailed();

    return parentBlocked || parentFailed;
  }

  /**
   * Check if blocked by earlier sibling (requires siblings array).
   * This is called by TaskTree when computing blocked state.
   */
  async isBlockedBySiblings(siblings: TreeNode[]): Promise<boolean> {
    const myIndex = siblings.indexOf(this);
    if (myIndex === -1) return false;

    for (let i = 0; i < myIndex; i++) {
      const sibling = siblings[i];
      const siblingFailed = await sibling.isFailed();
      if (siblingFailed) {
        return true;
      }
    }

    return false;
  }

  /* ── Hierarchical Traversal (depth 1 only) ───────────────────── */

  /**
   * Find the next runnable task among immediate children (depth 1).
   *
   * HIERARCHICAL: Only searches immediate children, not grandchildren.
   * Each node calls findNextTask() on its own children to create a chain:
   * root.findNextTask() → epic → epic.findNextTask() → task → task.findNextTask() → subtask
   *
   * This touches the full branch, not just finding a leaf.
   */
  async findNextTask(
    skipSiblingBlocking = false,
    force = false,
  ): Promise<TreeNode | null> {
    // If this is a Seed parent that hasn't seeded yet, return self
    if (this.isSeedParent && !(await this.isSeeded())) {
      if (process.env.CONVERGE_DEBUG_FIND_NEXT)console.log(`  [findNextTask] ${this.id}: Seed parent not seeded, returning self`);
      return this;
    }

    let allChildrenResolved = true;
    if (process.env.CONVERGE_DEBUG_FIND_NEXT)console.log(`  [findNextTask] ${this.id}: checking ${this.children.length} children (isSeedParent=${this.isSeedParent})`);

    // Only search immediate children (depth 1)
    for (const child of this.children) {
      const completed = await child.isComplete();
      const failed = await child.isFailed();
      const blocked = await child.isBlocked();

      if (!completed && !failed && !blocked) {
        allChildrenResolved = false;
      }

      if (process.env.CONVERGE_DEBUG_FIND_NEXT)console.log(`    child ${child.id}: completed=${completed} failed=${failed} blocked=${blocked} hasChildren=${child.children.length} skip=${force ? completed : completed || failed || blocked}`);

      // With force, treat failed/blocked children as runnable — user explicitly
      // asked to rerun. Completed siblings are still skipped (nothing to redo).
      const skip = force ? completed : completed || failed || blocked;

      if (skip) {
        // A failed blocking task stops the entire sibling chain —
        // no subsequent siblings should execute (unless explicitly overridden
        // by a filter match, which sets skipSiblingBlocking=true, or by force).
        if (failed && child.blocking && !skipSiblingBlocking && !force) {
          return null;
        }

        // Even if the parent is marked complete/failed, it may have children
        // that still need work (e.g. parent output exists but children are pending).
        // Recurse into it to find pending grandchildren.
        if (child.children.length > 0) {
          const grandchild = await child.findNextTask(false, force);
          if (grandchild) {
            return grandchild;
          }
        }
        continue;
      }

      // If child has children (Seed parent or task with subtasks), recurse
      if (child.children.length > 0) {
        const grandchild = await child.findNextTask(false, force);
        if (grandchild) {
          return grandchild;
        }
        // All grandchildren done, skip this child and continue to siblings
        continue;
      }

      // Skip leaves whose declared inputs don't exist on disk yet —
      // the producer upstream hasn't run. Try the next sibling.
      if (await this.inputsMissing(child)) {
        allChildrenResolved = false;
        if (process.env.CONVERGE_DEBUG_FIND_NEXT)console.log(`    child ${child.id}: inputs missing, skipping`);
        continue;
      }

      if (process.env.CONVERGE_DEBUG_FIND_NEXT)console.log(`    => returning leaf ${child.id}`);
      return child; // First runnable leaf
    }

    // No runnable children. If this is a container parent and all children
    // are resolved (complete/failed/blocked), auto-complete the parent so
    // we don't get stuck re-selecting it on the next iteration.
    if (this.children.length > 0 && allChildrenResolved) {
      if (process.env.CONVERGE_DEBUG_FIND_NEXT)console.log(`  [findNextTask] ${this.id}: all children resolved, auto-completing`);
      await this.autoCompleteIfAllChildrenDone();
    }

    if (process.env.CONVERGE_DEBUG_FIND_NEXT)console.log(`  [findNextTask] ${this.id}: returning null`);
    return null; // No runnable children
  }

  /**
   * Auto-complete a container parent when all children are done.
   * Persists to both the per-task checkpoint and the global checkpoint.
   */
  private async autoCompleteIfAllChildrenDone(): Promise<void> {
    // Only auto-complete container parents (no Seed), not Seed parents.
    if (this.isSeedParent) return;

    // Re-verify all children are actually resolved before marking complete.
    for (const child of this.children) {
      const done = (await child.isComplete()) || (await child.isFailed());
      if (!done) return;
    }

    // Mark complete in the global checkpoint.
    await this.checkpoint.markTaskCompleted(
      this.id,
      this.epicId ?? "unknown",
    );
  }

  /**
   * Returns true when a leaf's declared inputs are missing from disk.
   * Skips glob patterns — only literal paths are checked.
   */
  private async inputsMissing(node: TreeNode): Promise<boolean> {
    const inputs = node.unit.inputs;
    if (!Array.isArray(inputs) || inputs.length === 0) return false;
    for (const input of inputs) {
      if (typeof input !== "string") continue;
      // Skip glob patterns — can't reliably check in this context.
      if (/[*?{}]/.test(input)) continue;
      const fullPath = path.join(this.projectDir, input);
      if (!existsSync(fullPath)) return true;
    }
    return false;
  }

  /**
   * Get immediate children (depth 1 only).
   */
  getChildren(): TreeNode[] {
    return this.children;
  }

  /**
   * Get all ancestor units (parent, grandparent, etc.).
   * Note: Returns Unit[], not TreeNode[], since Unit.parent is a Unit.
   * To get ancestor TreeNodes, use tree.findAncestorNodes(this).
   */
  getAncestorUnits(): Unit[] {
    const ancestors: Unit[] = [];
    let current = this.parent;
    while (current) {
      ancestors.push(current);
      current = current.parent;
    }
    return ancestors;
  }

  /**
   * Get all descendant nodes (children, grandchildren, etc.).
   */
  getDescendants(): TreeNode[] {
    const descendants: TreeNode[] = [];
    const visit = (node: TreeNode) => {
      descendants.push(node);
      node.children.forEach(visit);
    };
    this.children.forEach(visit);
    return descendants;
  }
}
