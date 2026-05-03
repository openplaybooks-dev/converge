import { describe, it, expect } from "vitest";
import { parseTaskMdString } from "../../src/config/task-md-definition.ts";

function md(frontmatter: string): string {
  return `---\n${frontmatter}\n---\n\nTask body.`;
}

describe("from_seed field", () => {
  it("parses as string", () => {
    const result = parseTaskMdString(md("from_seed: per-token")) as any;
    expect(result.from_seed).toBe("per-token");
  });

  it("parses with dashes", () => {
    const result = parseTaskMdString(md("from_seed: my-seed-name")) as any;
    expect(result.from_seed).toBe("my-seed-name");
  });

  it("is undefined when absent", () => {
    const result = parseTaskMdString(md("title: Test")) as any;
    expect(result.from_seed).toBeUndefined();
  });

  it("rejects empty string", () => {
    expect(() => parseTaskMdString(md("from_seed: ''"))).toThrow(
      "from_seed: must be a non-empty string",
    );
  });

  it("excluded from vars", () => {
    const result = parseTaskMdString(md("from_seed: per-token"));
    expect(result.vars?.from_seed).toBeUndefined();
  });
});
