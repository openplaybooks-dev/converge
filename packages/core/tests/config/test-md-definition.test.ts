import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("parses a py test", () => {
    const input = [
      "---",
      "name: catalog-shape",
      "type: py",
      "---",
      "import json; assert json.load(open('catalog.json'))",
    ].join("\n");

    const result = parseTestMd(input, "catalog.test.md");

    expect(result.type).toBe("py");
    expect(result.script).toContain("import json");
  });

  describe("external script files", () => {
    let tmp: string;

    beforeEach(() => {
      tmp = mkdtempSync(join(tmpdir(), "testmd-"));
    });

    afterEach(() => {
      rmSync(tmp, { recursive: true, force: true });
    });

    it("loads script from a sibling file via `script:`", () => {
      const sh = join(tmp, "file-exists.sh");
      writeFileSync(sh, 'test -f "{{ args.path }}"', "utf-8");
      const md = join(tmp, "file-exists.test.md");
      const input = [
        "---",
        "name: file-exists",
        "type: cmd",
        "args:",
        "  path: string",
        "script: ./file-exists.sh",
        "---",
      ].join("\n") + "\n";
      writeFileSync(md, input, "utf-8");

      const result = parseTestMd(input, md);

      expect(result.script).toBe('test -f "{{ args.path }}"');
      expect(result.scriptPath).toBe(sh);
    });

    it("supports absolute script paths", () => {
      const sh = join(tmp, "abs.sh");
      writeFileSync(sh, "echo abs", "utf-8");
      const md = join(tmp, "abs.test.md");
      const input = [
        "---",
        "name: abs",
        "type: cmd",
        `script: ${sh}`,
        "---",
      ].join("\n") + "\n";
      writeFileSync(md, input, "utf-8");

      const result = parseTestMd(input, md);

      expect(result.script).toBe("echo abs");
    });

    it("throws when external script file is missing", () => {
      const md = join(tmp, "missing.test.md");
      const input = [
        "---",
        "name: missing",
        "type: cmd",
        "script: ./does-not-exist.sh",
        "---",
      ].join("\n") + "\n";
      writeFileSync(md, input, "utf-8");

      expect(() => parseTestMd(input, md)).toThrow(/file not found/);
    });

    it("throws when both script: and an inline body are present", () => {
      const sh = join(tmp, "dup.sh");
      writeFileSync(sh, "echo external", "utf-8");
      const md = join(tmp, "dup.test.md");
      const input = [
        "---",
        "name: dup",
        "type: cmd",
        "script: ./dup.sh",
        "---",
        "echo inline",
      ].join("\n") + "\n";
      writeFileSync(md, input, "utf-8");

      expect(() => parseTestMd(input, md)).toThrow(/cannot set both/);
    });
  });
});
