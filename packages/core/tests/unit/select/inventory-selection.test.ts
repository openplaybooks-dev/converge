import { describe, it, expect } from "vitest";
import { parseSelector } from "../../../src/select/parser.ts";
import { resolveSelector } from "../../../src/select/resolver.ts";
import type { Manifest } from "../../../src/select/resolver.ts";

/**
 * Tests for selecting inventory/spawned tasks directly.
 *
 * The key invariant: a task that exists in the inventory (tasks.jsonl)
 * should be selectable and runnable even if its spawner parent was
 * previously dropped or skipped.
 */

function makeScreenManifest(): Manifest {
  // This mimics a manifest where spawned screen tasks have been registered
  // as top-level nodes with empty depends_on (no parent dependency declared).
  // The spawner (02-spawn) exists but the spawned tasks don't depend on it
  // in their DAG node declaration.
  return {
    nodes: {
      "01-catalog": {
        state: "concrete",
        id: "01-catalog",
        depends_on: [],
        depended_on_by: ["02-spawn"],
        seed: null,
      },
      "02-spawn": {
        state: "concrete",
        id: "02-spawn",
        depends_on: ["01-catalog"],
        depended_on_by: [],
        seed: null,
      },
      "screen-workspace-dashboard-01": {
        state: "concrete",
        id: "screen-workspace-dashboard-01",
        depends_on: [],
        depended_on_by: ["screen-workspace-dashboard-02"],
        seed: null,
      },
      "screen-workspace-dashboard-02": {
        state: "concrete",
        id: "screen-workspace-dashboard-02",
        depends_on: ["screen-workspace-dashboard-01"],
        depended_on_by: ["screen-workspace-dashboard-03"],
        seed: null,
      },
      "screen-workspace-dashboard-03": {
        state: "concrete",
        id: "screen-workspace-dashboard-03",
        depends_on: ["screen-workspace-dashboard-02"],
        depended_on_by: ["screen-workspace-dashboard-04"],
        seed: null,
      },
      "screen-workspace-dashboard-04": {
        state: "concrete",
        id: "screen-workspace-dashboard-04",
        depends_on: ["screen-workspace-dashboard-03"],
        depended_on_by: [],
        seed: null,
      },
    },
    child_map: {
      "01-catalog": ["02-spawn"],
      "02-spawn": [],
      "screen-workspace-dashboard-01": ["screen-workspace-dashboard-02"],
      "screen-workspace-dashboard-02": ["screen-workspace-dashboard-03"],
      "screen-workspace-dashboard-03": ["screen-workspace-dashboard-04"],
      "screen-workspace-dashboard-04": [],
    },
    parent_map: {
      "02-spawn": ["01-catalog"],
      "screen-workspace-dashboard-01": [],
      "screen-workspace-dashboard-02": ["screen-workspace-dashboard-01"],
      "screen-workspace-dashboard-03": ["screen-workspace-dashboard-02"],
      "screen-workspace-dashboard-04": ["screen-workspace-dashboard-03"],
    },
  };
}

// -------------------------------------------------------------------
// Helpers that simulate the walk logic in run/index.ts
// -------------------------------------------------------------------

interface SimNode {
  id: string;
  status: "pending" | "pass" | "complete" | "skipped" | "failed";
  depends_on: string[];
  depended_on_by: string[];
  spawned_children: string[];
}

function simulateSelect(
  selectorExpr: string,
  manifest: Manifest,
  simNodes: Map<string, SimNode>,
  previouslySkipped: Set<string>,
): { selected: Set<string>; skipped: string[] } {
  const selector = parseSelector(selectorExpr);
  const resolved = resolveSelector(selector, manifest);
  const selected = new Set(resolved.ids);

  // Re-mark previously skipped tasks that got selected
  for (const id of resolved.ids) {
    if (previouslySkipped.has(id)) {
      simNodes.get(id)!.status = "pending";
    }
  }

  // Walk upstream (dependencies) and downstream (spawned children)
  const walkQueue = [...resolved.ids];
  const terminalStates = new Set(["pass", "complete", "skipped"]);
  while (walkQueue.length > 0) {
    const id = walkQueue.pop()!;
    const node = simNodes.get(id);

    // Upstream: don't cascade through completed/cached tasks
    for (const dep of node?.depends_on ?? []) {
      if (!selected.has(dep)) {
        const depStatus = simNodes.get(dep)?.status;
        if (depStatus && terminalStates.has(depStatus)) continue;
        selected.add(dep);
        if (previouslySkipped.has(dep)) simNodes.get(dep)!.status = "pending";
        walkQueue.push(dep);
      }
    }

    // Downstream: spawned children
    for (const child of node?.spawned_children ?? []) {
      if (!selected.has(child)) {
        selected.add(child);
        if (previouslySkipped.has(child)) simNodes.get(child)!.status = "pending";
        walkQueue.push(child);
      }
    }
  }

  // Mark non-selected as skipped
  const skipped: string[] = [];
  for (const [id, node] of simNodes) {
    if (!selected.has(id)) {
      const safeToSkip = node.status === "pending" || node.status === "skipped";
      if (safeToSkip) {
        node.status = "skipped";
        skipped.push(id);
      }
    }
  }

  return { selected, skipped };
}

