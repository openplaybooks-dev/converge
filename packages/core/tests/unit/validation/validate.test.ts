import { describe, it, expect } from "vitest";
import { validateTaskMd } from "../../../src/validation/validate.ts";
import type { TaskValidationInput } from "../../../src/validation/types.ts";
import type { TaskMdShape } from "../../../src/config/task-md-definition.ts";

function makeInput(
  shape: Partial<TaskMdShape> & { id: string },
  rawFrontmatter: Record<string, unknown> = {},
  overrides: Partial<TaskValidationInput> = {},
): TaskValidationInput {
  const id = shape.id;
  return {
    shape: shape as TaskMdShape,
    rawFrontmatter,
    filePath: `/project/.converge/epics/01/${id || "001-test"}/TASK.md`,
    taskDir: `/project/.converge/epics/01/${id || "001-test"}`,
    projectDir: "/project",
    ...overrides,
  };
}

describe("validateTaskMd", () => {
  it("returns valid for a well-formed task", () => {
    const result = validateTaskMd(
      makeInput(
        {
          id: "001-test",
          title: "Test Task",
          body: "Do something",
          outputs: ["src/file.ts"],
        },
        {
          id: "001-test",
          title: "Test Task",
          outputs: ["src/file.ts"],
        },
      ),
    );
    expect(result.valid).toBe(true);
    expect(result.taskId).toBe("001-test");
    // May have info-level issues (e.g., check-without-cmd), but no errors
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("returns invalid for task with errors", () => {
    const result = validateTaskMd(
      makeInput(
        {
          id: "",
          executor: { type: "ai" },
          seeds: [{ type: "nodejs", path: "./seeds/per-verb.seed.js" }],
        },
        { blocking: "yes" }, // wrong type
      ),
    );
    expect(result.valid).toBe(false);
    const errors = result.issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    // Should catch: id-required, executor-and-seeds-conflict, blocking-is-boolean
    const ruleIds = errors.map((e) => e.ruleId);
    expect(ruleIds).toContain("id-required");
    expect(ruleIds).toContain("executor-and-seeds-conflict");
    expect(ruleIds).toContain("blocking-is-boolean");
  });

  it("collects issues from all layers", () => {
    const result = validateTaskMd(
      makeInput(
        {
          id: "001-test",
          blocking: true,
          // no outputs → syntax warning
          dependencies: ["001-test"], // self-reference → syntax error
        },
        {
          dependencies: ["001-test"],
          blocking: true,
        },
      ),
    );
    const layers = new Set(result.issues.map((i) => i.layer));
    expect(layers.has("syntax")).toBe(true);
  });

  it("sets valid=true when only warnings/info present", () => {
    const result = validateTaskMd(
      makeInput(
        {
          id: "my-task", // non-standard id → warning
          body: "Do something",
          blocking: true,
          // no outputs → warning
        },
        { blocking: true },
      ),
    );
    // Has warnings but no errors
    const errors = result.issues.filter((i) => i.severity === "error");
    const warnings = result.issues.filter((i) => i.severity === "warning");
    expect(errors).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(result.valid).toBe(true);
  });
});
