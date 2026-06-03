import { describe, expect, it } from "vitest";
import {
  TaskTopology,
  type RuntimeTask,
} from "../packages/core/src/task/goal/index.ts";

function makeTask(
  id: string,
  overrides: Partial<RuntimeTask> = {},
): RuntimeTask {
  return {
    id,
    taskPath: `/tasks/${id}/TASK.md`,
    goalId: "goal",
    summary: id,
    status: "todo",
    source: "static",
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  };
}

function ids(level: { tasks: RuntimeTask[] }): string[] {
  return level.tasks.map((task) => task.id);
}

describe("TaskTopology", () => {
  it("builds flat static levels in dependency order", () => {
    const topology = new TaskTopology([
      makeTask("01-prepare"),
      makeTask("02-design", { depends_on: ["01-prepare"] }),
      makeTask("03-build", { depends_on: ["02-design"] }),
    ]);

    expect(topology.levels).toHaveLength(3);
    expect(topology.levels.map(ids)).toEqual([
      ["01-prepare"],
      ["02-design"],
      ["03-build"],
    ]);

    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "01-prepare",
    ]);

    topology.markComplete("01-prepare");
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "02-design",
    ]);

    topology.markComplete("02-design");
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "03-build",
    ]);
  });

  it("builds nested static levels for parent → child → grandchild", () => {
    const topology = new TaskTopology([
      makeTask("parent"),
      makeTask("child-alpha", {
        parent: "parent",
        depends_on: ["parent"],
        source: "spawned",
      }),
      makeTask("grandchild", {
        parent: "child-alpha",
        depends_on: ["child-alpha"],
        source: "spawned",
      }),
    ]);

    expect(topology.levels.map(ids)).toEqual([
      ["parent"],
      ["child-alpha"],
      ["grandchild"],
    ]);

    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "parent",
    ]);
    topology.markComplete("parent");
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "child-alpha",
    ]);
    topology.markComplete("child-alpha");
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "grandchild",
    ]);
  });

  it("keeps the first spawned fan-out on the same ready level", () => {
    const topology = new TaskTopology([makeTask("parent")]);

    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "parent",
    ]);
    topology.markComplete("parent");
    topology.addSpawnedLevel("parent", [
      makeTask("child-alpha", {
        parent: "parent",
        depends_on: ["parent"],
        source: "spawned",
      }),
      makeTask("child-beta", {
        parent: "parent",
        depends_on: ["parent"],
        source: "spawned",
      }),
    ]);

    expect(topology.levels.map(ids)).toEqual([
      ["parent"],
      ["child-alpha", "child-beta"],
    ]);
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "child-alpha",
      "child-beta",
    ]);

    topology.markComplete("child-alpha");
    topology.addSpawnedLevel("child-alpha", [
      makeTask("grandchild", {
        parent: "child-alpha",
        depends_on: ["child-alpha"],
        source: "spawned",
      }),
    ]);

    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "child-beta",
    ]);
    topology.markComplete("child-beta");
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "grandchild",
    ]);
  });

  it("extends the topology on repeated spawn passes until the loop stops", () => {
    const topology = new TaskTopology([makeTask("loop")]);

    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual(["loop"]);
    topology.markComplete("loop");

    topology.addSpawnedLevel("loop", [
      makeTask("pass-1", {
        parent: "loop",
        depends_on: ["loop"],
        source: "spawned",
      }),
    ]);
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "pass-1",
    ]);
    topology.markComplete("pass-1");

    topology.addSpawnedLevel("loop", [
      makeTask("pass-2", {
        parent: "loop",
        depends_on: ["loop"],
        source: "spawned",
      }),
    ]);
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "pass-2",
    ]);
    topology.markComplete("pass-2");

    topology.addSpawnedLevel("loop", [
      makeTask("pass-3", {
        parent: "loop",
        depends_on: ["loop"],
        source: "spawned",
      }),
    ]);
    expect(topology.levels.map(ids)).toEqual([
      ["loop"],
      ["pass-1"],
      ["pass-2"],
      ["pass-3"],
    ]);
    expect(topology.getReady()?.tasks.map((task) => task.id)).toEqual([
      "pass-3",
    ]);
  });
});
