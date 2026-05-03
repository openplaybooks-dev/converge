import { describe, it, expect } from "vitest";
import { parseTaskMdString } from "../../src/config/task-md-definition.ts";

function md(frontmatter: string): string {
  return `---\n${frontmatter}\n---\n\nTask body.`;
}

describe("children field", () => {
  it("parses bare id strings", () => {
    const result = parseTaskMdString(md("children:\n  - 01-foo\n  - 02-bar")) as any;
    expect(result.children).toEqual([{ id: "01-foo" }, { id: "02-bar" }]);
  });

  it("parses object form with path", () => {
    const result = parseTaskMdString(
      md("children:\n  - id: 03-shared\n    path: ../../_shared/some-task/TASK.md"),
    ) as any;
    expect(result.children).toEqual([
      { id: "03-shared", path: "../../_shared/some-task/TASK.md" },
    ]);
  });

  it("parses mixed bare and object forms", () => {
    const result = parseTaskMdString(
      md("children:\n  - 01-foo\n  - id: 02-bar\n    path: ./alt/TASK.md"),
    ) as any;
    expect(result.children).toEqual([
      { id: "01-foo" },
      { id: "02-bar", path: "./alt/TASK.md" },
    ]);
  });
});

describe("from_seed field", () => {
  it("parses as string", () => {
    const result = parseTaskMdString(md("from_seed: per-token")) as any;
    expect(result.from_seed).toBe("per-token");
  });
});

describe("coexistence", () => {
  it("parses both children and from_seed together", () => {
    const result = parseTaskMdString(
      md("children:\n  - 01-static\nfrom_seed: dynamic-tasks"),
    ) as any;
    expect(result.children).toBeDefined();
    expect(result.from_seed).toBeDefined();
  });
});

describe("validation", () => {
  it("rejects empty child id", () => {
    expect(() => parseTaskMdString(md("children:\n  - ''"))).toThrow(
      "child id must not be empty",
    );
  });

  it("rejects absolute child path", () => {
    expect(() =>
      parseTaskMdString(md("children:\n  - id: foo\n    path: /absolute/path/TASK.md")),
    ).toThrow("child path must be relative");
  });

  it("rejects duplicate child ids", () => {
    expect(() =>
      parseTaskMdString(md("children:\n  - 01-foo\n  - 01-foo")),
    ).toThrow("duplicate child id: 01-foo");
  });
});

describe("RESERVED_KEYS", () => {
  it("excludes children and from_seed from vars", () => {
    const result = parseTaskMdString(
      md("children:\n  - 01-foo\nfrom_seed: per-token"),
    );
    // These keys should be reserved, not passed through to vars
    expect(result.vars?.children).toBeUndefined();
    expect(result.vars?.from_seed).toBeUndefined();
  });
});
