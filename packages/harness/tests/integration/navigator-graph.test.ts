/**
 * Integration tests for the Navigator Graph module.
 *
 * Tests the flat graph walker: statelessness, resumability,
 * edge accumulation, condition branching, injection, and convergence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  Graph,
  GraphNode,
  GraphEdge,
  Snapshot,
  WalkResult,
  ActionHandler,
} from '../../src/repair/navigator/types.ts';
import type { Gap } from '../../src/gap/types.ts';
import type { Unit } from '../../src/unit/unit.ts';
import { walkGraph, injectSubgraph, buildNodes } from '../../src/repair/navigator/walker.ts';
import { buildDefaultGraph } from '../../src/repair/navigator/default-graph.ts';
import { evalPredicate } from '../../src/repair/navigator/predicates.ts';
import { GapKind } from '../../src/gap/types.ts';

/* ------------------------------------------------------------------ */
/*  Test helpers                                                       */
/* ------------------------------------------------------------------ */

function makeGap(overrides: Partial<Gap> = {}): Gap {
  return {
    id: 'gap-1',
    type: 'structural',
    level: 'task',
    scope: 'test-task',
    description: 'test gap',
    detected: new Date().toISOString(),
    resolved: false,
    checks: [],
    ...overrides,
  };
}

function makeSnap(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    unit: { id: 'test-unit' } as Unit,
    gaps: [],
    iteration: 1,
    previousGaps: [],
    stallCount: 0,
    projectDir: '/tmp/test',
    epicId: 'test-epic',
    ...overrides,
  };
}

function actionNode(id: string, handler?: string): GraphNode {
  return { id, type: 'action', handler: handler ?? id };
}

function conditionNode(id: string, test?: string): GraphNode {
  return { id, type: 'condition', test: test ?? id };
}

function makeGraph(nodes: GraphNode[], edges: GraphEdge[] = []): Graph {
  return { nodes, edges };
}

/** Create a handler that returns the given result */
function handler(result: Partial<WalkResult> = {}): ActionHandler {
  return async () => ({ action: 'continue', ...result });
}

/** Create a handler that records calls and returns the given result */
function trackedHandler(
  calls: string[],
  name: string,
  result: Partial<WalkResult> = {},
): ActionHandler {
  return async () => {
    calls.push(name);
    return { action: 'continue', ...result };
  };
}

function registry(...entries: [string, ActionHandler][]): Map<string, ActionHandler> {
  return new Map(entries);
}

/* ------------------------------------------------------------------ */
/*  1. Core Walking                                                    */
/* ------------------------------------------------------------------ */

describe('Core Walking', () => {
  it('walks action nodes in order', async () => {
    const calls: string[] = [];
    const graph = makeGraph([
      actionNode('a'),
      actionNode('b'),
      actionNode('c'),
    ]);
    const reg = registry(
      ['a', trackedHandler(calls, 'a')],
      ['b', trackedHandler(calls, 'b')],
      ['c', trackedHandler(calls, 'c')],
    );

    await walkGraph(graph, makeSnap(), reg);

    expect(calls).toEqual(['a', 'b', 'c']);
  });

  it('returns continue with accumulated state when all nodes walked', async () => {
    const graph = makeGraph([actionNode('a')]);
    const gaps = [makeGap()];
    const reg = registry(['a', handler({ gaps })]);

    const result = await walkGraph(graph, makeSnap(), reg);

    expect(result.action).toBe('continue');
    expect(result.gaps).toEqual(gaps);
  });

  it('emits edges for each action executed', async () => {
    const graph = makeGraph([actionNode('a'), actionNode('b')]);
    const reg = registry(
      ['a', handler()],
      ['b', handler()],
    );

    await walkGraph(graph, makeSnap(), reg);

    expect(graph.edges.length).toBeGreaterThanOrEqual(2);
    const edgeTos = graph.edges.map(e => e.to);
    expect(edgeTos).toContain('a');
    expect(edgeTos).toContain('b');
  });

  it('returns bail for unknown handler', async () => {
    const graph = makeGraph([actionNode('unknown')]);
    const reg = registry();

    const result = await walkGraph(graph, makeSnap(), reg);

    expect(result.action).toBe('bail');
    expect(result.reason).toContain('unknown');
  });

  it('returns continue immediately for empty graph', async () => {
    const graph = makeGraph([]);
    const reg = registry();

    const result = await walkGraph(graph, makeSnap(), reg);

    expect(result.action).toBe('continue');
  });
});

