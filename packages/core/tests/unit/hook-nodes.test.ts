/**
 * Tests for the hook node factory (expandHooks).
 */

import { describe, it, expect } from "vitest";
import { TaskDag } from "../../src/dag/task-dag.ts";
import { expandHooks } from "../../src/dag/hook-nodes.ts";
import type { DagNode } from "../../src/dag/dag-node.ts";
import type { HookDefinition } from "../../src/hooks/hook-definition.ts";

function makeTaskNode(
  id: string,
  opts?: { tags?: string[]; depends_on?: string[]; depended_on_by?: string[] },
): DagNode {
  return {
    id,
    type: "normal",
    parents: [],
    children: [],
    depends_on: opts?.depends_on ?? [],
    depended_on_by: opts?.depended_on_by ?? [],
    taskDef: {
      id,
      title: id,
      tags: opts?.tags,
    } as any,
    path: `/tasks/${id}/TASK.md`,
    status: "pending",
    virtual: false,
  };
}

function makeHook(opts: {
  id: string;
  on: HookDefinition["on"];
  filterTags?: string[];
  filterTaskIds?: string[];
  blocking?: boolean;
}): HookDefinition {
  return {
    id: opts.id,
    on: opts.on,
    filter: { tags: opts.filterTags, taskIds: opts.filterTaskIds },
    fn: async () => {},
    blocking: opts.blocking,
  };
}

describe("expandHooks", () => {
  it("should return empty for no hooks", () => {
    const dag = new TaskDag();
    dag.addNode(makeTaskNode("task-a", { tags: ["code"] }));
    const created = expandHooks([], dag);
    expect(created).toEqual([]);
  });

  it("should create companion node for task:complete hook matching by tag", () => {
    const dag = new TaskDag();
    dag.addNode(makeTaskNode("task-a", { tags: ["code"] }));
    dag.addNode(makeTaskNode("task-b", { tags: ["docs"] }));

    const hook = makeHook({
      id: "git-automation",
      on: "task:complete",
      filterTags: ["code"],
    });

    const created = expandHooks([hook], dag);

    // Only task-a matches
    expect(created.length).toBe(1);
    const companion = created[0];
    expect(companion.id).toBe("git-automation__task-a");
    expect(companion.type).toBe("hook");
    expect(companion.depends_on).toContain("task-a");
    expect(companion.virtual).toBe(true);
  });

  it("should create companion nodes for all matching tasks", () => {
    const dag = new TaskDag();
    dag.addNode(makeTaskNode("build-backend", { tags: ["code"] }));
    dag.addNode(makeTaskNode("build-frontend", { tags: ["code"] }));

    const hook = makeHook({
      id: "git-automation",
      on: "task:complete",
      filterTags: ["code"],
    });

    const created = expandHooks([hook], dag);
    expect(created.length).toBe(2);
    const ids = created.map((n) => n.id).sort();
    expect(ids).toEqual([
      "git-automation__build-backend",
      "git-automation__build-frontend",
    ]);
  });

  it("should rewire dependents for task:complete hooks (chain)", () => {
    const dag = new TaskDag();
    dag.addNode(
      makeTaskNode("task-a", {
        tags: ["code"],
        depended_on_by: ["task-b"],
      }),
    );
    dag.addNode(
      makeTaskNode("task-b", {
        tags: ["docs"],
        depends_on: ["task-a"],
      }),
    );

    const hook = makeHook({
      id: "git-automation",
      on: "task:complete",
      filterTags: ["code"],
    });

    expandHooks([hook], dag);

    // task-b's dependency should have been rewired to the companion
    const taskB = dag.nodes.get("task-b");
    expect(taskB!.depends_on).not.toContain("task-a");
    expect(taskB!.depends_on).toContain("git-automation__task-a");
  });

  it("should not hook into other hook nodes", () => {
    const dag = new TaskDag();
    dag.addNode(makeTaskNode("task-a", { tags: ["code"] }));
    dag.addNode(makeTaskNode("task-b", { tags: ["code"] }));

    const hook = makeHook({
      id: "git-automation",
      on: "task:complete",
      filterTags: ["code"],
    });

    // First expansion creates companion nodes
    expandHooks([hook], dag);

    // Count nodes after first expansion
    const nodeCount = dag.nodes.size;

    // Second expansion should be idempotent (no new nodes)
    expandHooks([hook], dag);
    expect(dag.nodes.size).toBe(nodeCount);

    // All companion nodes should have type "hook"
    for (const [, node] of dag.nodes) {
      if (node.id.startsWith("git-automation__")) {
        expect(node.type).toBe("hook");
      }
    }
  });

  it("should handle task:start hooks (before chain)", () => {
    const dag = new TaskDag();
    dag.addNode(
      makeTaskNode("task-a", {
        tags: ["setup"],
        depends_on: ["init"],
      }),
    );
    dag.addNode(makeTaskNode("init", { tags: ["infra"] }));

    const hook = makeHook({
      id: "pre-check",
      on: "task:start",
      filterTags: ["setup"],
    });

    const created = expandHooks([hook], dag);

    expect(created.length).toBe(1);
    const companion = created[0];
    expect(companion.id).toBe("pre-check__task-a");

    // task-a now depends on the companion
    const taskA = dag.nodes.get("task-a");
    expect(taskA!.depends_on).toContain("pre-check__task-a");

    // companion depends on task-a's original deps
    expect(companion.depends_on).toContain("init");
  });

  it("should handle task:fail hooks (non-blocking, depends on task)", () => {
    const dag = new TaskDag();
    dag.addNode(makeTaskNode("task-a", { tags: ["code"] }));

    const hook = makeHook({
      id: "notify-failure",
      on: "task:fail",
      filterTags: ["code"],
      blocking: false,
    });

    const created = expandHooks([hook], dag);

    expect(created.length).toBe(1);
    const companion = created[0];
    expect(companion.depends_on).toContain("task-a");
    // No rewiring for fail hooks
  });

  it("should chain multiple hooks for the same task", () => {
    const dag = new TaskDag();
    dag.addNode(
      makeTaskNode("task-a", {
        tags: ["code"],
        depended_on_by: ["deploy"],
      }),
    );
    dag.addNode(makeTaskNode("deploy", { depends_on: ["task-a"] }));

    const hook1 = makeHook({
      id: "git-commit",
      on: "task:complete",
      filterTags: ["code"],
    });
    const hook2 = makeHook({
      id: "pr-create",
      on: "task:complete",
      filterTags: ["code"],
    });

    const created = expandHooks([hook1, hook2], dag);

    expect(created.length).toBe(2);

    // First hook depends on task-a
    const gitNode = dag.nodes.get("git-commit__task-a");
    expect(gitNode!.depends_on).toContain("task-a");

    // Second hook depends on first hook
    const prNode = dag.nodes.get("pr-create__task-a");
    expect(prNode!.depends_on).toContain("git-commit__task-a");

    // deploy depends on last hook in chain
    const deploy = dag.nodes.get("deploy");
    expect(deploy!.depends_on).toContain("pr-create__task-a");
    expect(deploy!.depends_on).not.toContain("task-a");
  });

  it("should match tasks by taskId filter", () => {
    const dag = new TaskDag();
    dag.addNode(makeTaskNode("specific-task", { tags: [] }));
    dag.addNode(makeTaskNode("other-task", { tags: [] }));

    const hook = makeHook({
      id: "targeted-hook",
      on: "task:complete",
      filterTaskIds: ["specific-task"],
    });

    const created = expandHooks([hook], dag);

    expect(created.length).toBe(1);
    expect(created[0].id).toBe("targeted-hook__specific-task");
  });
});
