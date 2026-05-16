/**
 * Strict parse-time schema validation — list-typed reserved fields
 * (outputs, inputs, depends_on, tags, skills, requires) MUST be lists
 * of strings or omitted. A scalar/number/object at any of these
 * positions is rejected at parse time, not silently dropped.
 *
 * This catches the audit's "outputs: 42 silently becomes no-outputs"
 * hazard before it can produce false-positive verifies.
 */

import { describe, it, expect } from "vitest";
import { parseTaskMdString } from "../../src/config/task-md-definition.ts";

describe("strict list-field parsing", () => {
  it("accepts a proper YAML list of strings", () => {
    const md = [
      "---",
      "id: t",
      "outputs:",
      "  - src/a.ts",
      "  - src/b.ts",
      "---",
      "",
    ].join("\n");
    const shape = parseTaskMdString(md);
    expect(shape.outputs).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("accepts a bare string (legacy compat — wrapped as 1-elem list)", () => {
    const md = ["---", "id: t", "outputs: src/foo.ts", "---", ""].join("\n");
    const shape = parseTaskMdString(md);
    expect(shape.outputs).toEqual(["src/foo.ts"]);
  });

  it("rejects a number where a list is expected", () => {
    const md = ["---", "id: t", "outputs: 42", "---", ""].join("\n");
    expect(() => parseTaskMdString(md)).toThrow(
      /outputs.*must be a YAML list of strings.*number/,
    );
  });

  it("rejects a boolean where a list is expected", () => {
    const md = ["---", "id: t", "outputs: true", "---", ""].join("\n");
    // YAML's `true` is parsed as boolean — the strict parser must reject.
    expect(() => parseTaskMdString(md)).toThrow(
      /outputs.*must be a YAML list/,
    );
  });

  it("rejects a list containing an object item", () => {
    const md = [
      "---",
      "id: t",
      "outputs:",
      "  - src/a.ts",
      "  - { evil: object }",
      "---",
      "",
    ].join("\n");
    expect(() => parseTaskMdString(md)).toThrow(
      /outputs\[1\].*must be a string.*object/,
    );
  });

  it("error message names the offending field", () => {
    const md = ["---", "id: t", "depends_on: 1", "---", ""].join("\n");
    expect(() => parseTaskMdString(md)).toThrow(/depends_on/);
  });

  it("rejects empty-array vs accepts undefined consistently", () => {
    // outputs: [] in YAML is an empty list → undefined (omitted).
    const md = ["---", "id: t", "outputs: []", "---", ""].join("\n");
    const shape = parseTaskMdString(md);
    expect(shape.outputs).toBeUndefined();
  });

  it("inputs, tags, skills, depends_on all enforced", () => {
    for (const field of ["inputs", "tags", "skills", "depends_on", "requires"]) {
      const md = ["---", "id: t", `${field}: 42`, "---", ""].join("\n");
      expect(() => parseTaskMdString(md)).toThrow(
        new RegExp(`${field}.*must be a YAML list`),
      );
    }
  });
});
