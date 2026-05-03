import { describe, it, expect } from "vitest";
import { parseSelector } from "../../src/select/parser.ts";
import { resolveSelector } from "../../src/select/resolver.ts";
import type { Manifest } from "../../src/select/resolver.ts";

function makeManifest(overrides?: Partial<Manifest>): Manifest {
  return {
    nodes: {
      "01-define": {
        state: "concrete",
        id: "01-define",
        depends_on: [],
        depended_on_by: ["02-visual-spec"],
        seed: null,
        testRefs: ["freshness"],
      },
      "02-visual-spec": {
        state: "concrete",
        id: "02-visual-spec",
        depends_on: ["01-define"],
        depended_on_by: ["03-tokens"],
        seed: null,
        testRefs: ["visual"],
      },
      "03-tokens": {
        state: "concrete",
        id: "03-tokens",
        depends_on: ["02-visual-spec"],
        depended_on_by: ["04-render"],
        seed: null,
        testRefs: ["freshness", "tokens"],
      },
      "04-render": {
        state: "concrete",
        id: "04-render",
        depends_on: ["03-tokens"],
        depended_on_by: [],
        seed: null,
      },
    },
    child_map: {
      "01-define": ["02-visual-spec"],
      "02-visual-spec": ["03-tokens"],
      "03-tokens": ["04-render"],
      "04-render": [],
    },
    parent_map: {
      "02-visual-spec": ["01-define"],
      "03-tokens": ["02-visual-spec"],
      "04-render": ["03-tokens"],
    },
    ...overrides,
  };
}

describe("test: selector", () => {
  it("test:freshness selects task with testRefs containing freshness", () => {
    const manifest = makeManifest();
    const selector = parseSelector("test:freshness");
    const result = resolveSelector(selector, manifest);
    expect(result.ids).toEqual(new Set(["01-define", "03-tokens"]));
  });

  it("test:* with glob matches all tasks that have any testRefs", () => {
    const manifest = makeManifest();
    const selector = parseSelector("test:*");
    const result = resolveSelector(selector, manifest);
    expect(result.ids).toEqual(
      new Set(["01-define", "02-visual-spec", "03-tokens"]),
    );
  });

  it("+test:freshness includes ancestors of matched tasks", () => {
    const manifest = makeManifest();
    const selector = parseSelector("+test:freshness");
    const result = resolveSelector(selector, manifest);
    // 01-define (matched), 03-tokens (matched),
    // 02-visual-spec (ancestor of 03), 01-define already included
    expect(result.ids).toContain("01-define");
    expect(result.ids).toContain("03-tokens");
    expect(result.ids).toContain("02-visual-spec");
  });

  it("test:freshness+ includes descendants of matched tasks", () => {
    const manifest = makeManifest();
    const selector = parseSelector("test:freshness+");
    const result = resolveSelector(selector, manifest);
    // 01-define (matched) + descendants: 02, 03, 04
    // 03-tokens (matched) + descendants: 04
    expect(result.ids).toContain("01-define");
    expect(result.ids).toContain("02-visual-spec");
    expect(result.ids).toContain("03-tokens");
    expect(result.ids).toContain("04-render");
  });

  it("@test:freshness resolves subgraph for matched tasks", () => {
    const manifest = makeManifest();
    const selector = parseSelector("@test:freshness");
    const result = resolveSelector(selector, manifest);
    // Match: 01-define, 03-tokens
    // For 01: ancestors of 01 (none) + descendants (02,03,04) + ancestors of each descendant
    // For 03: ancestors of 03 (02,01) + descendants (04) + ancestors of 04 (03,02,01)
    expect(result.ids).toContain("01-define");
    expect(result.ids).toContain("02-visual-spec");
    expect(result.ids).toContain("03-tokens");
    expect(result.ids).toContain("04-render");
  });
});
