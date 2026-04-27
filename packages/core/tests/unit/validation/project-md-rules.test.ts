import { describe, it, expect } from "vitest";
import { projectMdRules } from "../../../src/validation/rules/project-md.ts";
import type { ProjectMdValidationInput } from "../../../src/validation/rules/project-md.ts";

function makeInput(
  frontmatter: Record<string, unknown>,
  filePath = "/project/.converge/PROJECT.md",
): ProjectMdValidationInput {
  return { frontmatter, filePath };
}

function runRule(ruleId: string, input: ProjectMdValidationInput) {
  const rule = projectMdRules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`Rule "${ruleId}" not found`);
  return rule.check(input);
}

describe("PROJECT.md rules", () => {
  describe("project-name-required", () => {
    it("flags missing name", () => {
      const issues = runRule("project-name-required", makeInput({}));
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });

    it("flags empty string name", () => {
      const issues = runRule("project-name-required", makeInput({ name: "" }));
      expect(issues).toHaveLength(1);
    });

    it("flags non-string name", () => {
      const issues = runRule("project-name-required", makeInput({ name: 42 }));
      expect(issues).toHaveLength(1);
    });

    it("passes with valid name", () => {
      const issues = runRule(
        "project-name-required",
        makeInput({ name: "My App" }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("project-unknown-key", () => {
    it("flags unknown keys", () => {
      const issues = runRule(
        "project-unknown-key",
        makeInput({ name: "X", foo: "bar" }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].message).toContain("foo");
    });

    it("passes with only known keys", () => {
      const issues = runRule(
        "project-unknown-key",
        makeInput({
          name: "X",
          description: "Y",
          discovery: {},
          runtime: {},
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("project-discovery-shape", () => {
    it("flags non-object discovery", () => {
      const issues = runRule(
        "project-discovery-shape",
        makeInput({ discovery: "bad" }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });

    it("flags non-boolean watch", () => {
      const issues = runRule(
        "project-discovery-shape",
        makeInput({
          discovery: { watch: "yes" },
        }),
      );
      expect(issues.some((i) => i.field === "discovery.watch")).toBe(true);
    });

    it("flags invalid spawn value", () => {
      const issues = runRule(
        "project-discovery-shape",
        makeInput({
          discovery: { spawn: "anything" },
        }),
      );
      expect(issues.some((i) => i.field === "discovery.spawn")).toBe(true);
    });

    it("flags non-array tasks", () => {
      const issues = runRule(
        "project-discovery-shape",
        makeInput({
          discovery: { tasks: "glob" },
        }),
      );
      expect(issues.some((i) => i.field === "discovery.tasks")).toBe(true);
    });

    it("flags unknown discovery keys", () => {
      const issues = runRule(
        "project-discovery-shape",
        makeInput({
          discovery: { foo: true },
        }),
      );
      expect(issues.some((i) => i.message.includes("foo"))).toBe(true);
    });

    it("passes with valid discovery", () => {
      const issues = runRule(
        "project-discovery-shape",
        makeInput({
          discovery: { watch: false, spawn: "subtasks-only", tasks: ["*.ts"] },
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("skips when discovery is absent", () => {
      const issues = runRule("project-discovery-shape", makeInput({}));
      expect(issues).toHaveLength(0);
    });
  });

  describe("project-runtime-shape", () => {
    it("flags non-object runtime", () => {
      const issues = runRule(
        "project-runtime-shape",
        makeInput({ runtime: [] }),
      );
      expect(issues).toHaveLength(1);
    });

    it("flags non-boolean parallelExecution", () => {
      const issues = runRule(
        "project-runtime-shape",
        makeInput({
          runtime: { parallelExecution: "yes" },
        }),
      );
      expect(issues.some((i) => i.field === "runtime.parallelExecution")).toBe(
        true,
      );
    });

    it("flags invalid logLevel", () => {
      const issues = runRule(
        "project-runtime-shape",
        makeInput({
          runtime: { logLevel: "verbose" },
        }),
      );
      expect(issues.some((i) => i.field === "runtime.logLevel")).toBe(true);
    });

    it("flags non-string milestone", () => {
      const issues = runRule(
        "project-runtime-shape",
        makeInput({
          runtime: { milestone: 42 },
        }),
      );
      expect(issues.some((i) => i.field === "runtime.milestone")).toBe(true);
    });

    it("flags unknown runtime keys", () => {
      const issues = runRule(
        "project-runtime-shape",
        makeInput({
          runtime: { unknownOption: true },
        }),
      );
      expect(issues.some((i) => i.message.includes("unknownOption"))).toBe(
        true,
      );
    });

    it("passes with valid runtime", () => {
      const issues = runRule(
        "project-runtime-shape",
        makeInput({
          runtime: {
            maxIterations: 50,
            parallelExecution: true,
            logLevel: "info",
            milestone: "v1",
          },
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("project-hook-event-valid", () => {
    it("flags unknown hook event", () => {
      const issues = runRule(
        "project-hook-event-valid",
        makeInput({
          hooks: { "task:explode": "./boom.sh" },
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("task:explode");
    });

    it("passes with valid hook events", () => {
      const issues = runRule(
        "project-hook-event-valid",
        makeInput({
          hooks: {
            "task:fail": "./on-fail.sh",
            "project:complete": "./done.sh",
          },
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("skips when hooks is absent", () => {
      const issues = runRule("project-hook-event-valid", makeInput({}));
      expect(issues).toHaveLength(0);
    });
  });

  describe("project-hook-value-string", () => {
    it("flags non-string hook value", () => {
      const issues = runRule(
        "project-hook-value-string",
        makeInput({
          hooks: { "task:fail": 42 },
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("error");
    });

    it("passes with string hook values", () => {
      const issues = runRule(
        "project-hook-value-string",
        makeInput({
          hooks: { "task:fail": "./on-fail.sh" },
        }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("project-plugins-array", () => {
    it("flags non-array plugins", () => {
      const issues = runRule(
        "project-plugins-array",
        makeInput({ plugins: "typescript" }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes with array plugins", () => {
      const issues = runRule(
        "project-plugins-array",
        makeInput({ plugins: ["typescript"] }),
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("project-string-map-shape", () => {
    it("flags non-object agents", () => {
      const issues = runRule(
        "project-string-map-shape",
        makeInput({ agents: ["main"] }),
      );
      expect(issues).toHaveLength(1);
    });

    it("flags non-string agent value", () => {
      const issues = runRule(
        "project-string-map-shape",
        makeInput({
          agents: { default: 42 },
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].field).toBe("agents.default");
    });

    it("passes with valid agents map", () => {
      const issues = runRule(
        "project-string-map-shape",
        makeInput({
          agents: { default: ".converge/agents/main.md" },
        }),
      );
      expect(issues).toHaveLength(0);
    });

    it("validates skills the same way", () => {
      const issues = runRule(
        "project-string-map-shape",
        makeInput({
          skills: { plan: 123 },
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].field).toBe("skills.plan");
    });
  });

  describe("project-variables-object", () => {
    it("flags non-object variables", () => {
      const issues = runRule(
        "project-variables-object",
        makeInput({ variables: "bad" }),
      );
      expect(issues).toHaveLength(1);
    });

    it("flags array variables", () => {
      const issues = runRule(
        "project-variables-object",
        makeInput({ variables: ["bad"] }),
      );
      expect(issues).toHaveLength(1);
    });

    it("passes with object variables", () => {
      const issues = runRule(
        "project-variables-object",
        makeInput({ variables: { env: "prod" } }),
      );
      expect(issues).toHaveLength(0);
    });
  });
});
