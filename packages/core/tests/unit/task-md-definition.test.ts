import { describe, it, expect } from "vitest";
import { parseTaskMdString } from "../../src/config/task-md-definition.ts";

describe("schema rejects goals fields", () => {
  it("rejects goals: as unknown field (sends to vars)", () => {
    const result = parseTaskMdString("---\ngoals:\n  - x\n---\n# body");

    // goals is no longer a recognized field — it ends up in vars
    expect((result as any).goals).toBeUndefined();
    expect(result.vars?.goals).toEqual(["x"]);
  });

  it("rejects goalDefs: as unknown field (sends to vars)", () => {
    const result = parseTaskMdString(
      "---\ngoalDefs:\n  - id: x\n    title: y\n    metric:\n      target: 0\n      direction: min\n---\n# body",
    );

    expect((result as any).goalDefs).toBeUndefined();
    expect(result.vars?.goalDefs).toBeDefined();
  });

  it("importing parse-goal.ts throws MODULE_NOT_FOUND", async () => {
    await expect(
      import("../../src/config/parse-goal.ts"),
    ).rejects.toMatchObject({ code: "ERR_MODULE_NOT_FOUND" });
  });
});
