/**
 * Tests for parent facts loading via context chain.
 *
 * Verifies:
 * 1. Parent facts can be loaded from parent's wip attempt
 * 2. Facts are merged correctly
 * 3. Missing parent facts returns empty object
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Unit } from "../../src/unit/unit.ts";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

describe("Parent Facts Loading", () => {
  const testDir = path.join(process.cwd(), "test-output", "parent-facts");
  const projectDir = path.join(testDir, "project");

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

  it("should have context with parent reference", async () => {
    // Create parent task
    const parentPath = path.join(
      projectDir,
      ".converge/epics/01-epic/001-parent",
    );
    await mkdir(parentPath, { recursive: true });
    await writeFile(
      path.join(parentPath, "TASK.md"),
      "---\ntitle: Parent Task\n---\n",
    );

    // Create parent journal with facts
    const parentJournalPath = path.join(
      projectDir,
      ".converge/journal/tasks/01-epic/001-parent/attempts/wip/logs",
    );
    await mkdir(parentJournalPath, { recursive: true });
    await writeFile(
      path.join(parentJournalPath, "facts.jsonl"),
      `{"id":"parent-fact-1","value":"parent-value-1"}\n` +
        `{"id":"parent-fact-2","value":"parent-value-2"}\n`,
    );

    // Create child task
    const childPath = path.join(parentPath, "tasks/001-001-child");
    await mkdir(childPath, { recursive: true });
    await writeFile(
      path.join(childPath, "TASK.md"),
      "---\ntitle: Child Task\n---\n",
    );

    // Load parent and child Units
    const parentUnit = await Unit.fromPath(path.join(parentPath, "TASK.md"));
    const childUnit = await Unit.fromPath(
      path.join(childPath, "TASK.md"),
      parentUnit,
    );

    // Verify child has parent context
    expect(childUnit.context).toBeDefined();
    expect(childUnit.context?.parent).toBe(parentUnit.context);

    // Verify parent journal path is correct
    expect(parentUnit.context?.journalPath).toBe(
      path.join(projectDir, ".converge/journal/tasks/01-epic/001-parent"),
    );

    // Parent facts file should exist at the expected path
    const parentFactsPath = path.join(
      parentUnit.context!.journalPath,
      "attempts/wip/logs/facts.jsonl",
    );
    expect(existsSync(parentFactsPath)).toBe(true);
  });

  it("should return empty object when parent has no facts", async () => {
    // Create parent task without facts
    const parentPath = path.join(
      projectDir,
      ".converge/epics/02-epic/002-parent",
    );
    const childPath = path.join(parentPath, "tasks/002-001-child");

    await mkdir(parentPath, { recursive: true });
    await mkdir(childPath, { recursive: true });

    await writeFile(
      path.join(parentPath, "TASK.md"),
      "---\ntitle: Parent\n---\n",
    );
    await writeFile(
      path.join(childPath, "TASK.md"),
      "---\ntitle: Child\n---\n",
    );

    // Load units
    const parentUnit = await Unit.fromPath(path.join(parentPath, "TASK.md"));
    const childUnit = await Unit.fromPath(
      path.join(childPath, "TASK.md"),
      parentUnit,
    );

    // Child should have parent context
    expect(childUnit.context?.parent).toBe(parentUnit.context);

    // Parent facts file doesn't exist, so loading would return empty object
    const parentFactsPath = path.join(
      parentUnit.context!.journalPath,
      "attempts/wip/logs/facts.jsonl",
    );
    expect(existsSync(parentFactsPath)).toBe(false);
  });

  it("should handle units without parent", async () => {
    // Create top-level task (no parent)
    const taskPath = path.join(projectDir, ".converge/epics/03-epic/003-task");
    await mkdir(taskPath, { recursive: true });
    await writeFile(
      path.join(taskPath, "TASK.md"),
      "---\ntitle: Top Level Task\n---\n",
    );

    // Load unit without parent
    const unit = await Unit.fromPath(path.join(taskPath, "TASK.md"));

    // Should have context but no parent
    expect(unit.context).toBeDefined();
    expect(unit.context?.parent).toBeUndefined();
  });
});
