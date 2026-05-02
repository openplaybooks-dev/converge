import { describe, it, expect } from "vitest";
import { parseChecks } from "../../src/config/skill-definition.ts";

describe("parseChecks — check union", () => {
  it("parses an inline cmd check", () => {
    const result = parseChecks([
      { id: "typecheck", cmd: "pnpm typecheck" },
    ]);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      id: "typecheck",
      cmd: "pnpm typecheck",
      description: "typecheck",
    });
  });

  it("parses a test ref in object form", () => {
    const result = parseChecks([
      { type: "test", name: "freshness", args: { path: "output.txt" } },
    ]);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      id: "test:freshness",
      type: "test",
      name: "freshness",
      args: { path: "output.txt" },
    });
  });

  it("parses a test ref in string shorthand form", () => {
    const result = parseChecks(["test:freshness(path=output.txt)"]);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      id: "test:freshness",
      type: "test",
      name: "freshness",
      args: { path: "output.txt" },
    });
  });

  it("parses string shorthand without args", () => {
    const result = parseChecks(["test:typecheck"]);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      id: "test:typecheck",
      type: "test",
      name: "typecheck",
      args: {},
    });
  });

  it("parses a mixed array of inline and test ref checks", () => {
    const result = parseChecks([
      { id: "typecheck", cmd: "pnpm typecheck" },
      { type: "test", name: "freshness", args: { path: "output.txt" } },
      "test:lint(format=true)",
    ]);
    expect(result).toHaveLength(3);
    expect(result![0].id).toBe("typecheck");
    expect(result![1].type).toBe("test");
    expect(result![1].name).toBe("freshness");
    expect(result![2].type).toBe("test");
    expect(result![2].name).toBe("lint");
    expect(result![2].args).toEqual({ format: "true" });
  });

  it("throws on malformed string shorthand", () => {
    expect(() => parseChecks(["test:"])).toThrow("Malformed test reference");
  });

  it("throws on malformed args in shorthand", () => {
    expect(() => parseChecks(["test:freshness(path)"])).toThrow("key=val");
  });

  it("throws on test object missing name", () => {
    expect(() => parseChecks([{ type: "test" }])).toThrow(
      'must have a "name" field',
    );
  });
});
