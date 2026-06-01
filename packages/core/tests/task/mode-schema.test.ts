/**
 * RFC 0022 — Task mode contract: schema tests.
 *
 * `mode:` is a typed enum (task | spawner | converger | gateway). Each mode
 * carries cross-field rules that surface authoring mistakes at parse time:
 *
 *   - spawner requires a `spawn:` block (filled with defaults if absent).
 *   - converger requires a `converge:` block with at least one halt signal
 *     (halt_when or wave_check).
 *   - task rejects `spawn:` and `converge:` blocks.
 *   - gateway rejects body content (the body must be empty/whitespace).
 *
 * Tests below assert the schema's contract — they pin the wire format so
 * downstream consumers (post-body validator, converger wave loop, repair
 * loop) can trust the parsed shape.
 */
import { describe, it, expect } from "vitest";
import {
  TaskModeSchema,
  SpawnerConfigSchema,
  ConvergerConfigSchema,
  parseTaskModeFrontmatter,
} from "../../src/task/mode/schema.ts";

describe("TaskModeSchema", () => {
  it("accepts the four declared modes", () => {
    for (const m of ["task", "spawner", "converger", "gateway"] as const) {
      expect(TaskModeSchema.safeParse(m).success).toBe(true);
    }
  });

  it("rejects unknown modes", () => {
    expect(TaskModeSchema.safeParse("pipeline").success).toBe(false);
    expect(TaskModeSchema.safeParse("").success).toBe(false);
  });
});

describe("SpawnerConfigSchema", () => {
  it("fills sensible defaults when fields are absent", () => {
    const parsed = SpawnerConfigSchema.parse({});
    expect(parsed.min_children).toBe(0);
    expect(parsed.max_children).toBe(1000);
    expect(parsed.apply).toBe("auto");
    expect(parsed.template).toBeUndefined();
  });

  it("rejects max_children < 1", () => {
    expect(SpawnerConfigSchema.safeParse({ max_children: 0 }).success).toBe(
      false,
    );
  });

  it("rejects unknown apply values", () => {
    expect(
      SpawnerConfigSchema.safeParse({ apply: "deferred" as unknown }).success,
    ).toBe(false);
  });
});

describe("ConvergerConfigSchema", () => {
  it("fills max_waves default of 10", () => {
    const parsed = ConvergerConfigSchema.parse({
      wave_check: { id: "decide", cmd: "scripts/decide.sh" },
    });
    expect(parsed.max_waves).toBe(10);
  });

  it("rejects max_waves < 1", () => {
    expect(ConvergerConfigSchema.safeParse({ max_waves: 0 }).success).toBe(
      false,
    );
  });
});

