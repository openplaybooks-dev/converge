/**
 * RFC 0005 — Frontier derivation + validation tests.
 */
import { describe, it, expect } from "vitest";
import { TaskDag } from "../../src/dag/task-dag.ts";
import type { DagNode, DagNodeStatus } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";
import {
  deriveFrontier,
  validateFrontier,
  FRONTIER_SCHEMA_VERSION,
} from "../../src/checkpoint/frontier.ts";

function makeNode(o: Partial<DagNode> & { id: string; status?: DagNodeStatus }): DagNode {
  return {
    id: o.id,
    type: "normal",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: { id: o.id } as TaskDefinition,
    path: `/${o.id}.md`,
    status: o.status ?? "pending",
    virtual: false,
    ...o,
  };
}

describe("deriveFrontier", () => {
  it("captures ready nodes with their satisfied deps", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "a", status: "complete" }));
    dag.addNode(makeNode({ id: "b", status: "pending", depends_on: ["a"] }));
    const f = deriveFrontier({ dag, ts: new Date("2026-05-19T00:00:00Z") });
    expect(f.schemaVersion).toBe(FRONTIER_SCHEMA_VERSION);
    expect(f.ready).toEqual([{ taskId: "b", dependsOnDone: ["a"] }]);
    expect(f.totalCompleted).toBe(1);
    expect(f.totalPending).toBe(1);
    expect(f.ts).toBe("2026-05-19T00:00:00.000Z");
  });

  it("treats pass and complete as completed; counts seeded as pending", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "a", status: "pass" }));
    dag.addNode(makeNode({ id: "b", status: "complete" }));
    dag.addNode(makeNode({ id: "c", status: "seeded" }));
    dag.addNode(makeNode({ id: "d", status: "pending" }));
    const f = deriveFrontier({ dag });
    expect(f.totalCompleted).toBe(2);
    expect(f.totalPending).toBe(2);
  });

  it("forwards caller-supplied running and deferred sets", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "a", status: "pending" }));
    const f = deriveFrontier({
      dag,
      running: [{ taskId: "a", leasedBy: "w1", since: "2026-05-19T00:00:00Z" }],
      deferred: [{ taskId: "a", lastError: "transient: idle timeout", retryAfterMs: 16000 }],
    });
    expect(f.running).toHaveLength(1);
    expect(f.deferred[0].retryAfterMs).toBe(16000);
  });

  it("defaults running / deferred to empty arrays", () => {
    const dag = new TaskDag();
    const f = deriveFrontier({ dag });
    expect(f.running).toEqual([]);
    expect(f.deferred).toEqual([]);
  });
});

describe("validateFrontier", () => {
  function dagWith(nodeIds: string[]) {
    const dag = new TaskDag();
    for (const id of nodeIds) dag.addNode(makeNode({ id }));
    return dag;
  }

  it("returns null for a well-formed frontier", () => {
    const dag = dagWith(["a", "b"]);
    const f = deriveFrontier({ dag });
    expect(validateFrontier(f, dag)).toBeNull();
  });

  it("rejects mismatched schemaVersion", () => {
    const dag = dagWith(["a"]);
    const f = { ...deriveFrontier({ dag }), schemaVersion: 99 };
    expect(validateFrontier(f, dag)).toMatch(/schemaVersion/);
  });

  it("rejects unknown task ids in ready[]", () => {
    const dag = dagWith(["a"]);
    const f = {
      ...deriveFrontier({ dag }),
      ready: [{ taskId: "ghost", dependsOnDone: [] }],
    };
    expect(validateFrontier(f, dag)).toMatch(/ready entry references unknown task/);
  });

  it("rejects totals that exceed DAG size", () => {
    const dag = dagWith(["a"]);
    const f = {
      ...deriveFrontier({ dag }),
      totalCompleted: 10,
      totalPending: 10,
    };
    expect(validateFrontier(f, dag)).toMatch(/exceed DAG size/);
  });

  it("rejects missing required fields", () => {
    const dag = dagWith(["a"]);
    expect(validateFrontier({}, dag)).toMatch(/schemaVersion/);
    expect(validateFrontier(null, dag)).toMatch(/not an object/);
    expect(validateFrontier({ schemaVersion: FRONTIER_SCHEMA_VERSION }, dag))
      .toMatch(/missing ts/);
  });

  it("rejects malformed deferred/running entries", () => {
    const dag = dagWith(["a"]);
    const f = {
      ...deriveFrontier({ dag }),
      deferred: [{ taskId: "ghost", lastError: "x" }],
    };
    expect(validateFrontier(f, dag)).toMatch(/deferred entry references unknown task/);
  });
});
