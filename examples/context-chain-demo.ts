/**
 * Demo: Native Tree Traversal with Unit Context Chain
 *
 * This demonstrates the new context-based operations:
 * 1. Unit stores TaskContext with parent chain
 * 2. walkAncestorContexts() for native tree traversal
 * 3. Parent facts accessible via context chain
 *
 * Run with: tsx examples/context-chain-demo.ts
 */

import { Unit } from '../packages/harness/src/unit/unit.ts';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

async function demo() {
  const demoDir = path.join(process.cwd(), 'demo-output');
  const projectDir = path.join(demoDir, 'project');

  console.log('🚀 Context Chain Demo\n');

  try {
    // Setup: Create task hierarchy
    console.log('1. Creating task hierarchy...');
    const epicPath = path.join(projectDir, '.harness/epics/demo-epic');
    const parentPath = path.join(epicPath, '001-parent-task');
    const childPath = path.join(parentPath, 'tasks/001-001-child-task');
    const grandchildPath = path.join(childPath, 'tasks/001-001-001-grandchild');

    await mkdir(parentPath, { recursive: true });
    await mkdir(childPath, { recursive: true });
    await mkdir(grandchildPath, { recursive: true });

    await writeFile(
      path.join(parentPath, 'task.ts'),
      `export default { id: '001-parent-task', title: 'Parent Task', description: 'Top-level task' };`
    );
    await writeFile(
      path.join(childPath, 'task.ts'),
      `export default { id: '001-001-child-task', title: 'Child Task', description: 'Subtask of parent' };`
    );
    await writeFile(
      path.join(grandchildPath, 'task.ts'),
      `export default { id: '001-001-001-grandchild', title: 'Grandchild Task', description: 'Subtask of child' };`
    );

    console.log('   ✅ Created parent → child → grandchild hierarchy\n');

    // Load Units with parent chain
    console.log('2. Loading Units with parent chain...');
    const parentUnit = await Unit.fromPath(path.join(parentPath, 'task.ts'));
    const childUnit = await Unit.fromPath(path.join(childPath, 'task.ts'), parentUnit);
    const grandchildUnit = await Unit.fromPath(path.join(grandchildPath, 'task.ts'), childUnit);

    console.log('   ✅ Units loaded with context chain\n');

    // Demonstrate context properties
    console.log('3. Context properties:');
    console.log(`   Parent context:`);
    console.log(`     - epicId: ${parentUnit.context?.epicId}`);
    console.log(`     - taskId: ${parentUnit.context?.taskId}`);
    console.log(`     - fullTaskId: ${parentUnit.context?.fullTaskId}`);
    console.log(`     - parent: ${parentUnit.context?.parent ? 'yes' : 'no'}`);

    console.log(`\n   Child context:`);
    console.log(`     - epicId: ${childUnit.context?.epicId}`);
    console.log(`     - taskId: ${childUnit.context?.taskId}`);
    console.log(`     - fullTaskId: ${childUnit.context?.fullTaskId}`);
    console.log(`     - parentTaskId: ${childUnit.context?.parentTaskId}`);
    console.log(`     - parent: ${childUnit.context?.parent ? 'yes' : 'no'}`);

    console.log(`\n   Grandchild context:`);
    console.log(`     - epicId: ${grandchildUnit.context?.epicId}`);
    console.log(`     - taskId: ${grandchildUnit.context?.taskId}`);
    console.log(`     - fullTaskId: ${grandchildUnit.context?.fullTaskId}`);
    console.log(`     - parentTaskId: ${grandchildUnit.context?.parentTaskId}`);
    console.log(`     - parent: ${grandchildUnit.context?.parent ? 'yes' : 'no'}\n`);

    // Demonstrate native tree traversal
    console.log('4. Native tree traversal (walkAncestorContexts):');
    console.log('   Grandchild ancestors:');
    let depth = 1;
    for (const ancestorCtx of grandchildUnit.walkAncestorContexts()) {
      console.log(`     ${depth}. ${ancestorCtx.taskId} (${ancestorCtx.fullTaskId})`);
      depth++;
    }
    console.log('');

    // Compare: OLD vs NEW approach
    console.log('5. Comparison: String-based vs Context-based\n');

    console.log('   ❌ OLD (string parsing):');
    console.log('      const segments = journalTaskId.split("/");');
    console.log('      for (let i = 1; i < segments.length; i++) {');
    console.log('        const ancestorId = segments.slice(0, i).join("/");');
    console.log('        // ... complex path reconstruction ...');
    console.log('      }');

    console.log('\n   ✅ NEW (native traversal):');
    console.log('      for (const ancestorCtx of unit.walkAncestorContexts()) {');
    console.log('        const statusFile = path.join(ancestorCtx.journalPath, "status.json");');
    console.log('        // Direct access to all ancestor properties!');
    console.log('      }');

    console.log('\n6. Benefits:');
    console.log('   ✅ No string parsing');
    console.log('   ✅ Type-safe parent references');
    console.log('   ✅ O(n) instead of O(n²) complexity');
    console.log('   ✅ Direct access to parent facts');
    console.log('   ✅ Simpler, more maintainable code\n');

    // Create parent facts to demonstrate parent facts access
    console.log('7. Parent facts access:');
    const parentJournalPath = path.join(
      projectDir,
      '.harness/journal/epics/demo-epic/001-parent-task/attempts/wip/logs'
    );
    await mkdir(parentJournalPath, { recursive: true });
    await writeFile(
      path.join(parentJournalPath, 'facts.jsonl'),
      `{"id":"parent-fact-1","value":"data from parent"}\n` +
      `{"id":"parent-fact-2","value":42}\n`
    );

    console.log(`   ✅ Created parent facts at:`);
    console.log(`      ${parentJournalPath}/facts.jsonl`);
    console.log(`\n   Child can now access parent facts via:`);
    console.log(`      const parentFactsPath = childUnit.context.parent.journalPath + "/attempts/wip/logs/facts.jsonl"`);
    console.log(`\n   This was the TODO that's now fixed! 🎉\n`);

  } finally {
    // Cleanup
    if (existsSync(demoDir)) {
      await rm(demoDir, { recursive: true, force: true });
      console.log('✨ Cleanup complete');
    }
  }
}

demo().catch(console.error);