function buildSimNodes(manifest: Manifest): Map<string, SimNode> {
  const nodes = new Map<string, SimNode>();
  for (const [id, m] of Object.entries(manifest.nodes)) {
    nodes.set(id, {
      id,
      status: "pending",
      depends_on: [...m.depends_on],
      depended_on_by: [...m.depended_on_by],
      spawned_children: manifest.child_map[id] ?? [],
    });
  }
  return nodes;
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe("inventory task selection", () => {
  describe("name matching", () => {
    it("matches all tasks containing the selector substring", () => {
      const manifest = makeScreenManifest();
      const result = resolveSelector(parseSelector("workspace-dashboard"), manifest);
      expect(result.ids).toEqual(
        new Set([
          "screen-workspace-dashboard-01",
          "screen-workspace-dashboard-02",
          "screen-workspace-dashboard-03",
          "screen-workspace-dashboard-04",
        ]),
      );
    });

    it("exact ID match works", () => {
      const manifest = makeScreenManifest();
      const result = resolveSelector(parseSelector("screen-workspace-dashboard-02"), manifest);
      expect(result.ids).toEqual(new Set(["screen-workspace-dashboard-02"]));
    });

    it("glob pattern matches", () => {
      const manifest = makeScreenManifest();
      const result = resolveSelector(parseSelector("*dashboard-0*"), manifest);
      expect(result.ids.size).toBe(4);
    });
  });

  describe("dependency walk stops at cached tasks", () => {
    it("does NOT pull in upstream chain when deps are 'pass'", () => {
      const manifest = makeScreenManifest();
      const sim = buildSimNodes(manifest);

      // Mark spawner and catalog as already passed (cached from prior run)
      sim.get("01-catalog")!.status = "pass";
      sim.get("02-spawn")!.status = "pass";

      const { selected, skipped } = simulateSelect(
        "workspace-dashboard",
        manifest,
        sim,
        new Set(),
      );

      // All 4 screen tasks matched by name — they have empty deps from spawner
      // so no upstream cascade
      expect(selected.has("screen-workspace-dashboard-01")).toBe(true);
      expect(selected.has("screen-workspace-dashboard-04")).toBe(true);

      // Catalog and spawn are "pass" — walk stops, they're NOT selected
      expect(selected.has("01-catalog")).toBe(false);
      expect(selected.has("02-spawn")).toBe(false);

      // They're also NOT skipped because "pass" is not safeToSkip
      expect(skipped).not.toContain("01-catalog");
      expect(skipped).not.toContain("02-spawn");
    });

    it("pulls in pending deps that block selected tasks", () => {
      const manifest = makeScreenManifest();
      const sim = buildSimNodes(manifest);

      // All tasks pending
      const { selected } = simulateSelect(
        "screen-workspace-dashboard-02",
        manifest,
        sim,
        new Set(),
      );

      // dashboard-02 depends on dashboard-01, which gets pulled in
      expect(selected.has("screen-workspace-dashboard-01")).toBe(true);
      expect(selected.has("screen-workspace-dashboard-02")).toBe(true);

      // dashboard-03 is a spawned child of dashboard-02 (via child_map), so gets pulled downstream
      expect(selected.has("screen-workspace-dashboard-03")).toBe(true);
      expect(selected.has("screen-workspace-dashboard-04")).toBe(true);
    });

    it("cascading deps are all pulled when pending", () => {
      const manifest = makeScreenManifest();
      const sim = buildSimNodes(manifest);

      const { selected } = simulateSelect(
        "screen-workspace-dashboard-04",
        manifest,
        sim,
        new Set(),
      );

      // 04 -> 03 -> 02 -> 01 chain of deps
      expect(selected.has("screen-workspace-dashboard-01")).toBe(true);
      expect(selected.has("screen-workspace-dashboard-02")).toBe(true);
      expect(selected.has("screen-workspace-dashboard-03")).toBe(true);
      expect(selected.has("screen-workspace-dashboard-04")).toBe(true);
    });
  });

  describe("orphaned spawned task dependency clearing", () => {
    it("clears dep to skipped spawner so spawned task can run", () => {
      const sim = new Map<string, SimNode>([
        ["spawner", {
          id: "spawner", status: "skipped",
          depends_on: [], depended_on_by: [],
          spawned_children: ["spawned-task"],
        }],
        ["spawned-task", {
          id: "spawned-task", status: "pending",
          depends_on: ["spawner"], depended_on_by: [],
          spawned_children: [],
        }],
      ]);

      const selected = new Set(["spawned-task"]);
      const skippedDeps = new Set(["spawner"]);

      // Orphan-clearing logic (mirrors run/index.ts fix)
      const spawnedIds = new Set(["spawned-task"]);
      for (const id of selected) {
        if (!spawnedIds.has(id)) continue;
        const node = sim.get(id);
        if (!node) continue;
        const remainingDeps = node.depends_on.filter((dep: string) => {
          if (skippedDeps.has(dep)) return false;
          if (!sim.has(dep)) return false;
          if (!selected.has(dep)) return false;
          return true;
        });
        if (remainingDeps.length !== node.depends_on.length) {
          node.depends_on = remainingDeps;
        }
      }

      // The spawned-task's dependency on spawner should be cleared
      expect(sim.get("spawned-task")!.depends_on).toEqual([]);
    });

    it("keeps dep to selected sibling", () => {
      const sim = new Map<string, SimNode>([
        ["spawned-a", {
          id: "spawned-a", status: "pending",
          depends_on: [], depended_on_by: ["spawned-b"],
          spawned_children: ["spawned-b"],
        }],
        ["spawned-b", {
          id: "spawned-b", status: "pending",
          depends_on: ["spawned-a"], depended_on_by: [],
          spawned_children: [],
        }],
      ]);

      const selected = new Set(["spawned-a", "spawned-b"]);
      const skippedDeps = new Set<string>();
      const spawnedIds = new Set(["spawned-a", "spawned-b"]);

      for (const id of selected) {
        if (!spawnedIds.has(id)) continue;
        const node = sim.get(id);
        if (!node) continue;
        const remainingDeps = node.depends_on.filter((dep: string) => {
          if (skippedDeps.has(dep)) return false;
          if (!sim.has(dep)) return false;
          if (!selected.has(dep)) return false;
          return true;
        });
        if (remainingDeps.length !== node.depends_on.length) {
          node.depends_on = remainingDeps;
        }
      }

      // spawned-b's dep on spawned-a should be preserved (both selected)
      expect(sim.get("spawned-b")!.depends_on).toEqual(["spawned-a"]);
    });
  });

  describe("exclude", () => {
    it("can exclude specific tasks from a glob match", () => {
      const manifest = makeScreenManifest();
      const result = resolveSelector(
        parseSelector("*workspace*"),
        manifest,
        { exclude: parseSelector("screen-workspace-dashboard-04") },
      );
      expect(result.ids.has("screen-workspace-dashboard-04")).toBe(false);
      expect(result.ids.size).toBe(3);
    });
  });

  describe("edge cases", () => {
    it("empty selector throws", () => {
      expect(() => parseSelector("")).toThrow();
    });

    it("non-matching selector returns empty set", () => {
      const manifest = makeScreenManifest();
      const result = resolveSelector(parseSelector("nonexistent-task"), manifest);
      expect(result.ids.size).toBe(0);
    });

    it("status: method returns empty (not supported in manifest)", () => {
      const manifest = makeScreenManifest();
      const result = resolveSelector(parseSelector("status:pending"), manifest);
      expect(result.ids.size).toBe(0);
    });
  });
});
