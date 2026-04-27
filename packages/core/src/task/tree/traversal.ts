/**
 * Tree Traversal Engine
 *
 * Implements depth-first traversal of the task tree with cursor-based checkpointing.
 * The tree is dynamic and evolves during execution as tasks generate subtasks.
 */

import type { Unit } from "../unit/index.ts";
import type { Cursor, ExecutionLevel, Checkpoint } from "../../storage/types.ts";
import type { Gap } from "../../task/gap/types.ts";
import { discoverTaskHierarchy } from "../../checkpoint/tree-utils.ts";
import path from "node:path";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/**
 * Tree traversal state
 */
export interface TraversalState {
  /** Current cursor position in tree */
  cursor: Cursor;

  /** Execution stack (breadcrumb trail) */
  executionStack: ExecutionLevel[];

  /** Current unit being executed */
  currentUnit: Unit;

  /** Iteration number */
  iteration: number;

  /** Gaps detected */
  gaps: Gap[];

  /** Completed unit IDs */
  completedUnits: Set<string>;
}

/**
 * Traversal result
 */
export interface TraversalResult {
  /** Whether traversal completed successfully */
  success: boolean;

  /** Total iterations performed */
  totalIterations: number;

  /** Total units executed */
  totalUnitsExecuted: number;

  /** Total units completed */
  totalUnitsCompleted: number;

  /** Final state */
  finalState: TraversalState;

  /** Termination reason */
  terminationReason: "completed" | "stalled" | "max-iterations" | "error";
}

/**
 * Traversal visitor for callbacks
 */
export interface TraversalVisitor {
  /** Called when entering a unit */
  onEnterUnit?(unit: Unit, state: TraversalState): Promise<void>;

  /** Called when exiting a unit */
  onExitUnit?(
    unit: Unit,
    state: TraversalState,
    success: boolean,
  ): Promise<void>;

  /** Called on each iteration */
  onIteration?(state: TraversalState): Promise<void>;

  /** Called when checkpoint is created */
  onCheckpoint?(checkpoint: Checkpoint, state: TraversalState): Promise<void>;

  /** Called when gaps are detected */
  onGapsDetected?(gaps: Gap[], state: TraversalState): Promise<void>;

  /** Called when gaps are resolved */
  onGapsResolved?(resolvedCount: number, state: TraversalState): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Tree Traversal Engine                                             */
/* ------------------------------------------------------------------ */

/**
 * Tree traversal engine with cursor-based checkpointing
 */
export class TreeTraversal {
  private visitor?: TraversalVisitor;
  private maxIterations: number;
  private checkpointInterval: number; // Checkpoint every N iterations

  constructor(
    options: {
      visitor?: TraversalVisitor;
      maxIterations?: number;
      checkpointInterval?: number;
    } = {},
  ) {
    this.visitor = options.visitor;
    this.maxIterations = options.maxIterations || 1_000_000;
    this.checkpointInterval = options.checkpointInterval || 1; // Checkpoint after each iteration
  }

