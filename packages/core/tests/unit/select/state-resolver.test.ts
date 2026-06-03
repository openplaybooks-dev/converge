import { describe, it, expect } from "vitest";
import { parseSelector } from "../../../src/select/parser.ts";
import { resolveSelector } from "../../../src/select/resolver.ts";
import type { Manifest } from "../../../src/select/resolver.ts";

const HASH_A = "sha256:aaaaaaa";
const HASH_B = "sha256:bbbbbbb";

interface HashedManifest extends Manifest {
  metadata?: { playbook_hash: string };
  nodes: Record<
    string,
    {
      state: string;
      id: string;
      depends_on: string[];
      depended_on_by: string[];
      seed: { type: string; path: string } | null;
      tags?: string[];
      frontmatter_hash: string;
      body_hash: string;
      checks_hash: string;
      inputs_hash: string;
      upstream_hash: string;
    }
  >;
}

function hashFieldFor(sub: string): string {
  if (sub === "playbook") return "playbook_hash";
  if (sub === "drifted") return "drifted";
  return `${sub}_hash`;
}

function makeManifest<T extends Record<string, string>>(
  hashOverrides: T,
): HashedManifest {
  const defaults: Record<string, string> = {
    frontmatter_hash: HASH_A,
    body_hash: HASH_A,
    checks_hash: HASH_A,
    inputs_hash: HASH_A,
    upstream_hash: HASH_A,
  };
  const hashes = { ...defaults, ...hashOverrides };

  return {
    metadata: {
      playbook_hash:
        (hashOverrides as Record<string, string>).playbook_hash ?? HASH_A,
    },
    nodes: {
      "task-1": {
        state: "concrete",
        id: "task-1",
        depends_on: [],
        depended_on_by: [],
        seed: null,
        ...hashes,
      },
    },
    child_map: { "task-1": [] },
    parent_map: {},
  };
}

// Sub-methods: modified.body modified.frontmatter modified.checks
// modified.inputs modified.upstream modified.playbook modified.drifted
const SUB_METHODS = [
  "body",
  "frontmatter",
  "checks",
  "inputs",
  "upstream",
  "playbook",
  "drifted",
] as const;

describe("state:modified.<sub>", () => {
  describe.each(SUB_METHODS)("modified.%s", (sub) => {
    it("returns task whose hash changed for the sub-method", () => {
      const field = hashFieldFor(sub);
      const stateManifest = makeManifest({ [field]: HASH_A });
      const currentManifest = makeManifest({ [field]: HASH_B });

      const selector = parseSelector(`state:modified.${sub}`);
      // @ts-expect-error stateManifest not yet in opts type
      const result = resolveSelector(selector, currentManifest as Manifest, {
        stateManifest: stateManifest as Manifest,
      });

      expect(result.ids).toEqual(new Set(["task-1"]));
    });

    it("does NOT return tasks where only an unrelated field changed", () => {
      const field = hashFieldFor(sub);
      // Pick an unrelated field — different from the one under test
      const unrelatedSub = sub === "body" ? "frontmatter" : "body";
      const unrelatedField = hashFieldFor(unrelatedSub);

      const stateManifest = makeManifest({
        [field]: HASH_A,
        [unrelatedField]: HASH_A,
      });
      const currentManifest = makeManifest({
        [field]: HASH_A,
        [unrelatedField]: HASH_B,
      });

      const selector = parseSelector(`state:modified.${sub}`);
      // @ts-expect-error stateManifest not yet in opts type
      const result = resolveSelector(selector, currentManifest as Manifest, {
        stateManifest: stateManifest as Manifest,
      });

      expect(result.ids).toEqual(new Set());
    });
  });
});