describe("parseTaskModeFrontmatter — cross-field validation", () => {
  it("accepts mode: task with outputs and no spawn/converge", () => {
    const { ok, parsed, error } = parseTaskModeFrontmatter({
      mode: "task",
      outputs: ["lib/widgets/card.dart"],
    });
    expect(error).toBeUndefined();
    expect(ok).toBe(true);
    expect(parsed?.mode).toBe("task");
  });

  it("rejects mode: task when spawn: is declared", () => {
    const { ok, error } = parseTaskModeFrontmatter({
      mode: "task",
      spawn: { min_children: 1 },
    });
    expect(ok).toBe(false);
    expect(error).toMatch(/task/);
    expect(error).toMatch(/spawn/);
  });

  it("rejects mode: task when converge: is declared", () => {
    const { ok, error } = parseTaskModeFrontmatter({
      mode: "task",
      converge: { max_waves: 5 },
    });
    expect(ok).toBe(false);
    expect(error).toMatch(/task/);
    expect(error).toMatch(/converge/);
  });

  it("accepts mode: spawner and fills spawn: with defaults if absent", () => {
    const { ok, parsed } = parseTaskModeFrontmatter({ mode: "spawner" });
    expect(ok).toBe(true);
    expect(parsed?.spawn).toBeDefined();
    expect(parsed?.spawn?.apply).toBe("auto");
    expect(parsed?.spawn?.min_children).toBe(0);
    expect(parsed?.spawn?.max_children).toBe(1000);
  });

  it("accepts mode: spawner with an explicit spawn: block", () => {
    const { ok, parsed } = parseTaskModeFrontmatter({
      mode: "spawner",
      spawn: { min_children: 1, max_children: 50, template: "shot" },
    });
    expect(ok).toBe(true);
    expect(parsed?.spawn?.min_children).toBe(1);
    expect(parsed?.spawn?.max_children).toBe(50);
    expect(parsed?.spawn?.template).toBe("shot");
  });

  it("rejects mode: spawner when min_children > max_children", () => {
    const { ok, error } = parseTaskModeFrontmatter({
      mode: "spawner",
      spawn: { min_children: 10, max_children: 5 },
    });
    expect(ok).toBe(false);
    expect(error).toMatch(/min_children/);
  });

  it("accepts mode: converger with halt_when only", () => {
    const { ok, parsed } = parseTaskModeFrontmatter({
      mode: "converger",
      converge: {
        max_waves: 20,
        halt_when: [{ id: "zero-errors", cmd: "pnpm tsc --noEmit" }],
      },
    });
    expect(ok).toBe(true);
    expect(parsed?.converge?.max_waves).toBe(20);
    expect(parsed?.converge?.halt_when?.length).toBe(1);
  });

  it("accepts mode: converger with wave_check only", () => {
    const { ok, parsed } = parseTaskModeFrontmatter({
      mode: "converger",
      converge: {
        wave_check: { id: "decide", cmd: "scripts/wave-decision.sh" },
      },
    });
    expect(ok).toBe(true);
    expect(parsed?.converge?.wave_check?.cmd).toBe("scripts/wave-decision.sh");
  });

  it("rejects mode: converger with neither halt_when nor wave_check", () => {
    const { ok, error } = parseTaskModeFrontmatter({
      mode: "converger",
      converge: { max_waves: 5 },
    });
    expect(ok).toBe(false);
    expect(error).toMatch(/halt_when|wave_check/);
  });

  it("rejects mode: converger without a converge: block", () => {
    const { ok, error } = parseTaskModeFrontmatter({ mode: "converger" });
    expect(ok).toBe(false);
    expect(error).toMatch(/converge:/);
  });

  it("accepts mode: gateway with empty body", () => {
    const { ok } = parseTaskModeFrontmatter(
      { mode: "gateway", depends_on: ["a", "b"] },
      "",
    );
    expect(ok).toBe(true);
  });

  it("accepts mode: gateway with whitespace-only body", () => {
    const { ok } = parseTaskModeFrontmatter(
      { mode: "gateway", depends_on: ["a"] },
      "\n  \n\t\n",
    );
    expect(ok).toBe(true);
  });

  it("rejects mode: gateway with body content", () => {
    const { ok, error } = parseTaskModeFrontmatter(
      { mode: "gateway", depends_on: ["a"] },
      "echo hi\n",
    );
    expect(ok).toBe(false);
    expect(error).toMatch(/gateway/);
    expect(error).toMatch(/body/);
  });

  it("rejects mode: gateway when outputs are declared", () => {
    const { ok, error } = parseTaskModeFrontmatter({
      mode: "gateway",
      outputs: ["build/x.txt"],
    });
    expect(ok).toBe(false);
    expect(error).toMatch(/gateway/);
    expect(error).toMatch(/outputs/);
  });

  it("rejects mode: gateway when spawn: is declared", () => {
    const { ok, error } = parseTaskModeFrontmatter({
      mode: "gateway",
      spawn: { min_children: 1 },
    });
    expect(ok).toBe(false);
    expect(error).toMatch(/gateway/);
  });

  it("returns undefined mode when none declared (caller infers)", () => {
    const { ok, parsed } = parseTaskModeFrontmatter({ outputs: ["x"] });
    expect(ok).toBe(true);
    expect(parsed?.mode).toBeUndefined();
  });
});
