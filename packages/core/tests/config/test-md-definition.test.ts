import { describe, it, expect } from "vitest";
import { parseTestMd } from "../../src/config/test-md-definition.ts";

describe("parseTestMd", () => {
  it("parses a valid cmd test", () => {
    const input = [
      "---",
      "name: freshness",
      "description: Assert file is non-empty",
      "type: cmd",
      "args:",
      "  path: string",
      "---",
      "test -s \"{{ args.path }}\"",
    ].join("\n");

    const result = parseTestMd(input, "test.test.md");

    expect(result.name).toBe("freshness");
    expect(result.description).toBe("Assert file is non-empty");
    expect(result.type).toBe("cmd");
    expect(result.args).toEqual({ path: { type: "string" } });
    expect(result.script).toBe('test -s "{{ args.path }}"');
  });

  it("parses a valid js test", () => {
    const input = [
      "---",
      "name: api-check",
      "type: js",
      "args:",
      "  endpoint: string",
      "---",
      "context.assert(context.inputs.length > 0, \"No input files\");",
      "const data = JSON.parse(context.readFile(context.inputs[0]));",
      "context.assert(data.status === \"ok\", \"Expected ok status, got \" + data.status);",
    ].join("\n");

    const result = parseTestMd(input, "api.test.md");

    expect(result.name).toBe("api-check");
    expect(result.type).toBe("js");
    expect(result.args).toEqual({ endpoint: { type: "string" } });
    expect(result.script).toContain("context.assert");
  });

  it("throws on unknown frontmatter field", () => {
    const input = [
      "---",
      "name: test",
      "type: cmd",
      "unknown_field: blah",
      "---",
      "echo hi",
    ].join("\n");

    expect(() => parseTestMd(input, "test.test.md")).toThrow();
  });

  it("throws on missing name", () => {
    const input = [
      "---",
      "type: cmd",
      "---",
      "echo hi",
    ].join("\n");

    expect(() => parseTestMd(input, "test.test.md")).toThrow();
  });

  it("parses args with defaults", () => {
    const input = [
      "---",
      "name: timeout-check",
      "type: cmd",
      "args:",
      "  timeout:",
      "    type: number",
      "    default: 5000",
      "  path: string",
      "---",
      "sleep {{ args.timeout }}",
    ].join("\n");

    const result = parseTestMd(input, "test.test.md");

    expect(result.args.timeout).toEqual({ type: "number", default: 5000 });
    expect(result.args.path).toEqual({ type: "string" });
  });

  it("throws when frontmatter is missing", () => {
    const input = "just a script, no frontmatter";

    expect(() => parseTestMd(input, "test.test.md")).toThrow("Missing YAML frontmatter");
  });
});
