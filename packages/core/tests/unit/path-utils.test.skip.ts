/**
 * Tests for path-utils.ts - Hierarchical Path Resolution
 */

import { describe, it, expect } from "vitest";
import {
  extractJournalTaskId,
  extractEpicId,
  extractEpicDir,
  extractLeafTaskId,
  extractParentTaskId,
  constructJournalPath,
} from "../../src/unit/path-utils.ts";

describe("path-utils", () => {
  describe("extractJournalTaskId", () => {
    it("should extract leaf task ID for root tasks", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-generate-react-pages";
      const result = extractJournalTaskId(taskPath);
      expect(result).toBe("002-generate-react-pages");
    });

    it("should extract hierarchical ID for Seed subtasks", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-generate-react-pages/tasks/002-001-page-home-dashboard";
      const result = extractJournalTaskId(taskPath);
      expect(result).toBe(
        "002-generate-react-pages/002-001-page-home-dashboard",
      );
    });

    it("should extract hierarchical ID for deeply nested tasks", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home/tasks/002-001-001-header";
      const result = extractJournalTaskId(taskPath);
      expect(result).toBe("002-pages/002-001-home/002-001-001-header");
    });

    it("should work with TASK.md file paths", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-generate-react-pages/tasks/002-001-page-home-dashboard/TASK.md";
      const result = extractJournalTaskId(taskPath);
      expect(result).toBe(
        "002-generate-react-pages/002-001-page-home-dashboard",
      );
    });

    it("should work with TASK.md file paths", () => {
      const taskPath = ".converge/epics/03-implement-app/002-pages/TASK.md";
      const result = extractJournalTaskId(taskPath);
      expect(result).toBe("002-pages");
    });

    it("should throw error for invalid paths without epics directory", () => {
      const taskPath = "/invalid/path/without/epic";
      expect(() => extractJournalTaskId(taskPath)).toThrow(
        "no 'epics' directory",
      );
    });
  });

  describe("extractEpicId", () => {
    it("should extract epic ID from task path", () => {
      const taskPath = ".converge/epics/03-implement-app/002-pages";
      const result = extractEpicId(taskPath);
      expect(result).toBe("03-implement-app");
    });

    it("should extract epic ID from nested task path", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home/TASK.md";
      const result = extractEpicId(taskPath);
      expect(result).toBe("03-implement-app");
    });

    it("should throw error for invalid paths", () => {
      const taskPath = "/invalid/path";
      expect(() => extractEpicId(taskPath)).toThrow("no 'epics' directory");
    });
  });

  describe("extractEpicDir", () => {
    it("should extract epic directory path", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home";
      const result = extractEpicDir(taskPath);
      expect(result).toBe(".converge/epics/03-implement-app");
    });

    it("should work with absolute paths", () => {
      const taskPath =
        "/Users/minh/project/.converge/epics/03-implement-app/002-pages";
      const result = extractEpicDir(taskPath);
      expect(result).toBe(
        "/Users/minh/project/.converge/epics/03-implement-app",
      );
    });
  });

  describe("extractLeafTaskId", () => {
    it("should extract leaf task ID for root tasks", () => {
      const taskPath = ".converge/epics/03-implement-app/002-pages";
      const result = extractLeafTaskId(taskPath);
      expect(result).toBe("002-pages");
    });

    it("should extract leaf task ID for nested tasks", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home";
      const result = extractLeafTaskId(taskPath);
      expect(result).toBe("002-001-home");
    });

    it("should work with TASK.md file paths", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home/TASK.md";
      const result = extractLeafTaskId(taskPath);
      expect(result).toBe("002-001-home");
    });

    it("should return epic ID when no task segments present", () => {
      // When path ends at epic level, the epic ID itself is returned
      // This is a valid edge case - the epic directory IS a task
      const taskPath = ".converge/epics/03-implement-app";
      const result = extractLeafTaskId(taskPath);
      expect(result).toBe("03-implement-app");
    });
  });

  describe("extractParentTaskId", () => {
    it("should return undefined for root tasks", () => {
      const taskPath = ".converge/epics/03-implement-app/002-pages";
      const result = extractParentTaskId(taskPath);
      expect(result).toBeUndefined();
    });

    it("should extract parent task ID for Seed subtasks", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home";
      const result = extractParentTaskId(taskPath);
      expect(result).toBe("002-pages");
    });

    it("should extract parent task ID for deeply nested tasks", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home/tasks/002-001-001-header";
      const result = extractParentTaskId(taskPath);
      expect(result).toBe("002-001-home");
    });

    it("should work with TASK.md file paths", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home/TASK.md";
      const result = extractParentTaskId(taskPath);
      expect(result).toBe("002-pages");
    });
  });

  describe("constructJournalPath", () => {
    it("should mirror epic structure exactly for root tasks", () => {
      const taskPath = ".converge/epics/03-implement-app/002-pages";
      const result = constructJournalPath(taskPath);
      expect(result).toBe(
        ".converge/journal/default/tasks/03-implement-app/002-pages",
      );
    });

    it("should mirror epic structure exactly for Seed subtasks", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home";
      const result = constructJournalPath(taskPath);
      expect(result).toBe(
        ".converge/journal/default/tasks/03-implement-app/002-pages/tasks/002-001-home",
      );
    });

    it("should mirror epic structure exactly for deeply nested tasks", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home/tasks/002-001-001-header";
      const result = constructJournalPath(taskPath);
      expect(result).toBe(
        ".converge/journal/default/tasks/03-implement-app/002-pages/tasks/002-001-home/tasks/002-001-001-header",
      );
    });

    it("should strip TASK.md from journal paths", () => {
      const taskPath =
        ".converge/epics/03-implement-app/002-pages/tasks/002-001-home/TASK.md";
      const result = constructJournalPath(taskPath);
      expect(result).toBe(
        ".converge/journal/default/tasks/03-implement-app/002-pages/tasks/002-001-home",
      );
    });

    it("should work with absolute paths", () => {
      const taskPath = "/Users/minh/project/.converge/epics/03-app/002-pages";
      const result = constructJournalPath(taskPath);
      expect(result).toBe(
        "/Users/minh/project/.converge/journal/default/tasks/03-app/002-pages",
      );
    });

    it("should strip TASK.md from journal paths", () => {
      const taskPath = ".converge/epics/03-implement-app/002-pages/TASK.md";
      const result = constructJournalPath(taskPath);
      expect(result).toBe(
        ".converge/journal/default/tasks/03-implement-app/002-pages",
      );
    });
  });
});