/* ------------------------------------------------------------------ */
/*  2. Condition Branching                                             */
/* ------------------------------------------------------------------ */

describe('Condition Branching', () => {
  it('executes paired action when condition is true', async () => {
    const calls: string[] = [];
    const graph = makeGraph([
      conditionNode('noGaps'),
      actionNode('signal-done'),
    ]);
    const reg = registry(
      ['signal-done', trackedHandler(calls, 'signal-done', { action: 'done' })],
    );

    // noGaps is true when gaps array is empty
    const result = await walkGraph(graph, makeSnap({ gaps: [] }), reg);

    expect(calls).toContain('signal-done');
    expect(result.action).toBe('done');
  });

  it('skips paired action when condition is false', async () => {
    const calls: string[] = [];
    const graph = makeGraph([
      conditionNode('noGaps'),
      actionNode('signal-done'),
      actionNode('fallback'),
    ]);
    const reg = registry(
      ['signal-done', trackedHandler(calls, 'signal-done', { action: 'done' })],
      ['fallback', trackedHandler(calls, 'fallback')],
    );

    // noGaps is false when gaps exist
    await walkGraph(graph, makeSnap({ gaps: [makeGap()] }), reg);

    expect(calls).not.toContain('signal-done');
    expect(calls).toContain('fallback');
  });

  it('handles consecutive conditions independently', async () => {
    const calls: string[] = [];
    const blockerGap = makeGap({ metadata: { gapKind: GapKind.plan } });
    const graph = makeGraph([
      conditionNode('noGaps'),
      actionNode('signal-done'),
      conditionNode('hasPlan'),
      actionNode('resolve-plan'),
    ]);
    const reg = registry(
      ['signal-done', trackedHandler(calls, 'signal-done', { action: 'done' })],
      ['resolve-plan', trackedHandler(calls, 'resolve-plan')],
    );

    // noGaps=false (has gaps), hasPlan=true (has plan gap)
    await walkGraph(graph, makeSnap({ gaps: [blockerGap] }), reg);

    expect(calls).not.toContain('signal-done');
    expect(calls).toContain('resolve-plan');
  });

  it('advances past condition with no paired action at end', async () => {
    const calls: string[] = [];
    const graph = makeGraph([
      actionNode('first'),
      conditionNode('noGaps'), // last node, no paired action
    ]);
    const reg = registry(
      ['first', trackedHandler(calls, 'first')],
    );

    const result = await walkGraph(graph, makeSnap({ gaps: [makeGap()] }), reg);

    expect(calls).toEqual(['first']);
    expect(result.action).toBe('continue');
  });
});

/* ------------------------------------------------------------------ */
/*  3. Snapshot Propagation                                            */
/* ------------------------------------------------------------------ */