  /**
   * Traverse tree starting from root unit
   *
   * Simple resume: Just pass cursor, completed units, and start iteration.
   * The tree traversal naturally continues from where it left off!
   */
  async traverse(
    rootUnit: Unit,
    resumeCursor?: Cursor,
    resumeCompletedUnits?: Set<string>,
    resumeIteration?: number,
  ): Promise<TraversalResult> {
    let iteration = resumeIteration || 0;
    const completedUnits = resumeCompletedUnits || new Set<string>();
    let totalUnitsExecuted = 0;
    let consecutiveStalls = 0;

    // Initialize traversal state
    let state: TraversalState = {
      cursor: resumeCursor || this.createInitialCursor(rootUnit),
      executionStack: resumeCursor?.breadcrumbs || [
        this.createRootLevel(rootUnit),
      ],
      currentUnit: rootUnit,
      iteration,
      gaps: [],
      completedUnits,
    };

    // If resuming, navigate to cursor position
    if (resumeCursor) {
      state.currentUnit = await this.navigateToCursor(rootUnit, resumeCursor);
    }

    console.log("\n🌳 Starting tree traversal...");
    this.logCursor(state.cursor);

    // Call onEnterUnit for the initial unit
    await this.visitor?.onEnterUnit?.(state.currentUnit, state);

    while (iteration < this.maxIterations) {
      iteration++;
      state.iteration = iteration;

      console.log(`\n${"━".repeat(80)}`);
      console.log(
        `📍 Iteration ${iteration} at: ${this.formatCursorPath(state.cursor)}`,
      );
      console.log(`${"━".repeat(80)}`);

      // Notify visitor
      await this.visitor?.onIteration?.(state);

      // Execute current unit
      const executeResult = await this.executeUnit(state.currentUnit, state);
      totalUnitsExecuted++;

      // Notify about gaps BEFORE fixing (if any were found)
      if (executeResult.gapsBeforeFix.length > 0) {
        await this.visitor?.onGapsDetected?.(
          executeResult.gapsBeforeFix,
          state,
        );
      }

      // Notify about resolved gaps (if any were fixed)
      if (executeResult.resolved > 0) {
        await this.visitor?.onGapsResolved?.(executeResult.resolved, state);
      }

      // Update gaps with remaining gaps after fix attempt
      state.gaps = executeResult.gaps;

      // Check if unit completed
      if (executeResult.completed) {
        completedUnits.add(state.currentUnit.id);
        console.log(`✅ Unit completed: ${state.currentUnit.id}`);
        consecutiveStalls = 0; // Reset stall counter on progress

        await this.visitor?.onExitUnit?.(state.currentUnit, state, true);

        // Checkpoint after completion
        if (iteration % this.checkpointInterval === 0) {
          await this.createCheckpoint(state);
        }

        // Move to next unit in tree
        const nextUnit = await this.getNextUnit(state);
        if (!nextUnit) {
          // Entire tree traversed
          console.log("\n✅ Tree traversal complete - all units processed");
          return {
            success: true,
            totalIterations: iteration,
            totalUnitsExecuted,
            totalUnitsCompleted: completedUnits.size,
            finalState: state,
            terminationReason: "completed",
          };
        }

        // Update cursor to next unit
        state.currentUnit = nextUnit;
        state.cursor = this.updateCursor(state, nextUnit);
        state.executionStack = this.buildExecutionStack(nextUnit);

        await this.visitor?.onEnterUnit?.(nextUnit, state);
        this.logCursor(state.cursor);
      } else {
        // Unit not yet complete, continue fixing gaps
        if (executeResult.resolved > 0) {
          console.log(
            `📝 Resolved ${executeResult.resolved}/${executeResult.gaps.length} gaps`,
          );
          consecutiveStalls = 0; // Reset stall counter on progress
        }

        // Checkpoint periodically
        if (iteration % this.checkpointInterval === 0) {
          await this.createCheckpoint(state);
        }

        // Track consecutive stalls
        if (executeResult.stalled) {
          consecutiveStalls++;
          // Only trigger stall after 3 consecutive iterations with no progress
          // AND if we haven't reached max iterations yet (max iterations takes precedence)
          if (consecutiveStalls >= 3 && iteration < this.maxIterations) {
            console.log("\n⚠️  Traversal stalled - no progress");
            return {
              success: false,
              totalIterations: iteration,
              totalUnitsExecuted,
              totalUnitsCompleted: completedUnits.size,
              finalState: state,
              terminationReason: "stalled",
            };
          }
        } else {
          consecutiveStalls = 0; // Reset if making some progress
        }
      }
    }

    console.log(`\n⚠️  Max iterations (${this.maxIterations}) reached`);
    return {
      success: false,
      totalIterations: iteration,
      totalUnitsExecuted,
      totalUnitsCompleted: completedUnits.size,
      finalState: state,
      terminationReason: "max-iterations",
    };
  }

  /**
   * Execute current unit
   */
  private async executeUnit(
    unit: Unit,
    state: TraversalState,
  ): Promise<{
    gaps: Gap[];
    gapsBeforeFix: Gap[];
    resolved: number;
    completed: boolean;
    stalled: boolean;
  }> {
    // Skip if already completed
    if (state.completedUnits.has(unit.id)) {
      return {
        gaps: [],
        gapsBeforeFix: [],
        resolved: 0,
        completed: true,
        stalled: false,
      };
    }

    // Find gaps
    const gapsBeforeFix = await (unit as any).findGaps();

    if (gapsBeforeFix.length === 0) {
      return {
        gaps: [],
        gapsBeforeFix: [],
        resolved: 0,
        completed: true,
        stalled: false,
      };
    }

    // Try to fix gaps
    const resolved = await (unit as any).fixGaps(gapsBeforeFix);

    // Re-check gaps
    const remainingGaps = await (unit as any).findGaps();

    // Check for stall: no progress made (same or more gaps as before fix, and nothing resolved)
    const stalled =
      remainingGaps.length > 0 &&
      remainingGaps.length >= gapsBeforeFix.length &&
      resolved === 0;

    return {
      gaps: remainingGaps,
      gapsBeforeFix,
      resolved,
      completed: remainingGaps.length === 0,
      stalled,
    };
  }

