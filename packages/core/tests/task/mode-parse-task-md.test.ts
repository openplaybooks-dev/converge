/**
 * RFC 0022 — TASK.md → TaskDefinition mode parsing.
 *
 * Confirms that:
 *
 *   1. An explicit `mode: spawner` in frontmatter lands on TaskDefinition.mode.
 *   2. A `spawn:` block parses into TaskDefinition.spawn (with defaults).
 *   3. A `converge: { max_waves, halt_when }` block parses into
 *      TaskDefinition.modeConverge when `mode: converger` is declared.
 *   4. Cross-field rules from `parseTaskModeFrontmatter` fire as expected
 *      (e.g., `mode: task` with a `spawn:` block throws).
 *   5. Inferred-only modes (from legacy `seed: { mode: cli }`) do NOT
 *      land on TaskDefinition.mode — the runner must stay on the legacy
 *      seed path until Stage 3 removal.
 */
import { describe, it, expect } from "vitest";
import {
  mapTaskMdToTaskDefinition,
  parseTaskMdString,
} from "../../src/config/task-md-definition.ts";
import type { TaskMdDef } from "../../src/config/task-md-definition.ts";

function baseDef(): TaskMdDef {
  return { id: "t" };
}

describe("TASK.md mode parsing", () => {
  it("populates TaskDefinition.mode for explicit mode: spawner", () => {
    const def: TaskMdDef = {
      ...baseDef(),
      mode: "spawner",
      spawn: { min_children: 1, max_children: 5 },
    };
    const taskDef = mapTaskMdToTaskDefinition(def, "", "t");
    expect(taskDef.mode).toBe("spawner");
    expect(taskDef.spawn).toBeDefined();
    expect(taskDef.spawn?.min_children).toBe(1);
    expect(taskDef.spawn?.max_children).toBe(5);
    expect(taskDef.spawn?.apply).toBe("auto"); // schema default
  });

  it("populates TaskDefinition.modeConverge for mode: converger", () => {
    const def: TaskMdDef = {
      ...baseDef(),
      mode: "converger",
      converge: {
        max_waves: 8,
        halt_when: [{ id: "done", cmd: "test -f done.marker" }],
      },
    };
    const taskDef = mapTaskMdToTaskDefinition(def, "", "t");
    expect(taskDef.mode).toBe("converger");
    expect(taskDef.modeConverge?.max_waves).toBe(8);
    expect(taskDef.modeConverge?.halt_when?.[0].id).toBe("done");
  });

  it("populates TaskDefinition.mode = gateway with no spawn/converge", () => {
    const def: TaskMdDef = { ...baseDef(), mode: "gateway" };
    const taskDef = mapTaskMdToTaskDefinition(def, "", "t");
    expect(taskDef.mode).toBe("gateway");
    expect(taskDef.spawn).toBeUndefined();
    expect(taskDef.modeConverge).toBeUndefined();
  });

  it("keeps handoff config on gateway tasks", () => {
    const def: TaskMdDef = {
      ...baseDef(),
      mode: "gateway",
      handoff: {
        artifact: "docs/review.html",
        format: "html",
        skill: "html-review-artifact",
      },
    };
    const taskDef = mapTaskMdToTaskDefinition(def, "", "t");
    expect(taskDef.handoff?.artifact).toBe("docs/review.html");
    expect(taskDef.handoff?.format).toBe("html");
    expect(taskDef.handoff?.skill).toBe("html-review-artifact");
  });

  it("round-trips handoff.generate and skill onto a task TaskDefinition", () => {
    const def: TaskMdDef = {
      ...baseDef(),
      handoff: {
        artifact: "docs/review.html",
        format: "html",
        generate: "Generate a standalone HTML report.",
        skill: "html-review-artifact",
      },
    };
    const taskDef = mapTaskMdToTaskDefinition(def, "", "t");
    expect(taskDef.handoff?.artifact).toBe("docs/review.html");
    expect(taskDef.handoff?.format).toBe("html");
    expect(taskDef.handoff?.generate).toBe(
      "Generate a standalone HTML report.",
    );
    expect(taskDef.handoff?.skill).toBe("html-review-artifact");
  });

  it("ignores a legacy handoff.report key (only `generate` is read)", () => {
    const shape = parseTaskMdString(
      [
        "---",
        "id: t",
        "handoff:",
        "  artifact: docs/review.html",
        "  format: html",
        "  report: Create an HTML review page.",
        "---",
        "body",
      ].join("\n"),
    );
    expect(shape.handoff?.artifact).toBe("docs/review.html");
    expect(shape.handoff?.generate).toBeUndefined();
    expect((shape.handoff as Record<string, unknown>)?.report).toBeUndefined();
  });

  it("rejects mode: task with a spawn: block at cross-field validation", () => {
    const def: TaskMdDef = {
      ...baseDef(),
      mode: "task",
      spawn: { min_children: 1 },
    };
    expect(() => mapTaskMdToTaskDefinition(def, "", "t")).toThrow(
      /mode: task must not declare a spawn: block/,
    );
  });

  it("rejects mode: converger without halt_when or wave_check", () => {
    const def: TaskMdDef = {
      ...baseDef(),
      mode: "converger",
      converge: { max_waves: 3 }, // no halt signal
    };
    expect(() => mapTaskMdToTaskDefinition(def, "", "t")).toThrow(
      /halt_when or wave_check/,
    );
  });

  it("infers mode: task for a task with no mode declared and no spawn signals", () => {
    const def: TaskMdDef = { ...baseDef(), outputs: ["x.txt"] };
    const taskDef = mapTaskMdToTaskDefinition(def, "body", "t");
    expect(taskDef.mode).toBe("task");
  });
});
