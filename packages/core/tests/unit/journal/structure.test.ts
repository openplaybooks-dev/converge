/**
 * Tests for journal structure — the journal tree mirrors the playbook tree 1:1,
 * so every nested task id segment corresponds to a `tasks/{seg}/` wrapper.
 *
 *   playbooks/{pb}/TASK.md               → journal/{pb}/
 *   playbooks/{pb}/tasks/{a}/TASK.md     → journal/{pb}/tasks/{a}/
 *   playbooks/{pb}/tasks/{a}/tasks/{b}/  → journal/{pb}/tasks/{a}/tasks/{b}/
 */

import { describe, it, expect } from "vitest";
import { join, resolve } from "node:path";
import {
  getJournalStructure,
  getTaskAttemptDir,
  getAncestorJournalPaths,
} from "../../../src/journal/structure.ts";

describe("journal structure", () => {
  const projectDir = "/Users/test/project";

  describe("getJournalStructure", () => {
    it("should create root structure without epic or task", () => {
      const structure = getJournalStructure(projectDir);

      expect(structure.root).toBe(join(projectDir, ".converge", "journal"));
      expect(structure.project).toBe(
        join(projectDir, ".converge", "journal", "project"),
      );
      expect(structure.epic).toBeUndefined();
      expect(structure.task).toBeUndefined();
    });

    it("should create epic-level structure (epic id != playbook)", () => {
      const structure = getJournalStructure(projectDir, "03-implement-app");

      expect(structure.epic).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
        ),
      );
      expect(structure.task).toBeUndefined();
    });

    it("nests the first child under tasks/ (mirrors playbook)", () => {
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "002-pages",
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
        ),
      );
    });

    it("nests one level of children under tasks/.../tasks/...", () => {
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "002-pages/002-001-home",
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "tasks",
          "002-001-home",
        ),
      );
    });

    it("nests deeply (three levels)", () => {
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "002-pages/002-001-home/002-001-001-header",
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "tasks",
          "002-001-home",
          "tasks",
          "002-001-001-header",
        ),
      );
    });

    it("handles trailing slash in taskId", () => {
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "002-pages/002-001-home/",
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "tasks",
          "002-001-home",
        ),
      );
    });

    it("ignores empty segments from duplicate slashes", () => {
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "002-pages//002-001-home",
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "tasks",
          "002-001-home",
        ),
      );
    });

    it("drops a leading epic-id segment from taskId to avoid double-nesting", () => {
      // Some callers pass the epic id as the first taskId segment (hierarchical
      // id). The epic dir already is that directory — don't re-nest.
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "03-implement-app/002-pages",
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
        ),
      );
    });
  });

  describe("getTaskAttemptDir", () => {
    it("creates attempt dir directly under the task dir", () => {
      const attemptDir = getTaskAttemptDir(
        projectDir,
        "03-implement-app",
        "002-pages",
        1,
      );

      expect(attemptDir).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "attempts",
          "01",
        ),
      );
    });

    it("creates attempt dir for a nested task", () => {
      const attemptDir = getTaskAttemptDir(
        projectDir,
        "03-implement-app",
        "002-pages/002-001-home",
        2,
      );

      expect(attemptDir).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "tasks",
          "002-001-home",
          "attempts",
          "02",
        ),
      );
    });

    it("handles string attempt numbers", () => {
      const attemptDir = getTaskAttemptDir(
        projectDir,
        "03-implement-app",
        "002-pages",
        "wip",
      );

      expect(attemptDir).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "attempts",
          "wip",
        ),
      );
    });

    it("pads numeric attempt numbers", () => {
      const attemptDir = getTaskAttemptDir(
        projectDir,
        "03-implement-app",
        "002-pages",
        9,
      );

      expect(attemptDir).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "attempts",
          "09",
        ),
      );
    });

    it("keeps attempts/ and tasks/ as siblings under the same task dir", () => {
      const attemptDir = getTaskAttemptDir(
        projectDir,
        "03-implement-app",
        "002-pages",
        1,
      );
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "002-pages",
      );

      const parentOfAttempts = join(attemptDir, "..", "..");
      const parentOfTasks = structure.task!;

      expect(parentOfAttempts).toBe(parentOfTasks);
      expect(attemptDir).toContain("/002-pages/attempts/01");
    });
  });

  describe("getAncestorJournalPaths", () => {
    it("returns empty for root tasks", () => {
      const ancestors = getAncestorJournalPaths(
        projectDir,
        "03-implement-app",
        "002-pages",
      );
      expect(ancestors).toEqual([]);
    });

    it("returns the parent path for one level of nesting", () => {
      const ancestors = getAncestorJournalPaths(
        projectDir,
        "03-implement-app",
        "002-pages/002-001-home",
      );

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0]).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
        ),
      );
    });

    it("returns all ancestor paths for deeply nested tasks", () => {
      const ancestors = getAncestorJournalPaths(
        projectDir,
        "03-implement-app",
        "002-pages/002-001-home/002-001-001-header",
      );

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0]).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
        ),
      );
      expect(ancestors[1]).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "default",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "tasks",
          "002-001-home",
        ),
      );
    });

    it("returns ancestors in order from root to immediate parent", () => {
      const ancestors = getAncestorJournalPaths(
        projectDir,
        "03-implement-app",
        "a/b/c/d",
      );

      expect(ancestors).toHaveLength(3);
      expect(ancestors[0]).toContain("/03-implement-app/tasks/a");
      expect(ancestors[1]).toContain("/tasks/a/tasks/b");
      expect(ancestors[2]).toContain("/tasks/a/tasks/b/tasks/c");
    });
  });

  describe("journal structure consistency", () => {
    it("keeps attempts/ and tasks/ as siblings", () => {
      const taskId = "002-pages";
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        taskId,
      );
      const attemptDir = getTaskAttemptDir(
        projectDir,
        "03-implement-app",
        taskId,
        1,
      );

      const taskParent = structure.task!;
      const attemptParent = join(attemptDir, "..", "..");

      expect(attemptParent).toBe(taskParent);
      expect(structure.task).toMatch(/\/002-pages$/);
      expect(attemptDir).toMatch(/\/002-pages\/attempts\/01$/);
    });

    it("child path extends parent path with tasks/{child}", () => {
      const parentTaskId = "002-pages";
      const childTaskId = "002-pages/002-001-home";

      const parentStructure = getJournalStructure(
        projectDir,
        "03-implement-app",
        parentTaskId,
      );
      const childStructure = getJournalStructure(
        projectDir,
        "03-implement-app",
        childTaskId,
      );

      const expectedChildPath = join(
        parentStructure.task!,
        "tasks",
        "002-001-home",
      );
      expect(childStructure.task).toBe(expectedChildPath);
    });

    it("task path mirrors playbook path", () => {
      const taskId = "002-pages/002-001-home";
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        taskId,
      );

      expect(structure.task).toContain(
        "/journal/default/tasks/03-implement-app/tasks/002-pages/tasks/002-001-home",
      );
    });
  });

  describe("PlaybookContext routing — epicId === playbook (common case)", () => {
    it("routes the epic dir to journal/{pb}/ (no re-nesting of playbook name)", () => {
      const ctx = { playbook: "react-app" };
      const structure = getJournalStructure(
        projectDir,
        "react-app",
        undefined,
        ctx,
      );

      expect(structure.epic).toBe(
        join(projectDir, ".converge", "journal", "react-app"),
      );
    });

    it("routes task paths as journal/{pb}/tasks/{taskId}/", () => {
      const ctx = { playbook: "react-app" };
      const structure = getJournalStructure(
        projectDir,
        "react-app",
        "002-pages",
        ctx,
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "react-app",
          "tasks",
          "002-pages",
        ),
      );
    });

    it("routes nested task paths as journal/{pb}/tasks/{a}/tasks/{b}/", () => {
      const ctx = { playbook: "react-app" };
      const structure = getJournalStructure(
        projectDir,
        "react-app",
        "002-pages/002-001-home",
        ctx,
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "react-app",
          "tasks",
          "002-pages",
          "tasks",
          "002-001-home",
        ),
      );
    });
  });

  describe("Playbook source probing (mirrors whichever convention the playbook uses)", () => {
    // Uses the real social-sim playbook fixture — it nests children directly
    // (playbooks/social-sim/tasks/10-research/010-oasis-distillation/) without
    // a tasks/ wrapper, unlike autonomous-pentest which wraps every child.
    // Journal must mirror whichever layout the playbook chose.
    const realRepo = resolve(__dirname, "../../../../..");
    const socialSim = join(realRepo, "examples/social-sim");

    it("mirrors direct-child nesting when the playbook uses it", () => {
      const ctx = { playbook: "social-sim" };
      const structure = getJournalStructure(
        socialSim,
        "social-sim",
        "social-sim/10-research/010-oasis-distillation",
        ctx,
      );

      // playbook path: playbooks/social-sim/tasks/10-research/010-oasis-distillation/
      // journal path:  journal/social-sim/tasks/10-research/010-oasis-distillation/  (no extra tasks/)
      expect(structure.task).toBe(
        join(
          socialSim,
          ".converge",
          "journal",
          "social-sim",
          "tasks",
          "10-research",
          "010-oasis-distillation",
        ),
      );
    });

    it("falls back to tasks/-wrapped default when probe fails (no playbook source)", () => {
      const ctx = { playbook: "nonexistent-playbook" };
      const structure = getJournalStructure(
        "/tmp/nowhere",
        "nonexistent-playbook",
        "a/b",
        ctx,
      );
      expect(structure.task).toBe(
        "/tmp/nowhere/.converge/journal/nonexistent-playbook/tasks/a/tasks/b",
      );
    });
  });

  describe("PlaybookContext routing — epicId !== playbook (legacy)", () => {
    it("places the epic under journal/{pb}/tasks/{epicId}/", () => {
      const ctx = { playbook: "react-app" };
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        undefined,
        ctx,
      );

      expect(structure.epic).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "react-app",
          "tasks",
          "03-implement-app",
        ),
      );
    });

    it("nests task paths under that epic dir with a tasks/ wrapper", () => {
      const ctx = { playbook: "react-app" };
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "002-pages",
        ctx,
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "react-app",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
        ),
      );
    });

    it("nests deeply nested task paths with every segment wrapped", () => {
      const ctx = { playbook: "react-app" };
      const structure = getJournalStructure(
        projectDir,
        "03-implement-app",
        "002-pages/002-001-home",
        ctx,
      );

      expect(structure.task).toBe(
        join(
          projectDir,
          ".converge",
          "journal",
          "react-app",
          "tasks",
          "03-implement-app",
          "tasks",
          "002-pages",
          "tasks",
          "002-001-home",
        ),
      );
    });
  });
});
