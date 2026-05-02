import { describe, it, expect } from "vitest";
import { parseSeedMd } from "../../src/config/seed-md-definition.ts";

describe("parseSeedMd", () => {
  it("parses a valid nodejs seed", () => {
    const input = [
      "---",
      "name: per-verb",
      "description: Spawns container tasks per verb",
      "kind: nodejs",
      "args:",
      "  verbs: string",
      "---",
      "for (const verb of ctx.args.verbs.split(',')) {",
      "  ctx.spawn({ id: verb });",
      "}",
    ].join("\n");

    const result = parseSeedMd(input, "per-verb.seed.md");

    expect(result.name).toBe("per-verb");
    expect(result.description).toBe("Spawns container tasks per verb");
    expect(result.kind).toBe("nodejs");
    expect(result.args).toEqual({ verbs: { type: "string" } });
  });

  it("parses a shell seed", () => {
    const input = [
      "---",
      "name: init-dirs",
      "kind: shell",
      "---",
      "mkdir -p src/ tests/",
      "echo 'done'",
    ].join("\n");

    const result = parseSeedMd(input, "init-dirs.seed.md");

    expect(result.name).toBe("init-dirs");
    expect(result.kind).toBe("shell");
    expect(result.args).toEqual({});
  });

  it("defaults kind to nodejs", () => {
    const input = [
      "---",
      "name: minimal",
      "---",
      "ctx.spawn({ id: 'child' });",
    ].join("\n");

    const result = parseSeedMd(input, "minimal.seed.md");

    expect(result.kind).toBe("nodejs");
  });

  it("parses preview_manifest flag", () => {
    const input = [
      "---",
      "name: preview-seed",
      "kind: nodejs",
      "preview_manifest: true",
      "---",
      "ctx.spawn({ id: 'preview' });",
    ].join("\n");

    const result = parseSeedMd(input, "preview.seed.md");

    expect(result.preview_manifest).toBe(true);
  });

  it("parses args with defaults", () => {
    const input = [
      "---",
      "name: templated",
      "kind: nodejs",
      "args:",
      "  count:",
      "    type: number",
      "    default: 3",
      "  label: string",
      "---",
      "for (let i = 0; i < ctx.args.count; i++) {",
      "  ctx.spawn({ id: `task-${i}` });",
      "}",
    ].join("\n");

    const result = parseSeedMd(input, "templated.seed.md");

    expect(result.args.count).toEqual({ type: "number", default: 3 });
    expect(result.args.label).toEqual({ type: "string" });
  });

  it("throws on missing name", () => {
    const input = [
      "---",
      "kind: nodejs",
      "---",
      "ctx.spawn({ id: 'x' });",
    ].join("\n");

    expect(() => parseSeedMd(input, "test.seed.md")).toThrow();
  });

  it("throws on unknown frontmatter field", () => {
    const input = [
      "---",
      "name: test",
      "kind: nodejs",
      "bogus_field: nope",
      "---",
      "ctx.spawn({ id: 'x' });",
    ].join("\n");

    expect(() => parseSeedMd(input, "test.seed.md")).toThrow();
  });

  it("throws when frontmatter is missing", () => {
    const input = "just a script, no frontmatter";

    expect(() => parseSeedMd(input, "test.seed.md")).toThrow("Missing YAML frontmatter");
  });
});
