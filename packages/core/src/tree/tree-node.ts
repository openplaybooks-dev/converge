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

import type { Unit } from "../unit/unit.ts";
import type { CheckpointManager } from "../checkpoint/manager.ts";

/**
 * A node in the task tree that wraps a Unit.
 * Adds tree structure (children, dependencies) on top of Unit's execution logic.
 */
export class TreeNode {
  /** The task unit (owns execution logic) */
  readonly unit: Unit;

  /** Reference to checkpoint manager for state queries */
  private checkpoint: CheckpointManager;

  /** Injected status cache for O(1) lookups (set/cleared by TaskTree batch ops) */
  private _statusCache?: Map<string, string>;

  /** Child nodes (tree structure - depth 1 only) */
  children: TreeNode[] = [];

  /** Direct dependencies (resolved from dependency IDs) */
  dependencies: TreeNode[] = [];

  /** Tasks that depend on this one (reverse edges) */
  dependents: TreeNode[] = [];

  constructor(unit: Unit, checkpoint: CheckpointManager) {
    this.unit = unit;
    this.checkpoint = checkpoint;
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

  /** Whether this is a WBS parent (has wbsFn) */
  get isWbsParent(): boolean {
    return !!this.unit.wbsFn;
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
   * Check if this node is seeded (WBS parent that spawned children).
   *
   * A node is seeded if:
   * 1. It has children in the tree structure, OR
   * 2. It was marked as seeded in the checkpoint (handles case where tree node
   *    was reused but children weren't attached yet, or children were orphaned)
   *
   * The checkpoint check is essential for correctness when:
   * - Tree node is reused across reload() but children array wasn't updated
   * - Children exist from a previous run but WBS hasn't re-run yet
   * - Parent was marked seeded but tree reload didn't pick up children
   */
  get isSeeded(): boolean {
    // Fast path: has children in tree structure
    if (this.children.length > 0) {
      return true;
    }
    // Checkpoint verification: was this WBS parent actually marked as seeded?
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
  async findNextTask(skipSiblingBlocking = false): Promise<TreeNode | null> {
    // If this is a WBS parent that hasn't seeded yet, return self
    if (this.isWbsParent && !this.isSeeded) {
      return this;
    }

    // Only search immediate children (depth 1)
    for (const child of this.children) {
      const completed = await child.isComplete();
      const failed = await child.isFailed();
      const blocked = await child.isBlocked();

      if (completed || failed || blocked) {
        // A failed blocking task stops the entire sibling chain —
        // no subsequent siblings should execute (unless explicitly overridden
        // by a filter match, which sets skipSiblingBlocking=true).
        if (failed && child.blocking && !skipSiblingBlocking) {
          return null;
        }

        // Even if the parent is marked complete/failed, it may have children
        // that still need work (e.g. parent output exists but children are pending).
        // Recurse into it to find pending grandchildren.
        if (child.children.length > 0) {
          const grandchild = await child.findNextTask();
          if (grandchild) {
            return grandchild;
          }
        }
        continue;
      }

      // If child has children (WBS parent or task with subtasks), recurse
      if (child.children.length > 0) {
        const grandchild = await child.findNextTask();
        if (grandchild) {
          return grandchild;
        }
        // All grandchildren done, skip this child and continue to siblings
        continue;
      }

      return child; // First runnable leaf
    }

    return null; // No runnable children
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
