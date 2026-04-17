/**
 * Tests for Unit context chain and native tree traversal.
 *
 * Verifies:
 * 1. Unit.context is created with parent chain
 * 2. walkAncestorContexts() yields correct ancestors
 * 3. Parent facts can be loaded via context chain
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Unit } from '../../src/unit/unit.ts';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

describe('Unit Context Chain', () => {
  const testDir = path.join(process.cwd(), 'test-output', 'context-chain');
  const projectDir = path.join(testDir, 'project');

  beforeEach(async () => {
    // Create test directory structure
    await mkdir(projectDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should create Unit with context and parent chain', async () => {
    // Create parent task
    const parentPath = path.join(projectDir, '.converge/epics/01-epic/001-parent');
    await mkdir(parentPath, { recursive: true });
    await writeFile(
      path.join(parentPath, 'TASK.md'),
      '---\ntitle: Parent Task\n---\n'
    );

    // Create child task
    const childPath = path.join(parentPath, 'tasks/001-001-child');
    await mkdir(childPath, { recursive: true });
    await writeFile(
      path.join(childPath, 'TASK.md'),
      '---\ntitle: Child Task\n---\n'
    );

    // Load parent Unit
    const parentUnit = await Unit.fromPath(path.join(parentPath, 'TASK.md'));

    // Verify parent has context
    expect(parentUnit.context).toBeDefined();
    expect(parentUnit.context?.epicId).toBe('01-epic');
    expect(parentUnit.context?.taskId).toBe('001-parent');
    expect(parentUnit.context?.parentTaskId).toBeUndefined(); // No parent
    expect(parentUnit.context?.parent).toBeUndefined(); // No parent

    // Load child Unit with parent
    const childUnit = await Unit.fromPath(path.join(childPath, 'TASK.md'), parentUnit);

    // Verify child has context with parent chain
    expect(childUnit.context).toBeDefined();
    expect(childUnit.context?.epicId).toBe('01-epic');
    expect(childUnit.context?.taskId).toBe('001-001-child');
    expect(childUnit.context?.parentTaskId).toBe('001-parent');
    expect(childUnit.context?.parent).toBe(parentUnit.context); // Parent reference!
  });

  it('should walk ancestor contexts correctly', async () => {
    // Create grandparent → parent → child hierarchy
    const grandparentPath = path.join(projectDir, '.converge/epics/02-epic/002-grandparent');
    const parentPath = path.join(grandparentPath, 'tasks/002-001-parent');
    const childPath = path.join(parentPath, 'tasks/002-001-001-child');

    await mkdir(grandparentPath, { recursive: true });
    await mkdir(parentPath, { recursive: true });
    await mkdir(childPath, { recursive: true });

    await writeFile(
      path.join(grandparentPath, 'TASK.md'),
      '---\ntitle: Grandparent\n---\n'
    );
    await writeFile(
      path.join(parentPath, 'TASK.md'),
      '---\ntitle: Parent\n---\n'
    );
    await writeFile(
      path.join(childPath, 'TASK.md'),
      '---\ntitle: Child\n---\n'
    );

    // Load units with parent chain
    const grandparentUnit = await Unit.fromPath(path.join(grandparentPath, 'TASK.md'));
    const parentUnit = await Unit.fromPath(path.join(parentPath, 'TASK.md'), grandparentUnit);
    const childUnit = await Unit.fromPath(path.join(childPath, 'TASK.md'), parentUnit);

    // Walk ancestor contexts
    const ancestors = Array.from(childUnit.walkAncestorContexts());

    // Should yield parent, then grandparent
    expect(ancestors).toHaveLength(2);
    expect(ancestors[0].taskId).toBe('002-001-parent');
    expect(ancestors[1].taskId).toBe('002-grandparent');
  });

  it('should handle virtual units without context', () => {
    // Create a virtual unit (no path in epics directory)
    const virtualUnit = Unit.fromDefinition(
      { id: 'virtual-task', title: 'Virtual Task' },
      null as any, // No parent
      '<virtual:virtual-task>'
    );

    // Virtual units should not have context
    expect(virtualUnit.context).toBeUndefined();

    // walkAncestorContexts should not yield anything
    const ancestors = Array.from(virtualUnit.walkAncestorContexts());
    expect(ancestors).toHaveLength(0);
  });
});
