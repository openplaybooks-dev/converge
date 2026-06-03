import { describe, it, expect } from "vitest";
import { parseChecks } from "../../src/config/skill-definition.ts";

describe("parseChecks — explicit command checks", () => {
  it("parses an inline cmd check", () => {
    const result = parseChecks([{ id: "typecheck", cmd: "pnpm typecheck" }]);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      id: "typecheck",
      cmd: "pnpm typecheck",
      description: "typecheck",
    });
  });

  it("rejects string shorthand checks", () => {
    expect(() => parseChecks(["test:freshness(path=output.txt)"])).toThrow(
      /string shorthands are removed/i,
    );
  });

  it("rejects type:test checks", () => {
    expect(() =>
      parseChecks([
        { type: "test", name: "freshness", args: { path: "output.txt" } },
      ]),
    ).toThrow(/type: "test" are removed/i);
  });
});
