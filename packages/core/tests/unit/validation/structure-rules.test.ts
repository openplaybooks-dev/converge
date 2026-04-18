import { describe, it, expect, vi, beforeEach } from "vitest";
import { structureRules } from "../../../src/validation/rules/structure.ts";
import type { TaskValidationInput } from "../../../src/validation/types.ts";
import type { TaskMdShape } from "../../../src/config/task-md-definition.ts";

// Mock fs.existsSync
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

import { existsSync } from "node:fs";
const mockExistsSync = vi.mocked(existsSync);

function makeInput(
  shape: Partial<TaskMdShape> & { id: string },
  overrides: Partial<TaskValidationInput> = {},
): TaskValidationInput {
  return {
    shape: shape as TaskMdShape,
    rawFrontmatter: {},
    filePath: "/project/.converge/epics/01/001-test/TASK.md",
    taskDir: "/project/.converge/epics/01/001-test",
    projectDir: "/project",
    ...overrides,
  };
}

function runRule(ruleId: string, input: TaskValidationInput) {
  const rule = structureRules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`Rule "${ruleId}" not found`);
  return rule.check(input);
}

beforeEach(() => {
  mockExistsSync.mockReset();
  mockExistsSync.mockReturnValue(true);
});

describe("structure rules", () => {
  describe("folder-name-matches-id", () => {
    it("flags mismatch between folder name and id", () => {
      const issues = runRule(
        "folder-name-matches-id",
        makeInput(
          { id: "002-other" },
          { taskDir: "/project/.converge/epics/01/001-test" },
        ),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
    });

    it("passes when folder matches id", () => {
      const issues = runRule(
        "folder-name-matches-id",
        makeInput(
          { id: "001-test" },
          { taskDir: "/project/.converge/epics/01/001-test" },
        ),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("wbs-script-exists", () => {
    it("flags missing wbs script", () => {
      mockExistsSync.mockReturnValue(false);
      const issues = runRule(
        "wbs-script-exists",
        makeInput({
          id: "001-test",
          wbs: { type: "nodejs", path: "./wbs.js" },
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });

    it("passes when wbs script exists", () => {
      mockExistsSync.mockReturnValue(true);
      const issues = runRule(
        "wbs-script-exists",
        makeInput({
          id: "001-test",
          wbs: { type: "nodejs", path: "./wbs.js" },
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("skips when no wbs declared", () => {
      const issues = runRule(
        "wbs-script-exists",
        makeInput({ id: "001-test" }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("executor-script-exists", () => {
    it("flags missing executor script", () => {
      mockExistsSync.mockReturnValue(false);
      const issues = runRule(
        "executor-script-exists",
        makeInput({
          id: "001-test",
          executor: { type: "script", path: "./run.sh" },
        }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes for non-script executors", () => {
      const issues = runRule(
        "executor-script-exists",
        makeInput({
          id: "001-test",
          executor: { type: "ai" },
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("materials-exist", () => {
    it("flags missing materials", () => {
      mockExistsSync.mockReturnValue(false);
      const issues = runRule(
        "materials-exist",
        makeInput({
          id: "001-test",
          materials: ["docs/spec.md", "docs/design.md"],
        }),
      );
      expect(issues).toHaveLength(2);
      expect(issues[0].severity).toBe("warning");
    });

    it("passes when materials exist", () => {
      mockExistsSync.mockReturnValue(true);
      const issues = runRule(
        "materials-exist",
        makeInput({
          id: "001-test",
          materials: ["docs/spec.md"],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("inputs-not-self-referential", () => {
    it("flags overlapping input/output paths", () => {
      const issues = runRule(
        "inputs-not-self-referential",
        makeInput({
          id: "001-test",
          inputs: ["src/file.ts", "config.json"],
          outputs: ["src/file.ts"],
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].actual).toBe("src/file.ts");
    });

    it("passes with no overlap", () => {
      const issues = runRule(
        "inputs-not-self-referential",
        makeInput({
          id: "001-test",
          inputs: ["src/input.ts"],
          outputs: ["src/output.ts"],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("body-or-skill-required", () => {
    it("flags task with nothing executable", () => {
      const issues = runRule(
        "body-or-skill-required",
        makeInput({
          id: "001-test",
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
    });

    it("passes with body", () => {
      const issues = runRule(
        "body-or-skill-required",
        makeInput({
          id: "001-test",
          body: "Do something",
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("passes with skills", () => {
      const issues = runRule(
        "body-or-skill-required",
        makeInput({
          id: "001-test",
          skills: ["stitch-prompt"],
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("passes with executor", () => {
      const issues = runRule(
        "body-or-skill-required",
        makeInput({
          id: "001-test",
          executor: { type: "script", path: "./run.sh" },
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("passes with wbs", () => {
      const issues = runRule(
        "body-or-skill-required",
        makeInput({
          id: "001-test",
          wbs: { type: "nodejs", path: "./wbs.js" },
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("plan-output-path", () => {
    it("flags path outside project", () => {
      const issues = runRule(
        "plan-output-path",
        makeInput({
          id: "001-test",
          plan: { output: "../../outside/file.md" },
        }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes with path inside project", () => {
      const issues = runRule(
        "plan-output-path",
        makeInput({
          id: "001-test",
          plan: { output: ".converge/plan.md" },
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("check-cmd-syntax", () => {
    it("flags dangling operator", () => {
      const issues = runRule(
        "check-cmd-syntax",
        makeInput({
          id: "001-test",
          checks: [{ id: "lint", cmd: "npm run lint &&" }],
        }),
      );
      expect(issues).toHaveLength(1);
    });

    it("flags unclosed quotes", () => {
      const issues = runRule(
        "check-cmd-syntax",
        makeInput({
          id: "001-test",
          checks: [{ id: "check", cmd: "echo 'hello" }],
        }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes with valid command", () => {
      const issues = runRule(
        "check-cmd-syntax",
        makeInput({
          id: "001-test",
          checks: [{ id: "lint", cmd: "npm run lint && npm test" }],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });
});
