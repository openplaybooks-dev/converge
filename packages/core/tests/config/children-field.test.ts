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

describe("from_seed field — removed (RFC 0021/0022)", () => {
  it("throws a migration error when used", () => {
    expect(() => parseTaskMdString(md("from_seed: per-token"))).toThrow(
      /`from_seed:` is removed/,
    );
  });
});

describe("seed field — removed (RFC 0021/0022)", () => {
  it("throws a migration error when used", () => {
    expect(() =>
      parseTaskMdString(md("seed:\n  mode: cli")),
    ).toThrow(/`seed: \{ mode: cli \}` is removed/);
  });
});
