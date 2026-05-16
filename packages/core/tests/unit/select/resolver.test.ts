import { describe, it, expect } from "vitest";
import { parseSelector } from "../../../src/select/parser.ts";
import { resolveSelector } from "../../../src/select/resolver.ts";
import type { Manifest } from "../../../src/select/resolver.ts";

function makeManifest(overrides?: Partial<Manifest>): Manifest {
  return {
    nodes: {
      "01-define": {
        state: "concrete",
        id: "01-define",
        depends_on: [],
        depended_on_by: ["02-visual-spec"],
        seed: null,
      },
      "02-visual-spec": {
        state: "concrete",
        id: "02-visual-spec",
        depends_on: ["01-define"],
        depended_on_by: ["03-tokens"],
        seed: null,
      },
      "03-tokens": {
        state: "concrete",
        id: "03-tokens",
        depends_on: ["02-visual-spec"],
        depended_on_by: ["04-render"],
        seed: null,
      },
      "04-render": {
        state: "concrete",
        id: "04-render",
        depends_on: ["03-tokens"],
        depended_on_by: [],
        seed: null,
      },
      "05-unseeded-seed": {
        state: "frontier",
        id: "05-unseeded-seed",
        depends_on: ["04-render"],
        depended_on_by: [],
        seed: { mode: "cli" },
      },
    },
    child_map: {
      "01-define": ["02-visual-spec"],
      "02-visual-spec": ["03-tokens"],
      "03-tokens": ["04-render"],
      "04-render": ["05-unseeded-seed"],
      "05-unseeded-seed": [],
    },
    parent_map: {
      "02-visual-spec": ["01-define"],
      "03-tokens": ["02-visual-spec"],
      "04-render": ["03-tokens"],
      "05-unseeded-seed": ["04-render"],
    },
    ...overrides,
  };
}

describe("resolveSelector", () => {
  describe("name: method (bare value)", () => {
    it("resolves exact task ID match", () => {
      const manifest = makeManifest();
      const selector = parseSelector("01-define");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(new Set(["01-define"]));
    });

    it("resolves substring match", () => {
      const manifest = makeManifest();
      const selector = parseSelector("visual");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(new Set(["02-visual-spec"]));
    });
  });

  describe("descendants operator (+)", () => {
    it("resolves task and all descendants", () => {
      const manifest = makeManifest();
      const selector = parseSelector("02-visual-spec+");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(
        new Set(["02-visual-spec", "03-tokens", "04-render"]),
      );
    });
  });

  describe("ancestors operator (+prefix)", () => {
    it("resolves task and all ancestors", () => {
      const manifest = makeManifest();
      const selector = parseSelector("+04-render");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(
        new Set(["04-render", "03-tokens", "02-visual-spec", "01-define"]),
      );
    });
  });

  describe("full lineage (+prefix and +suffix)", () => {
    it("resolves task, ancestors, and descendants", () => {
      const manifest = makeManifest();
      const selector = parseSelector("+03-tokens+");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(
        new Set([
          "03-tokens",
          "02-visual-spec",
          "01-define",
          "04-render",
        ]),
      );
    });
  });

  describe("depth-limited operators", () => {
    it("resolves upstream with depth limit", () => {
      const manifest = makeManifest();
      const selector = parseSelector("1+04-render");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(new Set(["04-render", "03-tokens"]));
    });

    it("resolves downstream with depth limit", () => {
      const manifest = makeManifest();
      const selector = parseSelector("02-visual-spec+2");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(
        new Set(["02-visual-spec", "03-tokens", "04-render"]),
      );
    });
  });

  describe("@ subgraph operator", () => {
    it("resolves task + ancestors + ancestors-of-descendants", () => {
      const manifest = makeManifest();
      const selector = parseSelector("@04-render");
      const result = resolveSelector(selector, manifest);
      // @04-render: 04-render + ancestors (03-tokens, 02-visual-spec, 01-define)
      // + ancestors of descendants: 04-render has child 05-unseeded-seed, whose
      // ancestors are already included
      // So: all tasks reachable via "ancestors" and "ancestors of descendants"
      expect(result.ids).toContain("04-render");
      expect(result.ids).toContain("01-define");
      expect(result.ids).toContain("02-visual-spec");
      expect(result.ids).toContain("03-tokens");
    });
  });

  describe("frontier detection", () => {
    it("surfaces frontier flag when descendants cross unseeded Seed", () => {
      const manifest = makeManifest();
      // 04-render+ includes 05-unseeded-seed which is a frontier node
      const selector = parseSelector("04-render+");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toContain("04-render");
      expect(result.frontiers).toBeDefined();
      expect(result.frontiers!.length).toBeGreaterThan(0);
      expect(result.frontiers![0]).toMatchObject({
        parentId: "05-unseeded-seed",
        reason: "unseeded-seed",
      });
    });

    it("returns empty frontiers when selection is fully concrete", () => {
      const manifest = makeManifest();
      const selector = parseSelector("01-define");
      const result = resolveSelector(selector, manifest);
      expect(result.frontiers).toEqual([]);
    });
  });

  describe("set operators", () => {
    it("union (space) combines results", () => {
      const manifest = makeManifest();
      const selector = parseSelector("01-define 04-render");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(new Set(["01-define", "04-render"]));
    });

    it("intersection (comma) returns overlap", () => {
      const manifest = makeManifest();
      // 02-visual-spec+  selects: 02-visual-spec, 03-tokens, 04-render
      // +04-render       selects: 04-render, 03-tokens, 02-visual-spec, 01-define
      // intersection:    02-visual-spec, 03-tokens, 04-render
      const selector = parseSelector("02-visual-spec+,+04-render");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(
        new Set(["02-visual-spec", "03-tokens", "04-render"]),
      );
    });

    it("composes union and intersection with correct precedence", () => {
      const manifest = makeManifest();
      // (01-define AND 02-visual-spec) OR 04-render
      // intersection is empty (no overlap), so result = union with 04-render
      const selector = parseSelector("01-define,02-visual-spec 04-render");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(new Set(["04-render"]));
    });
  });

  describe("exclude semantics", () => {
    it("subtracts excluded set after select", () => {
      const manifest = makeManifest();
      const select = parseSelector("02-visual-spec+");
      const exclude = parseSelector("04-render");
      const result = resolveSelector(select, manifest, { exclude });
      expect(result.ids).toEqual(
        new Set(["02-visual-spec", "03-tokens"]),
      );
    });

    it("handles exclude that removes everything", () => {
      const manifest = makeManifest();
      const select = parseSelector("01-define");
      const exclude = parseSelector("01-define");
      const result = resolveSelector(select, manifest, { exclude });
      expect(result.ids).toEqual(new Set());
    });
  });

  describe("tag: method", () => {
    it("resolves tag: method against manifest node tags", () => {
      const manifest = makeManifest({
        nodes: {
          "01-define": {
            state: "concrete",
            id: "01-define",
            tags: ["phase", "define"],
            depends_on: [],
            depended_on_by: ["02-visual-spec"],
            seed: null,
          },
          "02-visual-spec": {
            state: "concrete",
            id: "02-visual-spec",
            tags: ["phase", "visual"],
            depends_on: ["01-define"],
            depended_on_by: [],
            seed: null,
          },
        },
        child_map: { "01-define": ["02-visual-spec"], "02-visual-spec": [] },
        parent_map: { "02-visual-spec": ["01-define"] },
      });
      const selector = parseSelector("tag:visual");
      const result = resolveSelector(selector, manifest);
      expect(result.ids).toEqual(new Set(["02-visual-spec"]));
    });
  });
});
