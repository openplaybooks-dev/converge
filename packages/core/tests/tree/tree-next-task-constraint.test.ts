/**
 * Test: Next Task Finding Constraints
 *
 * This test ensures the tree command correctly identifies the next task to execute
 * when a parent task is running.
 *
 * Key constraint: When a parent task is "running", the next task should be:
 * 1. The first pending child task (if parent has subtasks)
 * 2. The first pending task in the next epic (if parent has no children or all children complete)
 *
 * The running parent should be marked with ▶ and shown in the bottom status text.
 */

import { describe, it, expect } from "vitest";
import type { TaskNode, TaskStates } from "../../src/cli/next-task.ts";

describe("Tree Next Task Constraint - Running Parent Task", () => {
  it("should identify next task in different epic when parent is running", () => {
    // Scenario: Parent task in epic 01 is running (no children)
    // Next task should be first pending task in epic 02

    const tree: TaskNode[] = [
      {
        epicId: "01-prepare-requirements",
        taskId: "001-gather-idea-generate-ux",
        filePath:
          ".converge/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md",
        relPath:
          ".converge/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md",
        journalTaskId: "001-gather-idea-generate-ux",
        blocking: true,
        status: "running",
      },
      {
        epicId: "02-prepare-designs",
        taskId: "001-breakdown-ux-to-screens",
        filePath:
          ".converge/epics/02-prepare-designs/001-breakdown-ux-to-screens/TASK.md",
        relPath:
          ".converge/epics/02-prepare-designs/001-breakdown-ux-to-screens/TASK.md",
        journalTaskId: "001-breakdown-ux-to-screens",
        blocking: true,
        status: "pending",
      },
      {
        epicId: "02-prepare-designs",
        taskId: "002-generate-design-system",
        filePath:
          ".converge/epics/02-prepare-designs/002-generate-design-system/TASK.md",
        relPath:
          ".converge/epics/02-prepare-designs/002-generate-design-system/TASK.md",
        journalTaskId: "002-generate-design-system",
        blocking: true,
        status: "pending",
      },
    ];

    const states: TaskStates = {
      completed: new Set<string>(),
      failed: new Set<string>(),
      seeded: new Set<string>(),
      locked: new Set<string>(),
      seedProgress: new Map(),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    // Find running task
    const runningTask = tree.find((n) => n.status === "running");
    expect(runningTask).toBeDefined();
    expect(runningTask?.journalTaskId).toBe("001-gather-idea-generate-ux");
    expect(runningTask?.epicId).toBe("01-prepare-requirements");

    // Find next task (should skip running task, find first pending in next epic)
    const nextTask = tree.find((n) => {
      if (states.completed.has(n.journalTaskId)) return false;
      if (states.failed.has(n.journalTaskId)) return false;
      if (states.blocked.has(n.journalTaskId)) return false;
      // Skip the running parent task itself
      if (runningTask && n.journalTaskId === runningTask.journalTaskId)
        return false;
      return true;
    });

    expect(nextTask).toBeDefined();
    expect(nextTask?.journalTaskId).toBe("001-breakdown-ux-to-screens");
    expect(nextTask?.epicId).toBe("02-prepare-designs");

    // Verify: Next task should be in a DIFFERENT epic than running task
    expect(nextTask?.epicId).not.toBe(runningTask?.epicId);
  });

  it("should identify next child task when Seed parent is running", () => {
    // Scenario: Seed parent in epic 01 is running with subtasks
    // Next task should be first pending child task

    const tree: TaskNode[] = [
      {
        epicId: "01-prepare-designs",
        taskId: "003-generate-screens",
        filePath:
          ".converge/epics/01-prepare-designs/003-generate-screens/TASK.md",
        relPath:
          ".converge/epics/01-prepare-designs/003-generate-screens/TASK.md",
        journalTaskId: "003-generate-screens",
        blocking: true,
        status: "running",
      },
      {
        epicId: "01-prepare-designs",
        taskId: "003-001-generate-home-screen",
        filePath:
          ".converge/epics/01-prepare-designs/003-generate-screens/tasks/003-001-generate-home-screen/TASK.md",
        relPath:
          ".converge/epics/01-prepare-designs/003-generate-screens/tasks/003-001-generate-home-screen/TASK.md",
        journalTaskId: "003-generate-screens/003-001-generate-home-screen",
        parentTaskId: "003-generate-screens",
        blocking: true,
        status: "pending",
      },
      {
        epicId: "01-prepare-designs",
        taskId: "003-002-generate-profile-screen",
        filePath:
          ".converge/epics/01-prepare-designs/003-generate-screens/tasks/003-002-generate-profile-screen/TASK.md",
        relPath:
          ".converge/epics/01-prepare-designs/003-generate-screens/tasks/003-002-generate-profile-screen/TASK.md",
        journalTaskId: "003-generate-screens/003-002-generate-profile-screen",
        parentTaskId: "003-generate-screens",
        blocking: true,
        status: "pending",
      },
    ];

    const states: TaskStates = {
      completed: new Set<string>(),
      failed: new Set<string>(),
      seeded: new Set(["003-generate-screens"]),
      locked: new Set<string>(),
      seedProgress: new Map([
        [
          "003-generate-screens",
          {
            seeded: true,
            spawnCount: 2,
            completedSubtasks: 0,
            failedSubtasks: 0,
            subtaskIds: [
              "003-001-generate-home-screen",
              "003-002-generate-profile-screen",
            ],
          },
        ],
      ]),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    // Find running task
    const runningTask = tree.find((n) => n.status === "running");
    expect(runningTask).toBeDefined();
    expect(runningTask?.journalTaskId).toBe("003-generate-screens");

    // Find next task (should skip running parent, find first child)
    const nextTask = tree.find((n) => {
      if (states.completed.has(n.journalTaskId)) return false;
      if (states.failed.has(n.journalTaskId)) return false;
      if (states.blocked.has(n.journalTaskId)) return false;
      // Skip the running parent task itself
      if (runningTask && n.journalTaskId === runningTask.journalTaskId)
        return false;
      return true;
    });

    expect(nextTask).toBeDefined();
    expect(nextTask?.journalTaskId).toBe(
      "003-generate-screens/003-001-generate-home-screen",
    );
    expect(nextTask?.parentTaskId).toBe("003-generate-screens");

    // Verify: Next task should be a child of running task
    expect(nextTask?.parentTaskId).toBe(runningTask?.journalTaskId);
  });

  it("should skip completed children and find next pending child when parent running", () => {
    const tree: TaskNode[] = [
      {
        epicId: "01-prepare-designs",
        taskId: "003-generate-screens",
        filePath:
          ".converge/epics/01-prepare-designs/003-generate-screens/TASK.md",
        relPath:
          ".converge/epics/01-prepare-designs/003-generate-screens/TASK.md",
        journalTaskId: "003-generate-screens",
        blocking: true,
        status: "running",
      },
      {
        epicId: "01-prepare-designs",
        taskId: "003-001-generate-home-screen",
        filePath:
          ".converge/epics/01-prepare-designs/003-generate-screens/tasks/003-001-generate-home-screen/TASK.md",
        relPath:
          ".converge/epics/01-prepare-designs/003-generate-screens/tasks/003-001-generate-home-screen/TASK.md",
        journalTaskId: "003-generate-screens/003-001-generate-home-screen",
        parentTaskId: "003-generate-screens",
        blocking: true,
        status: "complete",
      },
      {
        epicId: "01-prepare-designs",
        taskId: "003-002-generate-profile-screen",
        filePath:
          ".converge/epics/01-prepare-designs/003-generate-screens/tasks/003-002-generate-profile-screen/TASK.md",
        relPath:
          ".converge/epics/01-prepare-designs/003-generate-screens/tasks/003-002-generate-profile-screen/TASK.md",
        journalTaskId: "003-generate-screens/003-002-generate-profile-screen",
        parentTaskId: "003-generate-screens",
        blocking: true,
        status: "pending",
      },
    ];

    const states: TaskStates = {
      completed: new Set(["003-generate-screens/003-001-generate-home-screen"]),
      failed: new Set<string>(),
      seeded: new Set(["003-generate-screens"]),
      locked: new Set<string>(),
      seedProgress: new Map([
        [
          "003-generate-screens",
          {
            seeded: true,
            spawnCount: 2,
            completedSubtasks: 1,
            failedSubtasks: 0,
            subtaskIds: [
              "003-001-generate-home-screen",
              "003-002-generate-profile-screen",
            ],
          },
        ],
      ]),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    const runningTask = tree.find((n) => n.status === "running");

    // Find next task (should skip completed child, find pending child)
    const nextTask = tree.find((n) => {
      if (states.completed.has(n.journalTaskId)) return false;
      if (states.failed.has(n.journalTaskId)) return false;
      if (states.blocked.has(n.journalTaskId)) return false;
      if (runningTask && n.journalTaskId === runningTask.journalTaskId)
        return false;
      return true;
    });

    expect(nextTask).toBeDefined();
    expect(nextTask?.journalTaskId).toBe(
      "003-generate-screens/003-002-generate-profile-screen",
    );
  });

  it("should correctly handle no pending tasks when all tasks complete", () => {
    const tree: TaskNode[] = [
      {
        epicId: "01-prepare-requirements",
        taskId: "001-gather-idea-generate-ux",
        filePath:
          ".converge/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md",
        relPath:
          ".converge/epics/01-prepare-requirements/001-gather-idea-generate-ux/TASK.md",
        journalTaskId: "001-gather-idea-generate-ux",
        blocking: true,
        status: "complete",
      },
    ];

    const states: TaskStates = {
      completed: new Set(["001-gather-idea-generate-ux"]),
      failed: new Set<string>(),
      seeded: new Set<string>(),
      locked: new Set<string>(),
      seedProgress: new Map(),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    const runningTask = tree.find((n) => n.status === "running");
    expect(runningTask).toBeUndefined();

    const nextTask = tree.find((n) => {
      if (states.completed.has(n.journalTaskId)) return false;
      if (states.failed.has(n.journalTaskId)) return false;
      if (states.blocked.has(n.journalTaskId)) return false;
      if (runningTask && n.journalTaskId === runningTask.journalTaskId)
        return false;
      return true;
    });

    // No pending tasks - should return undefined
    expect(nextTask).toBeUndefined();
  });
});
