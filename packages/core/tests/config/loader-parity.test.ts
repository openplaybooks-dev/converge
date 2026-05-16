import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildDagFromPlaybook } from '../../src/config/declarative-loader.js';
import { loadPlaybookTasks } from '../../src/config/loader.js';

const FIXTURE = resolve(import.meta.dirname, '../../../cli/tests/fixtures/minimal-playbook');

describe('cross-loader parity', () => {
  // The folder-scan loader (`loadPlaybookTasks`) is being retired in favor
  // of `buildDagFromPlaybook` as the single source of truth. The two no
  // longer parse the same shapes (declarative-loader honors `name:` aliases
  // and other newer conventions). Skipped pending removal of the legacy
  // loader.
  it.skip('produces identical node sets and edge sets', () => {
    // 1. Load via folder-scan
    const treeResult = loadPlaybookTasks(FIXTURE);

    // 2. Load via declarative (requires children: declarations on fixture)
    const dagResult = buildDagFromPlaybook(FIXTURE);

    // 3. Compare node ids
    const treeIds = new Set(treeResult.tasks.map((t: any) => t.id));
    const dagIds = new Set(dagResult.dag.nodes.keys());
    expect(dagIds).toEqual(treeIds);

    // 4. Compare edges (parent → child pairs)
    const treeEdges = new Set<string>();
    for (const task of treeResult.tasks) {
      for (const child of (task as any).children ?? []) {
        treeEdges.add(`${(task as any).id}→${child.id}`);
      }
    }
    const dagEdges = new Set<string>();
    for (const node of dagResult.dag.nodes.values()) {
      for (const childId of node.children) {
        dagEdges.add(`${node.id}→${childId}`);
      }
    }
    expect(dagEdges).toEqual(treeEdges);
  });
});
