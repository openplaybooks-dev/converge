import { describe, it, expect } from "vitest";
import { syntaxRules } from "../../../src/validation/rules/syntax.ts";
import type { TaskValidationInput } from "../../../src/validation/types.ts";
import type { TaskMdShape } from "../../../src/config/task-md-definition.ts";

function makeInput(
  shape: Partial<TaskMdShape> & { id: string },
  rawFrontmatter: Record<string, unknown> = {},
): TaskValidationInput {
  return {
    shape: shape as TaskMdShape,
    rawFrontmatter,
    filePath: "/project/.converge/epics/01/001-test/TASK.md",
    taskDir: "/project/.converge/epics/01/001-test",
    projectDir: "/project",
  };
}

function runRule(ruleId: string, input: TaskValidationInput) {
  const rule = syntaxRules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`Rule "${ruleId}" not found`);
  return rule.check(input);
}

describe("syntax rules", () => {
  describe("executor-and-seed-conflict", () => {
    it("flags both executor and seed", () => {
      const issues = runRule(
        "executor-and-seed-conflict",
        makeInput({
          id: "001-test",
          executor: { type: "ai" },
          seed: { mode: "cli" },
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });

    it("passes with only executor", () => {
      const issues = runRule(
        "executor-and-seed-conflict",
        makeInput({
          id: "001-test",
          executor: { type: "ai" },
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("passes with only seed", () => {
      const issues = runRule(
        "executor-and-seed-conflict",
        makeInput({
          id: "001-test",
          seed: { mode: "cli" },
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("executor-and-skills-conflict", () => {
    it("flags script executor with skills", () => {
      const issues = runRule(
        "executor-and-skills-conflict",
        makeInput({
          id: "001-test",
          executor: { type: "script", path: "./run.sh" },
          skills: ["stitch-prompt"],
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
    });

    it("passes with ai executor and skills", () => {
      const issues = runRule(
        "executor-and-skills-conflict",
        makeInput({
          id: "001-test",
          executor: { type: "ai" },
          skills: ["stitch-prompt"],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("blocking-without-outputs", () => {
    it("flags blocking with no outputs", () => {
      const issues = runRule(
        "blocking-without-outputs",
        makeInput({
          id: "001-test",
          blocking: true,
        }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes blocking with outputs", () => {
      const issues = runRule(
        "blocking-without-outputs",
        makeInput({
          id: "001-test",
          blocking: true,
          outputs: ["src/file.ts"],
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("passes non-blocking without outputs", () => {
      const issues = runRule(
        "blocking-without-outputs",
        makeInput({
          id: "001-test",
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("depends_on-self-reference", () => {
    it("flags self-dependency", () => {
      const issues = runRule(
        "depends_on-self-reference",
        makeInput({
          id: "001-test",
          depends_on: ["001-test"],
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });

    it("passes with external dependencies", () => {
      const issues = runRule(
        "depends_on-self-reference",
        makeInput({
          id: "001-test",
          depends_on: ["000-setup"],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("duplicate-check-ids", () => {
    it("flags duplicate check ids", () => {
      const issues = runRule(
        "duplicate-check-ids",
        makeInput({
          id: "001-test",
          checks: [
            { id: "lint", cmd: "npm run lint" },
            { id: "lint", cmd: "npm run lint:fix" },
          ],
        }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes with unique check ids", () => {
      const issues = runRule(
        "duplicate-check-ids",
        makeInput({
          id: "001-test",
          checks: [
            { id: "lint", cmd: "npm run lint" },
            { id: "test", cmd: "npm test" },
          ],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("duplicate-output-paths", () => {
    it("flags duplicate outputs", () => {
      const issues = runRule(
        "duplicate-output-paths",
        makeInput({
          id: "001-test",
          outputs: ["src/file.ts", "src/file.ts"],
        }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes with unique outputs", () => {
      const issues = runRule(
        "duplicate-output-paths",
        makeInput({
          id: "001-test",
          outputs: ["src/a.ts", "src/b.ts"],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("inputs-outputs-overlap", () => {
    it("flags overlapping paths", () => {
      const issues = runRule(
        "inputs-outputs-overlap",
        makeInput({
          id: "001-test",
          inputs: ["src/shared.ts"],
          outputs: ["src/shared.ts"],
        }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes with no overlap", () => {
      const issues = runRule(
        "inputs-outputs-overlap",
        makeInput({
          id: "001-test",
          inputs: ["src/in.ts"],
          outputs: ["src/out.ts"],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("check-without-cmd", () => {
    it("reports check with no cmd as info", () => {
      const issues = runRule(
        "check-without-cmd",
        makeInput({
          id: "001-test",
          checks: [{ id: "manual-review" }],
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("info");
    });

    it("passes when check has cmd", () => {
      const issues = runRule(
        "check-without-cmd",
        makeInput({
          id: "001-test",
          checks: [{ id: "lint", cmd: "npm run lint" }],
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("empty-skills-array", () => {
    it("flags empty skills array in raw frontmatter", () => {
      const issues = runRule(
        "empty-skills-array",
        makeInput({ id: "001-test" }, { skills: [] }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes with populated skills array", () => {
      const issues = runRule(
        "empty-skills-array",
        makeInput({ id: "001-test" }, { skills: ["stitch-prompt"] }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("body-and-prompt-both-set", () => {
    it("reports info when both body and prompt are set", () => {
      const issues = runRule(
        "body-and-prompt-both-set",
        makeInput({
          id: "001-test",
          body: "body text",
          prompt: "prompt text",
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("info");
    });

    it("passes with only body", () => {
      const issues = runRule(
        "body-and-prompt-both-set",
        makeInput({
          id: "001-test",
          body: "body text",
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });
});
