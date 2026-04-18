/**
 * Checkpoint Cursor System Tests
 *
 * Tests for enhanced checkpoint system with tree traversal cursor.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type {
  Checkpoint,
  Cursor,
  CheckpointV1,
} from "../../../src/storage/types.ts";
import {
  hashTaskTree,
  discoverTaskHierarchy,
  extractTaskIdFromPath,
  calculateTaskDepth,
} from "../../../src/checkpoint/tree-utils.ts";
import {
  migrateCheckpointV1toV2,
  needsMigration,
  validateMigratedCheckpoint,
} from "../../../src/checkpoint/migration.ts";
import {
  resumeFromCheckpoint,
  describeResumePoint,
  isResumeAtBeginning,
} from "../../../src/checkpoint/resumability.ts";

describe("Checkpoint Cursor System", () => {
  describe("Tree Hashing", () => {
    it("should generate deterministic hash for task paths", () => {
      const paths = [
        ".converge/epics/01-epic/001-task/TASK.md",
        ".converge/epics/01-epic/002-task/TASK.md",
        ".converge/epics/01-epic/003-task/TASK.md",
      ];

      const hash1 = hashTaskTree(paths);
      const hash2 = hashTaskTree(paths);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{8}$/); // 8-char hex string
    });

    it("should generate different hash when paths change", () => {
      const paths1 = [
        ".converge/epics/01-epic/001-task/TASK.md",
        ".converge/epics/01-epic/002-task/TASK.md",
      ];

      const paths2 = [
        ".converge/epics/01-epic/001-task/TASK.md",
        ".converge/epics/01-epic/003-task/TASK.md", // Different task
      ];

      const hash1 = hashTaskTree(paths1);
      const hash2 = hashTaskTree(paths2);

      expect(hash1).not.toBe(hash2);
    });

    it("should generate same hash regardless of order", () => {
      const paths1 = ["path/a.md", "path/b.md", "path/c.md"];
      const paths2 = ["path/c.md", "path/a.md", "path/b.md"];

      const hash1 = hashTaskTree(paths1);
      const hash2 = hashTaskTree(paths2);

      expect(hash1).toBe(hash2);
    });
  });

  describe("Task ID Extraction", () => {
    it("should extract task ID from TASK.md path", () => {
      const path = ".converge/epics/01-epic/003-task/TASK.md";
      const taskId = extractTaskIdFromPath(path);
      expect(taskId).toBe("003-task");
    });

    it("should extract subtask ID from nested path", () => {
      const path = ".converge/epics/01-epic/003-task/tasks/002-subtask/TASK.md";
      const taskId = extractTaskIdFromPath(path);
      expect(taskId).toBe("002-subtask");
    });

    it("should extract task ID from TASK.md path in directory", () => {
      const path = ".converge/epics/01-epic/003-task/TASK.md";
      const taskId = extractTaskIdFromPath(path);
      expect(taskId).toBe("003-task");
    });
  });

  describe("Task Depth Calculation", () => {
    it("should calculate depth 0 for epic-level task", () => {
      const taskPath = ".converge/epics/01-epic/001-task/TASK.md";
      const epicPath = ".converge/epics/01-epic";
      const depth = calculateTaskDepth(taskPath, epicPath);
      expect(depth).toBe(0);
    });

    it("should calculate depth 1 for subtask", () => {
      const taskPath =
        ".converge/epics/01-epic/001-task/tasks/002-subtask/TASK.md";
      const epicPath = ".converge/epics/01-epic";
      const depth = calculateTaskDepth(taskPath, epicPath);
      expect(depth).toBe(1);
    });

    it("should calculate depth 2 for nested subtask", () => {
      const taskPath =
        ".converge/epics/01-epic/001-task/tasks/002-subtask/tasks/003-nested/TASK.md";
      const epicPath = ".converge/epics/01-epic";
      const depth = calculateTaskDepth(taskPath, epicPath);
      expect(depth).toBe(2);
    });
  });

  describe("Checkpoint Migration", () => {
    it("should detect v1 checkpoint", () => {
      const v1Checkpoint: any = {
        id: "checkpoint-1",
        timestamp: "2024-01-01T00:00:00Z",
        iteration: 1,
        state: {
          currentEpic: "epic-01",
          currentTask: "task-001",
          phase: "execute",
        },
        gaps: [],
        completed: { epics: [], tasks: [] },
        metadata: { created: "2024-01-01T00:00:00Z" },
      };

      expect(needsMigration(v1Checkpoint)).toBe(true);
    });

    it("should detect v2 checkpoint", () => {
      const v2Checkpoint: any = {
        version: 2,
        id: "checkpoint-1",
        timestamp: "2024-01-01T00:00:00Z",
        iteration: 1,
        state: {
          currentEpic: "epic-01",
          phase: "execute",
        },
        gaps: [],
        completed: { epics: [], tasks: [] },
        metadata: { created: "2024-01-01T00:00:00Z" },
      };

      expect(needsMigration(v2Checkpoint)).toBe(false);
    });

    it("should migrate v1 to v2 with cursor inference", () => {
      const v1: CheckpointV1 = {
        id: "checkpoint-1",
        timestamp: "2024-01-01T00:00:00Z",
        iteration: 1,
        state: {
          currentEpic: "01-epic",
          currentTask: "003-task",
          phase: "execute",
        },
        gaps: [],
        completed: { epics: [], tasks: ["001-task", "002-task"] },
        metadata: { created: "2024-01-01T00:00:00Z" },
      };

      const v2 = migrateCheckpointV1toV2(v1);

      expect(v2.version).toBe(2);
      expect(v2.cursor).toBeDefined();
      expect(v2.cursor?.path).toEqual(["01-epic", "003-task"]);
      expect(v2.cursor?.depth).toBe(1);
      expect(v2.completionTree).toBeDefined();
      expect(v2.treeSnapshot).toBeDefined();
    });

    it("should validate migrated checkpoint", () => {
      const v1: CheckpointV1 = {
        id: "checkpoint-1",
        timestamp: "2024-01-01T00:00:00Z",
        iteration: 1,
        state: {
          currentEpic: "01-epic",
          currentTask: "003-task",
          phase: "execute",
        },
        gaps: [],
        completed: { epics: [], tasks: [] },
        metadata: { created: "2024-01-01T00:00:00Z" },
      };

      const v2 = migrateCheckpointV1toV2(v1);
      const validation = validateMigratedCheckpoint(v2);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("Resume Point Description", () => {
    it("should describe exact restore", () => {
      const resumePoint = {
        cursor: {
          path: ["epic-01", "task-003", "subtask-002"],
          breadcrumbs: [],
          depth: 2,
        },
        resumeStrategy: "exact-restore" as const,
        treeChanged: false,
      };

      const description = describeResumePoint(resumePoint);
      expect(description).toContain("exact checkpoint position");
      expect(description).toContain("epic-01 → task-003 → subtask-002");
    });

    it("should describe parent fallback", () => {
      const resumePoint = {
        cursor: {
          path: ["epic-01", "task-003"],
          breadcrumbs: [],
          depth: 1,
        },
        resumeStrategy: "parent-fallback" as const,
        lostDepth: 1,
        treeChanged: true,
      };

      const description = describeResumePoint(resumePoint);
      expect(description).toContain("parent level");
      expect(description).toContain("1 level");
    });

    it("should describe restart", () => {
      const resumePoint = {
        cursor: null,
        resumeStrategy: "restart" as const,
      };

      const description = describeResumePoint(resumePoint);
      expect(description).toContain("Restarting from beginning");
    });
  });

  describe("Resume Point Helpers", () => {
    it("should detect resume at beginning", () => {
      const resumePoint = {
        cursor: null,
        resumeStrategy: "restart" as const,
      };

      expect(isResumeAtBeginning(resumePoint)).toBe(true);
    });

    it("should detect resume not at beginning", () => {
      const resumePoint = {
        cursor: {
          path: ["epic-01", "task-003"],
          breadcrumbs: [],
          depth: 1,
        },
        resumeStrategy: "exact-restore" as const,
      };

      expect(isResumeAtBeginning(resumePoint)).toBe(false);
    });
  });
});
