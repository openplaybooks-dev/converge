/**
 * Integration test for Unit loading from WBS subtask paths
 */

import { describe, it, expect } from "vitest";
import { Unit } from "../../src/unit/unit.ts";
import * as path from "node:path";
import { existsSync } from "node:fs";

describe("Unit Loading Integration", () => {
  const exampleProjectPath =
    "/Users/minh/Documents/converge/artifacts/claude-reactjs/example";

  describe("Loading WBS Subtask: 002-001-page-home-dashboard", () => {
    const taskPath = path.join(
      exampleProjectPath,
      ".converge/epics/03-implement-app/002-generate-react-pages/tasks/002-001-page-home-dashboard",
    );

    it("should skip if TASK.md does not exist", async () => {
      if (!existsSync(path.join(taskPath, "TASK.md"))) {
        console.log("Skipping test: TASK.md not found at", taskPath);
        return;
      }

      const unit = await Unit.fromPath(taskPath);

      // Verify Unit properties
      expect(unit.id).toBe("002-001-page-home-dashboard");
      expect(unit.path).toBe(taskPath);

      // Verify context was created correctly
      expect(unit.context).toBeDefined();
      if (unit.context) {
        expect(unit.context.epicId).toBe("03-implement-app");
        expect(unit.context.taskId).toBe("002-001-page-home-dashboard");
        expect(unit.context.parentTaskId).toBe("002-generate-react-pages");
        expect(unit.context.fullTaskId).toBe(
          "002-generate-react-pages/002-001-page-home-dashboard",
        );
      }
    });
  });

  describe("Loading WBS Parent: 002-generate-react-pages", () => {
    const taskPath = path.join(
      exampleProjectPath,
      ".converge/epics/03-implement-app/002-generate-react-pages",
    );

    it("should load parent task correctly", async () => {
      // Check if TASK.md exists
      const hasTaskMd = existsSync(path.join(taskPath, "TASK.md"));

      if (!hasTaskMd) {
        console.log("Skipping test: no TASK.md found at", taskPath);
        return;
      }

      const unit = await Unit.fromPath(taskPath);

      // Verify Unit properties
      expect(unit.id).toBe("002-generate-react-pages");
      expect(unit.path).toBe(taskPath);

      // Verify context was created correctly
      expect(unit.context).toBeDefined();
      if (unit.context) {
        expect(unit.context.epicId).toBe("03-implement-app");
        expect(unit.context.taskId).toBe("002-generate-react-pages");
        expect(unit.context.parentTaskId).toBeUndefined();
        expect(unit.context.fullTaskId).toBe("002-generate-react-pages");
      }
    });
  });
});
