/**
 * Journal-path branches of path-utils. Journal mirrors the playbook tree 1:1:
 *   .converge/journal/{pb}/tasks/{parent}/tasks/{child}/[tasks/{gc}/]TASK.md
 * There is no `spawned/` marker — the only nesting directive is `tasks/`.
 */
import { describe, it, expect } from "vitest";
import {
  extractJournalTaskId,
  extractEpicId,
  extractLeafTaskId,
  extractParentTaskId,
} from "../../src/task/unit/path-utils.ts";

const P = (s: string) => s; // POSIX-style path fixture (utility under test normalizes separators)

describe("path-utils — journal paths (mirror playbook)", () => {
  describe("extractJournalTaskId", () => {
    it("returns the playbook name for a root journal TASK.md", () => {
      expect(
        extractJournalTaskId(P(".converge/journal/default/TASK.md")),
      ).toBe("default");
    });

    it("builds parent/child id for a direct child", () => {
      expect(
        extractJournalTaskId(
          P(".converge/journal/default/tasks/parent/tasks/child/TASK.md"),
        ),
      ).toBe("parent/child");
    });

    it("builds parent/child/grandchild for a nested child", () => {
      expect(
        extractJournalTaskId(
          P(
            ".converge/journal/default/tasks/parent/tasks/child/tasks/grand/TASK.md",
          ),
        ),
      ).toBe("parent/child/grand");
    });

    it("respects non-default playbook name", () => {
      expect(
        extractJournalTaskId(
          P(".converge/journal/deep-research/tasks/epic-1/tasks/child/TASK.md"),
        ),
      ).toBe("epic-1/child");
    });
  });

  describe("extractEpicId", () => {
    it("returns the playbook name for journal paths", () => {
      expect(
        extractEpicId(
          P(".converge/journal/deep-research/tasks/parent/tasks/child/TASK.md"),
        ),
      ).toBe("deep-research");
    });
  });

  describe("extractLeafTaskId", () => {
    it("returns the child id, skipping tasks markers", () => {
      expect(
        extractLeafTaskId(
          P(".converge/journal/default/tasks/parent/tasks/child/TASK.md"),
        ),
      ).toBe("child");
    });

    it("returns the deepest id for a triply-nested child", () => {
      expect(
        extractLeafTaskId(
          P(
            ".converge/journal/default/tasks/parent/tasks/child/tasks/grand/TASK.md",
          ),
        ),
      ).toBe("grand");
    });
  });

  describe("extractParentTaskId", () => {
    it("returns the parent task id from a single-level child", () => {
      expect(
        extractParentTaskId(
          P(".converge/journal/default/tasks/parent/tasks/child/TASK.md"),
        ),
      ).toBe("parent");
    });

    it("returns the immediate parent for a nested child (not the root)", () => {
      expect(
        extractParentTaskId(
          P(
            ".converge/journal/default/tasks/parent/tasks/child/tasks/grand/TASK.md",
          ),
        ),
      ).toBe("child");
    });

    it("returns undefined for the playbook root TASK.md", () => {
      expect(
        extractParentTaskId(P(".converge/journal/default/TASK.md")),
      ).toBeUndefined();
    });
  });
});