describe('Snapshot Propagation', () => {
  it('action returning gaps updates snapshot for subsequent nodes', async () => {
    const newGaps = [makeGap({ id: 'new-gap' })];
    let seenGaps: readonly Gap[] = [];

    const graph = makeGraph([
      actionNode('a'),
      actionNode('b'),
    ]);
    const reg = registry(
      ['a', handler({ gaps: newGaps })],
      ['b', async (snap) => {
        seenGaps = snap.gaps;
        return { action: 'continue' };
      }],
    );

    await walkGraph(graph, makeSnap(), reg);

    expect(seenGaps).toEqual(newGaps);
  });

  it('action returning stallCount updates snapshot', async () => {
    let seenStall = -1;

    const graph = makeGraph([
      actionNode('a'),
      actionNode('b'),
    ]);
    const reg = registry(
      ['a', handler({ stallCount: 5 })],
      ['b', async (snap) => {
        seenStall = snap.stallCount;
        return { action: 'continue' };
      }],
    );

    await walkGraph(graph, makeSnap({ stallCount: 0 }), reg);

    expect(seenStall).toBe(5);
  });

  it('multiple actions chain snapshot updates', async () => {
    const gapsA = [makeGap({ id: 'a' })];
    const gapsB = [makeGap({ id: 'a' }), makeGap({ id: 'b' })];
    let finalGaps: readonly Gap[] = [];

    const graph = makeGraph([
      actionNode('a'),
      actionNode('b'),
      actionNode('c'),
    ]);
    const reg = registry(
      ['a', handler({ gaps: gapsA })],
      ['b', handler({ gaps: gapsB })],
      ['c', async (snap) => {
        finalGaps = snap.gaps;
        return { action: 'continue' };
      }],
    );

    await walkGraph(graph, makeSnap(), reg);

    expect(finalGaps).toEqual(gapsB);
  });
});

/* ------------------------------------------------------------------ */
/*  4. Statelessness                                                   */
/* ------------------------------------------------------------------ */

describe('Statelessness', () => {
  it('original snapshot is not mutated after walkGraph', async () => {
    const snap = makeSnap({ gaps: [], stallCount: 0 });
    const graph = makeGraph([actionNode('a')]);
    const reg = registry(
      ['a', handler({ gaps: [makeGap()], stallCount: 3 })],
    );

    await walkGraph(graph, snap, reg);

    // Original snapshot unchanged
    expect(snap.gaps).toEqual([]);
    expect(snap.stallCount).toBe(0);
  });

  it('same inputs produce same results on repeated calls', async () => {
    const snap = makeSnap();
    const graph1 = makeGraph([actionNode('a')]);
    const graph2 = makeGraph([actionNode('a')]);
    const makeReg = () => registry(['a', handler({ gaps: [makeGap()] })]);

    const result1 = await walkGraph(graph1, snap, makeReg());
    const result2 = await walkGraph(graph2, snap, makeReg());

    expect(result1.action).toBe(result2.action);
    expect(result1.gaps?.length).toBe(result2.gaps?.length);
  });
});

/* ------------------------------------------------------------------ */
/*  5. Edge Accumulation                                               */
/* ------------------------------------------------------------------ */