  /**
   * Get next unit in depth-first traversal
   */
  private async getNextUnit(state: TraversalState): Promise<Unit | null> {
    const current = state.currentUnit;

    // Try to go deeper (children)
    if (current.children && current.children.length > 0) {
      // Check if there are incomplete children
      for (const child of current.children) {
        if (!state.completedUnits.has(child.id)) {
          return child;
        }
      }
    }

    // Try to go to next sibling
    const parent = current.parent;
    if (parent?.children) {
      const currentIndex = parent.children.findIndex(
        (c) => c.id === current.id,
      );
      if (currentIndex !== -1 && currentIndex + 1 < parent.children.length) {
        return parent.children[currentIndex + 1];
      }
    }

    // Go up to parent's next sibling (backtrack)
    let ancestor = parent;
    while (ancestor) {
      const ancestorParent = ancestor.parent;
      if (ancestorParent?.children) {
        const ancestorIndex = ancestorParent.children.findIndex(
          (c) => c.id === ancestor!.id,
        );
        if (
          ancestorIndex !== -1 &&
          ancestorIndex + 1 < ancestorParent.children.length
        ) {
          return ancestorParent.children[ancestorIndex + 1];
        }
      }
      ancestor = ancestorParent;
    }

    // No more units
    return null;
  }

  /**
   * Create initial cursor for root unit
   */
  private createInitialCursor(rootUnit: Unit): Cursor {
    return {
      path: [rootUnit.id],
      breadcrumbs: [this.createRootLevel(rootUnit)],
      depth: 0,
    };
  }

  /**
   * Create root execution level
   */
  private createRootLevel(rootUnit: Unit): ExecutionLevel {
    return {
      id: rootUnit.id,
      type: this.inferUnitType(rootUnit, 0),
      filePath: rootUnit.path,
      depth: 0,
    };
  }

  /**
   * Update cursor for new unit
   */
  private updateCursor(state: TraversalState, nextUnit: Unit): Cursor {
    const stack = this.buildExecutionStack(nextUnit);
    return {
      path: stack.map((level) => level.id),
      breadcrumbs: stack,
      depth: stack.length - 1,
    };
  }

  /**
   * Build execution stack for unit
   */
  private buildExecutionStack(unit: Unit): ExecutionLevel[] {
    const stack: ExecutionLevel[] = [];
    let current: Unit | null = unit;
    let depth = 0;

    // Walk up to root
    while (current) {
      stack.unshift({
        id: current.id,
        type: this.inferUnitType(current, depth),
        filePath: current.path,
        depth,
      });
      current = current.parent;
      depth++;
    }

    // Fix depths (reverse order)
    stack.forEach((level, i) => {
      level.depth = i;
    });

    return stack;
  }

  /**
   * Infer unit type from depth
   */
  private inferUnitType(
    unit: Unit,
    depth: number,
  ): "epic" | "task" | "subtask" {
    if (depth === 0) return "epic";
    if (depth === 1) return "task";
    return "subtask";
  }

  /**
   * Navigate to cursor position
   */
  private async navigateToCursor(
    rootUnit: Unit,
    cursor: Cursor,
  ): Promise<Unit> {
    let current = rootUnit;

    // Follow cursor path
    for (let i = 1; i < cursor.path.length; i++) {
      const targetId = cursor.path[i];

      // Ensure children are discovered
      if (!current.children) {
        current.children = await (current as any).discoverChildren([]);
      }

      // Find child with matching ID
      const child = current.children?.find((c) => c.id === targetId);
      if (!child) {
        console.warn(
          `⚠️  Could not find child ${targetId}, using parent instead`,
        );
        return current;
      }

      current = child;
    }

    return current;
  }

  /**
   * Create checkpoint at current state
   *
   * Philosophy: Store ONLY cursor + execution context.
   * The tree traversal will naturally resume from cursor position.
   * No duplicate tree logic needed!
   */
  private async createCheckpoint(state: TraversalState): Promise<void> {
    // Get root path from first breadcrumb
    const rootPath =
      state.executionStack[0]?.filePath || state.currentUnit.path;

    const checkpoint: Checkpoint = {
      version: 3,
      id: `checkpoint-${state.iteration}`,
      timestamp: new Date().toISOString(),
      cursor: state.cursor,
      context: {
        iteration: state.iteration,
        completedUnits: Array.from(state.completedUnits),
        rootPath,
      },
      metadata: {
        created: new Date().toISOString(),
      },
    };

    await this.visitor?.onCheckpoint?.(checkpoint, state);

    console.log(
      `\n💾 Checkpoint created at: ${this.formatCursorPath(state.cursor)}`,
    );
  }

  /**
   * Log current cursor position
   */
  private logCursor(cursor: Cursor): void {
    console.log(`\n📍 Current position: ${this.formatCursorPath(cursor)}`);
    console.log(`   Depth: ${cursor.depth}`);
  }

  /**
   * Format cursor path for display
   */
  private formatCursorPath(cursor: Cursor): string {
    return cursor.path.join(" → ");
  }
}
