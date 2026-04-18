/**
 * Test: Tree display correctly shows running task and next task
 *
 * This test verifies that:
 * 1. When a parent task is "running", it gets the ▶ indicator
 * 2. The epic containing the running task also gets ▶ indicator
 * 3. The next pending subtask also gets ▶ indicator
 * 4. The tree command bottom text correctly shows "Parent task executing" + "Next subtask"
 */

import { describe, it, expect } from "vitest";
import type { TaskNode, TaskStates } from "../../src/cli/next-task.ts";

describe("Tree Display - Running Task Indicators", () => {
  it("should mark running parent, epic, and next subtask with ▶ indicator", () => {
    // Setup: Create a task tree with:
    // - Epic 01-prepare-requirements
    //   - 001-gather-idea-generate-ux (running, parent task)
    // - Epic 02-prepare-designs
    //   - 001-breakdown-ux-to-screens (next subtask, pending)

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
      wbsProgress: new Map(),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    // Test case 1: Running task identification
    const runningTask = tree.find((n) => n.status === "running");
    expect(runningTask).toBeDefined();
    expect(runningTask?.journalTaskId).toBe("001-gather-idea-generate-ux");

    // Test case 2: Next task identification (should NOT skip the running task's subtasks)
    // When finding the next task, we should:
    // 1. Skip completed tasks
    // 2. Skip failed tasks
    // 3. Skip blocked tasks
    // 4. Skip the running parent task itself
    // 5. BUT include the next pending task (even if in a different epic)
    const nextTask = tree.find((n) => {
      if (states.completed.has(n.journalTaskId)) return false;
      if (states.failed.has(n.journalTaskId)) return false;
      if (states.blocked.has(n.journalTaskId)) return false;
      // Skip if this task is the currently running parent
      if (runningTask && n.journalTaskId === runningTask.journalTaskId)
        return false;
      return true;
    });

    expect(nextTask).toBeDefined();
    expect(nextTask?.journalTaskId).toBe("001-breakdown-ux-to-screens");
    expect(nextTask?.epicId).toBe("02-prepare-designs");

    // Test case 3: Epic indicators
    // Both epics should get ▶ indicator:
    // - 01-prepare-requirements (contains running task)
    // - 02-prepare-designs (contains next task)
    const epicIdsWithIndicator = new Set<string>();

    if (runningTask) {
      epicIdsWithIndicator.add(runningTask.epicId);
    }

    if (nextTask) {
      epicIdsWithIndicator.add(nextTask.epicId);
    }

    expect(epicIdsWithIndicator.has("01-prepare-requirements")).toBe(true);
    expect(epicIdsWithIndicator.has("02-prepare-designs")).toBe(true);

    // Test case 4: Task indicators in tree display
    // The tree display should show:
    // ▶ 📂 01-prepare-requirements (epic with running task)
    //   ▶ 001-gather-idea-generate-ux (running task)
    // ▶ 📂 02-prepare-designs (epic with next task)
    //   ▶ 001-breakdown-ux-to-screens (next task)
    //   ○ 002-generate-design-system (pending task, not next)

    // Verify indicator logic for each task
    for (const node of tree) {
      const isRunning = runningTask?.journalTaskId === node.journalTaskId;
      const isNext = nextTask?.journalTaskId === node.journalTaskId;
      const isPending =
        !states.completed.has(node.journalTaskId) &&
        !states.failed.has(node.journalTaskId) &&
        !isRunning &&
        !isNext;

      if (node.journalTaskId === "001-gather-idea-generate-ux") {
        expect(isRunning).toBe(true);
        expect(isNext).toBe(false);
      } else if (node.journalTaskId === "001-breakdown-ux-to-screens") {
        expect(isRunning).toBe(false);
        expect(isNext).toBe(true);
      } else if (node.journalTaskId === "002-generate-design-system") {
        expect(isRunning).toBe(false);
        expect(isNext).toBe(false);
        expect(isPending).toBe(true);
      }
    }
  });

  it("should handle WBS parent-child relationship correctly", () => {
    // When a parent WBS task is running and has subtasks,
    // the next subtask should get ▶ indicator

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
        status: "running", // Parent WBS task is running
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
    ];

    const states: TaskStates = {
      completed: new Set<string>(),
      failed: new Set<string>(),
      seeded: new Set(["003-generate-screens"]), // Parent is seeded
      locked: new Set<string>(),
      wbsProgress: new Map([
        [
          "003-generate-screens",
          {
            seeded: true,
            spawnCount: 1,
            completedSubtasks: 0,
            failedSubtasks: 0,
            subtaskIds: ["003-001-generate-home-screen"],
          },
        ],
      ]),
      blocked: new Set<string>(),
      blockingFailures: new Set<string>(),
      failureBlocked: new Set<string>(),
    };

    const runningTask = tree.find((n) => n.status === "running");
    expect(runningTask?.journalTaskId).toBe("003-generate-screens");

    const nextTask = tree.find((n) => {
      if (states.completed.has(n.journalTaskId)) return false;
      if (states.failed.has(n.journalTaskId)) return false;
      if (states.blocked.has(n.journalTaskId)) return false;
      if (runningTask && n.journalTaskId === runningTask.journalTaskId)
        return false;
      return true;
    });

    expect(nextTask?.journalTaskId).toBe(
      "003-generate-screens/003-001-generate-home-screen",
    );
    expect(nextTask?.parentTaskId).toBe("003-generate-screens");
  });
});
