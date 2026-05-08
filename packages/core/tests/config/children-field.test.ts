import { describe, it, expect } from "vitest";
import { parseTaskMdString } from "../../src/config/task-md-definition.ts";

function md(frontmatter: string): string {
  return `---\n${frontmatter}\n---\n\nTask body.`;
}

describe("children field", () => {
  it("no longer parses as a first-class field (removed subtasks)", () => {
    const result = parseTaskMdString(md("children:\n  - 01-foo\n  - 02-bar")) as any;
    expect(result.children).toBeUndefined();
  });

  it("passes children through to vars", () => {
    const result = parseTaskMdString(md("children:\n  - 01-foo\n  - 02-bar")) as any;
    expect(result.vars?.children).toEqual(["01-foo", "02-bar"]);
  });
});

describe("from_seed field", () => {
  it("parses as string", () => {
    const result = parseTaskMdString(md("from_seed: per-token")) as any;
    expect(result.from_seed).toBe("per-token");
  });
});

describe("coexistence", () => {
  it("parses from_seed; children is just vars", () => {
    const result = parseTaskMdString(
      md("children:\n  - 01-static\nfrom_seed: dynamic-tasks"),
    ) as any;
    expect(result.children).toBeUndefined();
    expect(result.from_seed).toBeDefined();
    expect(result.vars?.children).toEqual(["01-static"]);
  });
});

describe("RESERVED_KEYS", () => {
  it("children is no longer reserved — passes through to vars", () => {
    const result = parseTaskMdString(
      md("children:\n  - 01-foo\nfrom_seed: per-token"),
    );
    expect(result.vars?.children).toBeDefined();
    expect(result.vars?.from_seed).toBeUndefined();
  });
});
