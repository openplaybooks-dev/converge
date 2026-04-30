import { describe, it, expect } from "vitest";
import { parseSelector } from "../../../src/select/parser.ts";

describe("parseSelector", () => {
  describe("bare values (default to name:)", () => {
    it("parses a bare word as name: selector", () => {
      const result = parseSelector("foo");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "foo",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses a task ID with dashes as name: selector", () => {
      const result = parseSelector("03-tokens");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "03-tokens",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });
  });

  describe("explicit methods", () => {
    it("recognizes tag: method", () => {
      const result = parseSelector("tag:image");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "tag",
          value: "image",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("recognizes phase: method", () => {
      const result = parseSelector("phase:render");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "phase",
          value: "render",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("recognizes path: method", () => {
      const result = parseSelector("path:tasks/keyframes");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "path",
          value: "tasks/keyframes",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("recognizes status: method", () => {
      const result = parseSelector("status:failed");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "status",
          value: "failed",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("recognizes result: method", () => {
      const result = parseSelector("result:error");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "result",
          value: "error",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });
  });

  describe("graph operators", () => {
    it("parses + suffix as descendants operator", () => {
      const result = parseSelector("03-tokens+");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "03-tokens",
          ancestors: null,
          descendants: 0,
          subgraph: false,
        },
      });
    });

    it("parses + prefix as ancestors operator", () => {
      const result = parseSelector("+03-tokens");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "03-tokens",
          ancestors: 0,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses + prefix and + suffix as full lineage", () => {
      const result = parseSelector("+03-tokens+");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "03-tokens",
          ancestors: 0,
          descendants: 0,
          subgraph: false,
        },
      });
    });

    it("parses N+ prefix as depth-limited ancestors", () => {
      const result = parseSelector("2+task");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "task",
          ancestors: 2,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses +N suffix as depth-limited descendants", () => {
      const result = parseSelector("task+3");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "task",
          ancestors: null,
          descendants: 3,
          subgraph: false,
        },
      });
    });

    it("parses depth-limited ancestors with explicit method", () => {
      const result = parseSelector("2+tag:image");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "tag",
          value: "image",
          ancestors: 2,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses depth-limited descendants with explicit method", () => {
      const result = parseSelector("tag:image+3");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "tag",
          value: "image",
          ancestors: null,
          descendants: 3,
          subgraph: false,
        },
      });
    });
  });

  describe("@ subgraph operator", () => {
    it("parses @ prefix as full subgraph", () => {
      const result = parseSelector("@06-storyboard");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "06-storyboard",
          ancestors: null,
          descendants: null,
          subgraph: true,
        },
      });
    });

    it("parses @ with explicit method", () => {
      const result = parseSelector("@tag:image");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "tag",
          value: "image",
          ancestors: null,
          descendants: null,
          subgraph: true,
        },
      });
    });
  });

  describe("glob patterns", () => {
    it("parses *surrounding* as glob pattern", () => {
      const result = parseSelector("*keyframe*");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "*keyframe*",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses glob with graph operators", () => {
      const result = parseSelector("*token*+");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "name",
          value: "*token*",
          ancestors: null,
          descendants: 0,
          subgraph: false,
        },
      });
    });
  });

  describe("set operators", () => {
    it("parses space as union of two atoms", () => {
      const result = parseSelector("a b");
      expect(result).toEqual({
        type: "union",
        operands: [
          {
            type: "atom",
            atom: {
              method: "name",
              value: "a",
              ancestors: null,
              descendants: null,
              subgraph: false,
            },
          },
          {
            type: "atom",
            atom: {
              method: "name",
              value: "b",
              ancestors: null,
              descendants: null,
              subgraph: false,
            },
          },
        ],
      });
    });

    it("parses comma as intersection of two atoms", () => {
      const result = parseSelector("a,b");
      expect(result).toEqual({
        type: "intersection",
        operands: [
          {
            type: "atom",
            atom: {
              method: "name",
              value: "a",
              ancestors: null,
              descendants: null,
              subgraph: false,
            },
          },
          {
            type: "atom",
            atom: {
              method: "name",
              value: "b",
              ancestors: null,
              descendants: null,
              subgraph: false,
            },
          },
        ],
      });
    });

    it("gives comma higher precedence than space (comma > space)", () => {
      const result = parseSelector("tag:a,phase:b c");
      // Should parse as: (tag:a AND phase:b) OR c
      expect(result).toEqual({
        type: "union",
        operands: [
          {
            type: "intersection",
            operands: [
              {
                type: "atom",
                atom: {
                  method: "tag",
                  value: "a",
                  ancestors: null,
                  descendants: null,
                  subgraph: false,
                },
              },
              {
                type: "atom",
                atom: {
                  method: "phase",
                  value: "b",
                  ancestors: null,
                  descendants: null,
                  subgraph: false,
                },
              },
            ],
          },
          {
            type: "atom",
            atom: {
              method: "name",
              value: "c",
              ancestors: null,
              descendants: null,
              subgraph: false,
            },
          },
        ],
      });
    });

    it("parses union of three atoms", () => {
      const result = parseSelector("a b c");
      expect(result).toEqual({
        type: "union",
        operands: [
          {
            type: "atom",
            atom: {
              method: "name",
              value: "a",
              ancestors: null,
              descendants: null,
              subgraph: false,
            },
          },
          {
            type: "atom",
            atom: {
              method: "name",
              value: "b",
              ancestors: null,
              descendants: null,
              subgraph: false,
            },
          },
          {
            type: "atom",
            atom: {
              method: "name",
              value: "c",
              ancestors: null,
              descendants: null,
              subgraph: false,
            },
          },
        ],
      });
    });
  });

  describe("state:modified sub-methods", () => {
    const subMethods = [
      "body",
      "frontmatter",
      "checks",
      "inputs",
      "upstream",
      "playbook",
      "drifted",
    ];

    for (const sub of subMethods) {
      it(`parses state:modified.${sub}`, () => {
        const result = parseSelector(`state:modified.${sub}`);
        expect(result).toEqual({
          type: "atom",
          atom: {
            method: "state",
            value: `modified.${sub}`,
            ancestors: null,
            descendants: null,
            subgraph: false,
          },
        });
      });
    }
  });

  describe("frontier:, expected:, concrete:, wbs:, selector: methods", () => {
    it("parses frontier: selector", () => {
      const result = parseSelector("frontier:");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "frontier",
          value: "",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses expected: selector", () => {
      const result = parseSelector("expected:");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "expected",
          value: "",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses concrete: selector", () => {
      const result = parseSelector("concrete:");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "concrete",
          value: "",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses wbs: selector", () => {
      const result = parseSelector("wbs:unseeded");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "wbs",
          value: "unseeded",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });

    it("parses selector: selector", () => {
      const result = parseSelector("selector:nightly");
      expect(result).toEqual({
        type: "atom",
        atom: {
          method: "selector",
          value: "nightly",
          ancestors: null,
          descendants: null,
          subgraph: false,
        },
      });
    });
  });
});