describe('Edge Accumulation', () => {
  it('preserves pre-existing edges', async () => {
    const existingEdge: GraphEdge = {
      from: '_start',
      to: 'old-node',
      iteration: 0,
      ts: new Date().toISOString(),
    };
    const graph = makeGraph([actionNode('a')], [existingEdge]);
    const reg = registry(['a', handler()]);

    await walkGraph(graph, makeSnap(), reg);

    expect(graph.edges).toContainEqual(existingEdge);
    expect(graph.edges.length).toBeGreaterThan(1);
  });

  it('new edges have correct iteration number', async () => {
    const graph = makeGraph([actionNode('a')]);
    const reg = registry(['a', handler()]);
    const iter = 7;

    await walkGraph(graph, makeSnap({ iteration: iter }), reg);

    const newEdges = graph.edges.filter(e => e.to === 'a');
    expect(newEdges.length).toBeGreaterThan(0);
    expect(newEdges[0].iteration).toBe(iter);
  });

  it('condition edges include condition field', async () => {
    const graph = makeGraph([
      conditionNode('noGaps'),
      actionNode('signal-done'),
    ]);
    const reg = registry(
      ['signal-done', handler({ action: 'done' })],
    );

    // noGaps = true (empty gaps)
    await walkGraph(graph, makeSnap({ gaps: [] }), reg);

    const condEdges = graph.edges.filter(e => e.to === 'noGaps');
    expect(condEdges.length).toBeGreaterThan(0);
    expect(condEdges[0].condition).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  6. hasBlocker Nested Block                                         */
/* ------------------------------------------------------------------ */

describe('hasBlocker Nested Block', () => {
  function blockerGraph(calls: string[]): { graph: Graph; reg: Map<string, ActionHandler> } {
    const graph = makeGraph([
      conditionNode('hasBlocker'),
      conditionNode('isFirst'),
      actionNode('resolve-blockers'),
      actionNode('bail-blockers'),
      actionNode('after'),
    ]);
    const reg = registry(
      ['resolve-blockers', trackedHandler(calls, 'resolve-blockers')],
      ['bail-blockers', trackedHandler(calls, 'bail-blockers', { action: 'bail', reason: 'blockers' })],
      ['after', trackedHandler(calls, 'after')],
    );
    return { graph, reg };
  }

  it('hasBlocker(false) skips entire block', async () => {
    const calls: string[] = [];
    const { graph, reg } = blockerGraph(calls);

    // No blocker gaps → hasBlocker = false
    await walkGraph(graph, makeSnap({ gaps: [] }), reg);

    expect(calls).not.toContain('resolve-blockers');
    expect(calls).not.toContain('bail-blockers');
    expect(calls).toContain('after');
  });

  it('hasBlocker(true) + isFirst(true) → resolve-blockers executed', async () => {
    const calls: string[] = [];
    const { graph, reg } = blockerGraph(calls);
    const blockerGap = makeGap({ metadata: { gapKind: GapKind.blocker } });

    // Has blocker + iteration=1 → isFirst=true → resolve-blockers (paired with isFirst)
    // After isFirst block, bail-blockers follows as next standalone node
    await walkGraph(graph, makeSnap({ gaps: [blockerGap], iteration: 1 }), reg);

    expect(calls).toContain('resolve-blockers');
    // resolve-blockers is called before bail-blockers
    expect(calls.indexOf('resolve-blockers')).toBeLessThan(calls.indexOf('bail-blockers'));
  });

  it('hasBlocker(true) + isFirst(false) → bail-blockers', async () => {
    const calls: string[] = [];
    const { graph, reg } = blockerGraph(calls);
    const blockerGap = makeGap({ metadata: { gapKind: GapKind.blocker } });

    // Has blocker + iteration=2 → isFirst=false
    const result = await walkGraph(graph, makeSnap({ gaps: [blockerGap], iteration: 2 }), reg);

    expect(calls).toContain('bail-blockers');
    expect(calls).not.toContain('resolve-blockers');
    expect(result.action).toBe('bail');
  });
});

/* ------------------------------------------------------------------ */
/*  7. injectSubgraph                                                  */
/* ------------------------------------------------------------------ */

describe('injectSubgraph', () => {
  it('inserts nodes after specified node id', () => {
    const graph = makeGraph([
      actionNode('a'),
      actionNode('b'),
    ]);
    const inject = makeGraph([actionNode('x'), actionNode('y')]);

    injectSubgraph(graph, inject, 'a');

    const ids = graph.nodes.map(n => n.id);
    expect(ids).toEqual(['a', 'x', 'y', 'b']);
  });

  it('appends inject edges to graph edges', () => {
    const graph = makeGraph([actionNode('a')]);
    const injectEdge: GraphEdge = {
      from: 'x', to: 'y', iteration: 1, ts: new Date().toISOString(),
    };
    const inject: Graph = { nodes: [actionNode('x')], edges: [injectEdge] };

    injectSubgraph(graph, inject, 'a');

    expect(graph.edges).toContainEqual(injectEdge);
  });

  it('inserts at end if afterNodeId not found', () => {
    const graph = makeGraph([actionNode('a')]);
    const inject = makeGraph([actionNode('x')]);

    injectSubgraph(graph, inject, 'nonexistent');

    const ids = graph.nodes.map(n => n.id);
    expect(ids).toEqual(['a', 'x']);
  });
});

/* ------------------------------------------------------------------ */
/*  8. Injection During Walk                                           */
/* ------------------------------------------------------------------ */

describe('Injection During Walk', () => {
  it('action returning inject walks injected nodes immediately', async () => {
    const calls: string[] = [];
    const graph = makeGraph([
      actionNode('a'),
      actionNode('c'),
    ]);
    const reg = registry(
      ['a', async () => ({
        action: 'continue' as const,
        inject: makeGraph([actionNode('b', 'injected-b')]),
      })],
      ['injected-b', trackedHandler(calls, 'injected-b')],
      ['c', trackedHandler(calls, 'c')],
    );

    await walkGraph(graph, makeSnap(), reg);

    expect(calls).toContain('injected-b');
    expect(calls).toContain('c');
    // injected-b should be called before c
    expect(calls.indexOf('injected-b')).toBeLessThan(calls.indexOf('c'));
  });

  it('injected action returning done stops the walk', async () => {
    const calls: string[] = [];
    const graph = makeGraph([
      actionNode('a'),
      actionNode('c'),
    ]);
    const reg = registry(
      ['a', async () => ({
        action: 'continue' as const,
        inject: makeGraph([actionNode('stopper', 'stopper')]),
      })],
      ['stopper', async () => ({ action: 'done' as const, reason: 'injected done' })],
      ['c', trackedHandler(calls, 'c')],
    );

    const result = await walkGraph(graph, makeSnap(), reg);

    expect(result.action).toBe('done');
    expect(calls).not.toContain('c');
  });

  it('condition-paired action with injection works', async () => {
    const calls: string[] = [];
    const planGap = makeGap({ metadata: { gapKind: GapKind.plan } });
    const graph = makeGraph([
      conditionNode('hasPlan'),
      actionNode('repair'),
      actionNode('after'),
    ]);
    const reg = registry(
      ['repair', async () => ({
        action: 'continue' as const,
        inject: makeGraph([actionNode('fix', 'fix')]),
      })],
      ['fix', trackedHandler(calls, 'fix')],
      ['after', trackedHandler(calls, 'after')],
    );

    await walkGraph(graph, makeSnap({ gaps: [planGap] }), reg);

    expect(calls).toContain('fix');
    expect(calls).toContain('after');
  });
});

/* ------------------------------------------------------------------ */
/*  9. Terminal Conditions                                             */
/* ------------------------------------------------------------------ */

describe('Terminal Conditions', () => {
  it('done stops walk and emits edge to _end', async () => {
    const graph = makeGraph([
      actionNode('a'),
      actionNode('b'),
    ]);
    const calls: string[] = [];
    const reg = registry(
      ['a', async () => ({ action: 'done' as const, reason: 'finished' })],
      ['b', trackedHandler(calls, 'b')],
    );

    const result = await walkGraph(graph, makeSnap(), reg);

    expect(result.action).toBe('done');
    expect(calls).not.toContain('b');
    const endEdge = graph.edges.find(e => e.to === '_end');
    expect(endEdge).toBeDefined();
  });

  it('bail stops walk and emits edge to _end', async () => {
    const graph = makeGraph([actionNode('a')]);
    const reg = registry(
      ['a', async () => ({ action: 'bail' as const, reason: 'fatal' })],
    );

    const result = await walkGraph(graph, makeSnap(), reg);

    expect(result.action).toBe('bail');
    const endEdge = graph.edges.find(e => e.to === '_end');
    expect(endEdge).toBeDefined();
  });

  it('bail with reason propagates reason in result', async () => {
    const graph = makeGraph([actionNode('a')]);
    const reg = registry(
      ['a', async () => ({ action: 'bail' as const, reason: 'something broke' })],
    );

    const result = await walkGraph(graph, makeSnap(), reg);

    expect(result.reason).toBe('something broke');
  });

  it('done from injected node stops entire walk', async () => {
    const calls: string[] = [];
    const graph = makeGraph([
      actionNode('a'),
      actionNode('c'),
    ]);
    const reg = registry(
      ['a', async () => ({
        action: 'continue' as const,
        inject: makeGraph([actionNode('doner', 'doner')]),
      })],
      ['doner', async () => ({ action: 'done' as const })],
      ['c', trackedHandler(calls, 'c')],
    );

    const result = await walkGraph(graph, makeSnap(), reg);

    expect(result.action).toBe('done');
    expect(calls).not.toContain('c');
  });
});

/* ------------------------------------------------------------------ */
/*  10. buildDefaultGraph                                              */
/* ------------------------------------------------------------------ */

describe('buildDefaultGraph', () => {
  it('returns 26 nodes', () => {
    const graph = buildDefaultGraph();
    expect(graph.nodes.length).toBe(26);
  });

  it('has no edges in initial graph', () => {
    const graph = buildDefaultGraph();
    // buildDefaultGraph returns { nodes } without edges
    expect((graph as any).edges).toBeUndefined();
  });

  it('all condition nodes have type condition', () => {
    const graph = buildDefaultGraph();
    const conditions = graph.nodes.filter(n => n.type === 'condition');
    expect(conditions.length).toBeGreaterThan(0);
    for (const c of conditions) {
      expect(c.type).toBe('condition');
      expect(c.test).toBeDefined();
    }
  });

  it('all action nodes have type action', () => {
    const graph = buildDefaultGraph();
    const actions = graph.nodes.filter(n => n.type === 'action');
    expect(actions.length).toBeGreaterThan(0);
    for (const a of actions) {
      expect(a.type).toBe('action');
      expect(a.handler).toBeDefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/*  11. evalPredicate                                                  */
/* ------------------------------------------------------------------ */

describe('evalPredicate', () => {
  it('noGaps is true when gaps empty', () => {
    expect(evalPredicate('noGaps', makeSnap({ gaps: [] }))).toBe(true);
  });

  it('noGaps is false when gaps present', () => {
    expect(evalPredicate('noGaps', makeSnap({ gaps: [makeGap()] }))).toBe(false);
  });

  it('isFirst is true when iteration === 1', () => {
    expect(evalPredicate('isFirst', makeSnap({ iteration: 1 }))).toBe(true);
  });

  it('isFirst is false when iteration > 1', () => {
    expect(evalPredicate('isFirst', makeSnap({ iteration: 2 }))).toBe(false);
  });

  it('hasBlocker detects blocker gap kind', () => {
    const gap = makeGap({ metadata: { gapKind: GapKind.blocker } });
    expect(evalPredicate('hasBlocker', makeSnap({ gaps: [gap] }))).toBe(true);
  });

  it('hasRepairableGap detects output/checkFailed/corrupted', () => {
    const outputGap = makeGap({ metadata: { gapKind: GapKind.output } });
    expect(evalPredicate('hasRepairableGap', makeSnap({ gaps: [outputGap] }))).toBe(true);

    const checkGap = makeGap({ metadata: { gapKind: GapKind.checkFailed } });
    expect(evalPredicate('hasRepairableGap', makeSnap({ gaps: [checkGap] }))).toBe(true);

    const corruptedGap = makeGap({ metadata: { gapKind: GapKind.corrupted } });
    expect(evalPredicate('hasRepairableGap', makeSnap({ gaps: [corruptedGap] }))).toBe(true);
  });

  it('last-succeeded reads lastActionSucceeded', () => {
    expect(evalPredicate('last-succeeded', makeSnap({ lastActionSucceeded: true }))).toBe(true);
    expect(evalPredicate('last-succeeded', makeSnap({ lastActionSucceeded: false }))).toBe(false);
  });

  it('unknown predicate returns false', () => {
    expect(evalPredicate('nonexistent-predicate', makeSnap())).toBe(false);
  });

  it('hasPlan detects plan gap kind', () => {
    const gap = makeGap({ metadata: { gapKind: GapKind.plan } });
    expect(evalPredicate('hasPlan', makeSnap({ gaps: [gap] }))).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  12. TaskContext Persistence                                        */
/* ------------------------------------------------------------------ */

describe('TaskContext Persistence', () => {
  // TaskContext needs a real journal structure, so we mock it minimally
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'navigator-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // We can't easily construct a TaskContext without the journal structure,
  // so we test the WalkerState serialization format directly.
  it('WalkerState round-trips through JSON', async () => {
    const { writeFile: wf } = await import('node:fs/promises');

    const state = {
      iteration: 3,
      stallCount: 1,
      nodes: [
        { id: 'detect-gaps', type: 'action' as const, handler: 'detect-gaps' },
        { id: 'noGaps', type: 'condition' as const, test: 'noGaps' },
      ],
      edges: [
        { from: '_start', to: 'detect-gaps', iteration: 1, ts: '2026-01-01T00:00:00Z' },
        { from: 'detect-gaps', to: 'noGaps', iteration: 1, ts: '2026-01-01T00:00:01Z' },
      ],
    };

    const filePath = join(tmpDir, 'convergence.json');
    await wf(filePath, JSON.stringify(state, null, 2));

    const raw = JSON.parse(await readFile(filePath, 'utf-8'));
    expect(raw.iteration).toBe(3);
    expect(raw.stallCount).toBe(1);
    expect(raw.nodes).toHaveLength(2);
    expect(raw.edges).toHaveLength(2);
    expect(raw.nodes[0].id).toBe('detect-gaps');
    expect(raw.edges[0].from).toBe('_start');
  });

  it('WalkerState preserves node results through serialization', async () => {
    const { writeFile: wf } = await import('node:fs/promises');

    const state = {
      iteration: 1,
      stallCount: 0,
      nodes: [
        {
          id: 'repair-loop',
          type: 'action' as const,
          handler: 'repair-loop',
          result: { selectedStrategy: 'task-run', gapCount: 2 },
        },
      ],
      edges: [],
    };

    const filePath = join(tmpDir, 'convergence.json');
    await wf(filePath, JSON.stringify(state, null, 2));
    const raw = JSON.parse(await readFile(filePath, 'utf-8'));

    expect(raw.nodes[0].result).toEqual({ selectedStrategy: 'task-run', gapCount: 2 });
  });
});

/* ------------------------------------------------------------------ */
/*  13. Convergence Loop                                               */
/* ------------------------------------------------------------------ */

describe('Convergence Loop', () => {
  it('repeated walks until done (simulating run.ts loop)', async () => {
    // Simulate: iteration 1 has gaps, iteration 2 resolves them
    let callCount = 0;

    const buildGraphAndReg = () => {
      const graph: Graph = {
        nodes: [
          actionNode('detect'),
          conditionNode('noGaps'),
          actionNode('signal-done'),
          actionNode('fix'),
        ],
        edges: [],
      };

      const reg = registry(
        ['detect', async () => {
          callCount++;
          if (callCount >= 2) {
            return { action: 'continue' as const, gaps: [] };
          }
          return { action: 'continue' as const, gaps: [makeGap()] };
        }],
        ['signal-done', async () => ({ action: 'done' as const, success: true })],
        ['fix', handler()],
      );

      return { graph, reg };
    };

    // Iteration 1: has gaps → fix → continue
    const { graph: g1, reg: r1 } = buildGraphAndReg();
    let snap = makeSnap({ iteration: 1 });
    let result = await walkGraph(g1, snap, r1);
    expect(result.action).toBe('continue');

    // Iteration 2: no gaps → signal-done
    const { graph: g2, reg: r2 } = buildGraphAndReg();
    snap = makeSnap({ iteration: 2, gaps: result.gaps ?? [] });
    result = await walkGraph(g2, snap, r2);
    expect(result.action).toBe('done');
  });

  it('edges accumulate across iterations when graph is reused', async () => {
    const graph: Graph = { nodes: [actionNode('a')], edges: [] };
    const reg = registry(['a', handler()]);

    // Walk iteration 1
    await walkGraph(graph, makeSnap({ iteration: 1 }), reg);
    const edgesAfter1 = graph.edges.length;

    // Walk iteration 2 with same graph (edges persist)
    await walkGraph(graph, makeSnap({ iteration: 2 }), reg);
    const edgesAfter2 = graph.edges.length;

    expect(edgesAfter2).toBeGreaterThan(edgesAfter1);

    // Both iterations present
    const iters = new Set(graph.edges.map(e => e.iteration));
    expect(iters.has(1)).toBe(true);
    expect(iters.has(2)).toBe(true);
  });

  it('injected nodes persist in the graph after walk', async () => {
    const graph: Graph = { nodes: [actionNode('a')], edges: [] };
    const reg = registry(
      ['a', async () => ({
        action: 'continue' as const,
        inject: makeGraph([actionNode('injected')]),
      })],
      ['injected', handler()],
    );

    await walkGraph(graph, makeSnap(), reg);

    const ids = graph.nodes.map(n => n.id);
    expect(ids).toContain('injected');
  });

  it('injected nodes survive save/load cycle', async () => {
    const graph: Graph = { nodes: [actionNode('a')], edges: [] };
    const reg = registry(
      ['a', async () => ({
        action: 'continue' as const,
        inject: makeGraph([actionNode('injected')]),
      })],
      ['injected', handler()],
    );

    await walkGraph(graph, makeSnap(), reg);

    // Simulate save/load
    const serialized = JSON.stringify({ iteration: 1, stallCount: 0, nodes: graph.nodes, edges: graph.edges });
    const loaded = JSON.parse(serialized);

    expect(loaded.nodes.map((n: GraphNode) => n.id)).toContain('injected');
    expect(loaded.edges.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  14. buildNodes                                                     */
/* ------------------------------------------------------------------ */

describe('buildNodes', () => {
  function makeUnit(overrides: Partial<Unit> = {}): Unit {
    return {
      id: 'test',
      path: '/tmp/test',
      config: { maxIterations: 10 },
      parent: null,
      sortIndex: [1],
      ...overrides,
    } as Unit;
  }

  it('minimal unit produces base node set', () => {
    const nodes = buildNodes(makeUnit());
    const ids = nodes.map(n => n.id);

    // Must have core nodes
    expect(ids).toContain('detect-gaps');
    expect(ids).toContain('noGaps');
    expect(ids).toContain('signal-done');
    expect(ids).toContain('verify');
    expect(ids).toContain('check-stall');
    expect(ids).toContain('advance-attempt');
  });

  it('unit with planConfig includes plan nodes', () => {
    const nodes = buildNodes(makeUnit({ planConfig: {} as any }));
    const ids = nodes.map(n => n.id);

    expect(ids).toContain('hasPlan');
    expect(ids).toContain('resolve-plan');
  });

  it('unit with wbsFn includes wbs-related nodes', () => {
    const nodes = buildNodes(makeUnit({ wbsFn: (() => {}) as any }));
    const ids = nodes.map(n => n.id);

    expect(ids).toContain('hasWbs');
    expect(ids).toContain('resolve-wbs');
    expect(ids).toContain('hasSystemic');
    expect(ids).toContain('strategy-wbs-generator-repair');
    expect(ids).toContain('hasWbsScript');
    expect(ids).toContain('strategy-wbs-script-repair');
  });

  it('unit with outputs includes repair nodes', () => {
    const nodes = buildNodes(makeUnit({ outputs: ['file.txt'] }));
    const ids = nodes.map(n => n.id);

    expect(ids).toContain('hasRepairableGap');
    expect(ids).toContain('repair-loop');
  });
});
