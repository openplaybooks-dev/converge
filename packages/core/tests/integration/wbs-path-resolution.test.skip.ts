/**
 * Integration test for WBS path resolution
 *
 * Verifies that the path utilities correctly extract hierarchical task IDs
 * from real WBS subtask paths.
 */

import { describe, it, expect } from "vitest";
import {
  extractJournalTaskId,
  extractLeafTaskId,
  extractParentTaskId,
} from "../../src/unit/path-utils.ts";
import { createTaskContext } from "../../src/unit/task-context.ts";
import * as path from "node:path";

describe("WBS Path Resolution Integration", () => {
  const exampleProjectPath =
    "/Users/minh/Documents/converge/artifacts/claude-reactjs/example";

  describe("Real WBS Task: 002-001-page-home-dashboard", () => {
    const taskPath = path.join(
      exampleProjectPath,
      ".converge/epics/03-implement-app/002-generate-react-pages/tasks/002-001-page-home-dashboard",
    );

    it("should extract hierarchical journal task ID", () => {
      const journalTaskId = extractJournalTaskId(taskPath);
      expect(journalTaskId).toBe(
        "002-generate-react-pages/002-001-page-home-dashboard",
      );
    });

    it("should extract leaf task ID", () => {
      const leafTaskId = extractLeafTaskId(taskPath);
      expect(leafTaskId).toBe("002-001-page-home-dashboard");
    });

    it("should extract parent task ID", () => {
      const parentTaskId = extractParentTaskId(taskPath);
      expect(parentTaskId).toBe("002-generate-react-pages");
    });

    it("should create correct task context", () => {
      const context = createTaskContext(taskPath);
      expect(context.epicId).toBe("03-implement-app");
      expect(context.taskId).toBe("002-001-page-home-dashboard");
      expect(context.parentTaskId).toBe("002-generate-react-pages");
      expect(context.fullTaskId).toBe(
        "002-generate-react-pages/002-001-page-home-dashboard",
      );
      // Journal path should mirror epic structure exactly
      expect(context.journalPath).toContain(
        "journal/default/tasks/03-implement-app/002-generate-react-pages/tasks/002-001-page-home-dashboard",
      );
    });
  });

  describe("Real WBS Parent: 002-generate-react-pages", () => {
    const taskPath = path.join(
      exampleProjectPath,
      ".converge/epics/03-implement-app/002-generate-react-pages",
    );

    it("should extract leaf task ID", () => {
      const journalTaskId = extractJournalTaskId(taskPath);
      expect(journalTaskId).toBe("002-generate-react-pages");
    });

    it("should not have a parent task ID", () => {
      const parentTaskId = extractParentTaskId(taskPath);
      expect(parentTaskId).toBeUndefined();
    });

    it("should create correct task context", () => {
      const context = createTaskContext(taskPath);
      expect(context.epicId).toBe("03-implement-app");
      expect(context.taskId).toBe("002-generate-react-pages");
      expect(context.parentTaskId).toBeUndefined();
      expect(context.fullTaskId).toBe("002-generate-react-pages");
    });
  });

  describe("Real WBS Task: 003-001-asset-logo", () => {
    const taskPath = path.join(
      exampleProjectPath,
      ".converge/epics/03-implement-app/003-generate-svg-assets/tasks/003-001-asset-logo",
    );

    it("should extract hierarchical journal task ID", () => {
      const journalTaskId = extractJournalTaskId(taskPath);
      expect(journalTaskId).toBe("003-generate-svg-assets/003-001-asset-logo");
    });

    it("should extract leaf task ID", () => {
      const leafTaskId = extractLeafTaskId(taskPath);
      expect(leafTaskId).toBe("003-001-asset-logo");
    });

    it("should extract parent task ID", () => {
      const parentTaskId = extractParentTaskId(taskPath);
      expect(parentTaskId).toBe("003-generate-svg-assets");
    });
  });
});
