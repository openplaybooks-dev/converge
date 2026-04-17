/**
 * Tree Traversal Tests
 *
 * Tests for the tree-based execution model with cursor tracking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeTraversal, type TraversalVisitor, type TraversalState } from '../../../src/tree/traversal.ts';
import type { Unit } from '../../../src/unit.ts';
import type { Cursor, Checkpoint } from '../../../src/storage/types.ts';

// Mock Unit class
class MockUnit implements Partial<Unit> {
  id: string;
  title?: string;
  path: string;
  parent: MockUnit | null = null;
  children?: MockUnit[];
  gaps: any[] = [];
  private gapCount: number;

  constructor(id: string, gapCount: number = 0, path: string = '') {
    this.id = id;
    this.title = id;
    this.path = path || `.converge/${id}`;
    this.gapCount = gapCount;
  }

  async findGaps() {
    return this.gaps.length > 0 ? this.gaps : Array(this.gapCount).fill({ type: 'incomplete', description: 'test gap' });
  }

  async fixGaps(gaps: any[]) {
    this.gaps = [];
    this.gapCount = 0; // Clear gap count so findGaps() returns no gaps after fix
    return gaps.length;
  }

  async discoverChildren() {
    return this.children || [];
  }

  getProjectRoot() {
    return '/test/project';
  }
}

describe('Tree Traversal', () => {
  describe('Basic Traversal', () => {
    it('should traverse a simple tree', async () => {
      // Create tree: root -> child1, child2
      const root = new MockUnit('root', 1);
      const child1 = new MockUnit('child1', 1);
      const child2 = new MockUnit('child2', 1);

      child1.parent = root as any;
      child2.parent = root as any;
      root.children = [child1 as any, child2 as any];

      const visited: string[] = [];
      const visitor: TraversalVisitor = {
        onEnterUnit: async (unit) => {
          visited.push(unit.id);
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 10 });
      const result = await traversal.traverse(root as any);

      expect(result.success).toBe(true);
      expect(visited).toContain('root');
      expect(visited).toContain('child1');
      expect(visited).toContain('child2');
    });

    it('should handle nested tree (depth > 2)', async () => {
      // Create tree: root -> task -> subtask1, subtask2
      const root = new MockUnit('root', 1);
      const task = new MockUnit('task', 1);
      const subtask1 = new MockUnit('subtask1', 1);
      const subtask2 = new MockUnit('subtask2', 1);

      task.parent = root as any;
      subtask1.parent = task as any;
      subtask2.parent = task as any;

      task.children = [subtask1 as any, subtask2 as any];
      root.children = [task as any];

      const visited: string[] = [];
      const visitor: TraversalVisitor = {
        onEnterUnit: async (unit) => {
          visited.push(unit.id);
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 20 });
      const result = await traversal.traverse(root as any);

      expect(result.success).toBe(true);
      expect(visited).toEqual(['root', 'task', 'subtask1', 'subtask2']);
    });

    it('should track completed units', async () => {
      const root = new MockUnit('root', 1);
      const child1 = new MockUnit('child1', 1);
      const child2 = new MockUnit('child2', 1);

      child1.parent = root as any;
      child2.parent = root as any;
      root.children = [child1 as any, child2 as any];

      const completedUnits: string[] = [];
      const visitor: TraversalVisitor = {
        onExitUnit: async (unit, state, success) => {
          if (success) {
            completedUnits.push(unit.id);
          }
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 10 });
      const result = await traversal.traverse(root as any);

      expect(result.success).toBe(true);
      expect(completedUnits).toContain('child1');
      expect(completedUnits).toContain('child2');
      expect(completedUnits).toContain('root');
    });
  });

  describe('Cursor Tracking', () => {
    it('should create cursor at root initially', async () => {
      const root = new MockUnit('root', 1);

      let initialCursor: Cursor | undefined;
      const visitor: TraversalVisitor = {
        onIteration: async (state) => {
          if (state.iteration === 1 && !initialCursor) {
            initialCursor = state.cursor;
          }
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 5 });
      await traversal.traverse(root as any);

      expect(initialCursor).toBeDefined();
      expect(initialCursor?.path).toEqual(['root']);
      expect(initialCursor?.depth).toBe(0);
    });

    it('should update cursor as traversal progresses', async () => {
      const root = new MockUnit('root', 1);
      const child1 = new MockUnit('child1', 1);
      const child2 = new MockUnit('child2', 1);

      child1.parent = root as any;
      child2.parent = root as any;
      root.children = [child1 as any, child2 as any];

      const cursors: Cursor[] = [];
      const visitor: TraversalVisitor = {
        onCheckpoint: async (checkpoint, state) => {
          cursors.push(state.cursor);
        },
      };

      const traversal = new TreeTraversal({
        visitor,
        maxIterations: 10,
        checkpointInterval: 1
      });
      await traversal.traverse(root as any);

      expect(cursors.length).toBeGreaterThan(0);
      // Should see progression through tree
      const paths = cursors.map(c => c.path.join(' → '));
      expect(paths.some(p => p.includes('child1'))).toBe(true);
    });

    it('should maintain breadcrumbs in cursor', async () => {
      const root = new MockUnit('root', 1, '.converge/root');
      const task = new MockUnit('task', 1, '.converge/task');
      const subtask = new MockUnit('subtask', 1, '.converge/subtask');

      task.parent = root as any;
      subtask.parent = task as any;
      task.children = [subtask as any];
      root.children = [task as any];

      let deepestCursor: Cursor | undefined;
      const visitor: TraversalVisitor = {
        onCheckpoint: async (checkpoint, state) => {
          if (!deepestCursor || state.cursor.depth > deepestCursor.depth) {
            deepestCursor = state.cursor;
          }
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 20 });
      await traversal.traverse(root as any);

      expect(deepestCursor).toBeDefined();
      expect(deepestCursor?.breadcrumbs).toHaveLength(3);
      expect(deepestCursor?.breadcrumbs[0].id).toBe('root');
      expect(deepestCursor?.breadcrumbs[1].id).toBe('task');
      expect(deepestCursor?.breadcrumbs[2].id).toBe('subtask');
    });
  });

  describe('Checkpoint Creation', () => {
    it('should create checkpoints at specified intervals', async () => {
      const root = new MockUnit('root', 1);
      const child = new MockUnit('child', 1);
      child.parent = root as any;
      root.children = [child as any];

      const checkpoints: Checkpoint[] = [];
      const visitor: TraversalVisitor = {
        onCheckpoint: async (checkpoint) => {
          checkpoints.push(checkpoint);
        },
      };

      const traversal = new TreeTraversal({
        visitor,
        maxIterations: 5,
        checkpointInterval: 1
      });
      await traversal.traverse(root as any);

      expect(checkpoints.length).toBeGreaterThan(0);
      expect(checkpoints[0].version).toBe(3);
      expect(checkpoints[0].cursor).toBeDefined();
      expect(checkpoints[0].context).toBeDefined();
    });

    it('should include execution context in checkpoint', async () => {
      const root = new MockUnit('root', 1, '.converge/root');
      const child = new MockUnit('child', 1);
      child.parent = root as any;
      root.children = [child as any];

      let lastCheckpoint: Checkpoint | undefined;
      const visitor: TraversalVisitor = {
        onCheckpoint: async (checkpoint) => {
          lastCheckpoint = checkpoint;
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 5 });
      await traversal.traverse(root as any);

      expect(lastCheckpoint).toBeDefined();
      expect(lastCheckpoint?.context.iteration).toBeGreaterThan(0);
      expect(lastCheckpoint?.context.rootPath).toBe('.converge/root');
      expect(Array.isArray(lastCheckpoint?.context.completedUnits)).toBe(true);
    });

    it('should not duplicate tree structure in checkpoint', async () => {
      const root = new MockUnit('root', 1);

      let checkpoint: Checkpoint | undefined;
      const visitor: TraversalVisitor = {
        onCheckpoint: async (cp) => {
          checkpoint = cp;
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 3 });
      await traversal.traverse(root as any);

      expect(checkpoint).toBeDefined();
      // V3 checkpoints should NOT have these fields
      expect((checkpoint as any).completionTree).toBeUndefined();
      expect((checkpoint as any).treeSnapshot).toBeUndefined();
      expect((checkpoint as any).gaps).toBeUndefined();
      expect((checkpoint as any).completed).toBeUndefined();
    });
  });

  describe('Resume from Checkpoint', () => {
    it('should resume from cursor position', async () => {
      const root = new MockUnit('root', 1);
      const child1 = new MockUnit('child1', 1);
      const child2 = new MockUnit('child2', 1);

      child1.parent = root as any;
      child2.parent = root as any;
      root.children = [child1 as any, child2 as any];

      // Simulate resume at child2
      const resumeCursor: Cursor = {
        path: ['root', 'child2'],
        breadcrumbs: [
          { id: 'root', type: 'epic', filePath: '.converge/root', depth: 0 },
          { id: 'child2', type: 'task', filePath: '.converge/child2', depth: 1 },
        ],
        depth: 1,
      };

      const visited: string[] = [];
      const visitor: TraversalVisitor = {
        onEnterUnit: async (unit) => {
          visited.push(unit.id);
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 5 });
      const result = await traversal.traverse(root as any, resumeCursor);

      expect(result.success).toBe(true);
      // Should start at child2, not child1
      expect(visited[0]).toBe('child2');
    });

    it('should skip completed units on resume', async () => {
      const root = new MockUnit('root', 1);
      const child1 = new MockUnit('child1', 1);
      const child2 = new MockUnit('child2', 1);

      child1.parent = root as any;
      child2.parent = root as any;
      root.children = [child1 as any, child2 as any];

      const completedUnits = new Set(['child1']);
      const visited: string[] = [];
      const visitor: TraversalVisitor = {
        onEnterUnit: async (unit) => {
          visited.push(unit.id);
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 10 });
      const result = await traversal.traverse(
        root as any,
        undefined,
        completedUnits,
        0
      );

      expect(result.success).toBe(true);
      // Should execute root and child2, but skip child1
      expect(visited).toContain('root');
      expect(visited).toContain('child2');
      expect(visited.filter(id => id === 'child1').length).toBe(0);
    });

    it('should continue from iteration on resume', async () => {
      const root = new MockUnit('root', 1);

      const visitor: TraversalVisitor = {};
      const traversal = new TreeTraversal({ visitor, maxIterations: 10 });

      const result = await traversal.traverse(
        root as any,
        undefined,
        new Set(),
        5  // Start from iteration 5
      );

      expect(result.totalIterations).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Visitor Callbacks', () => {
    it('should call onEnterUnit when entering a unit', async () => {
      const root = new MockUnit('root', 1);

      const entered: string[] = [];
      const visitor: TraversalVisitor = {
        onEnterUnit: async (unit) => {
          entered.push(unit.id);
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 5 });
      await traversal.traverse(root as any);

      expect(entered).toContain('root');
    });

    it('should call onExitUnit when exiting a unit', async () => {
      const root = new MockUnit('root', 1);

      const exited: Array<{ id: string; success: boolean }> = [];
      const visitor: TraversalVisitor = {
        onExitUnit: async (unit, state, success) => {
          exited.push({ id: unit.id, success });
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 5 });
      await traversal.traverse(root as any);

      expect(exited.length).toBeGreaterThan(0);
      expect(exited[0].id).toBe('root');
    });

    it('should call onIteration on each iteration', async () => {
      const root = new MockUnit('root', 3); // 3 gaps = 3 iterations minimum

      const iterations: number[] = [];
      const visitor: TraversalVisitor = {
        onIteration: async (state) => {
          iterations.push(state.iteration);
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 5 });
      await traversal.traverse(root as any);

      expect(iterations.length).toBeGreaterThan(0);
      expect(iterations[0]).toBe(1);
      expect(iterations[iterations.length - 1]).toBeLessThanOrEqual(5);
    });

    it('should call onGapsDetected when gaps are found', async () => {
      const root = new MockUnit('root', 2);
      root.gaps = [
        { type: 'incomplete', description: 'gap1' },
        { type: 'incomplete', description: 'gap2' },
      ];

      const gapEvents: number[] = [];
      const visitor: TraversalVisitor = {
        onGapsDetected: async (gaps) => {
          gapEvents.push(gaps.length);
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 3 });
      await traversal.traverse(root as any);

      expect(gapEvents.length).toBeGreaterThan(0);
      expect(gapEvents[0]).toBe(2);
    });

    it('should call onGapsResolved when gaps are fixed', async () => {
      const root = new MockUnit('root', 2);

      const resolved: number[] = [];
      const visitor: TraversalVisitor = {
        onGapsResolved: async (count) => {
          resolved.push(count);
        },
      };

      const traversal = new TreeTraversal({ visitor, maxIterations: 5 });
      await traversal.traverse(root as any);

      expect(resolved.length).toBeGreaterThan(0);
      expect(resolved.some(r => r > 0)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tree (no children)', async () => {
      const root = new MockUnit('root', 1);
      root.children = [];

      const traversal = new TreeTraversal({ maxIterations: 5 });
      const result = await traversal.traverse(root as any);

      expect(result.success).toBe(true);
      expect(result.totalUnitsExecuted).toBe(1);
    });

    it('should handle unit with no gaps', async () => {
      const root = new MockUnit('root', 0);

      const traversal = new TreeTraversal({ maxIterations: 5 });
      const result = await traversal.traverse(root as any);

      expect(result.success).toBe(true);
      expect(result.terminationReason).toBe('completed');
    });

    it('should stop at max iterations', async () => {
      const root = new MockUnit('root', 999); // Many gaps
      root.fixGaps = async () => 0; // Never fix gaps

      const traversal = new TreeTraversal({ maxIterations: 3 });
      const result = await traversal.traverse(root as any);

      expect(result.success).toBe(false);
      expect(result.terminationReason).toBe('max-iterations');
      expect(result.totalIterations).toBe(3);
    });

    it('should detect stalled execution', async () => {
      const root = new MockUnit('root', 2);
      root.gaps = [
        { type: 'incomplete', description: 'stuck gap' }
      ];
      root.fixGaps = async () => 0; // Can't fix gaps

      const traversal = new TreeTraversal({ maxIterations: 10 });
      const result = await traversal.traverse(root as any);

      expect(result.success).toBe(false);
      expect(result.terminationReason).toBe('stalled');
    });

    it('should handle deep nesting (depth > 5)', async () => {
      // Create deep tree: root -> l1 -> l2 -> l3 -> l4 -> l5
      let current = new MockUnit('root', 1);
      const root = current;

      for (let i = 1; i <= 5; i++) {
        const child = new MockUnit(`level${i}`, 1);
        child.parent = current as any;
        current.children = [child as any];
        current = child;
      }

      const visitor: TraversalVisitor = {};
      const traversal = new TreeTraversal({ visitor, maxIterations: 30 });
      const result = await traversal.traverse(root as any);

      expect(result.success).toBe(true);
      expect(result.totalUnitsExecuted).toBeGreaterThanOrEqual(6);
    });
  });
});
