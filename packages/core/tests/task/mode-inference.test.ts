/**
 * RFC 0022 — mode inference (back-compat shim).
 *
 * Existing playbooks pre-date the mode contract. Until phase-3 makes
 * `mode:` required, the runtime infers a mode from observable signals:
 *
 *   - `seed: { mode: cli }`                           → converger
 *   - passthrough + body mentions converge spawn/apply → spawner
 *   - passthrough + nothing else                      → gateway
 *   - everything else                                 → leaf
 *
 * Inference is a one-release shim. Authoring tools (converge add) emit
 * `mode:` explicitly; the warning prompt nudges existing playbooks to
 * declare it before the inference path is removed (phase 3).
 */
import { describe, it, expect } from "vitest";
import { inferMode } from "../../src/task/mode/inference.ts";

describe("inferMode", () => {
  it("returns the declared mode verbatim when present (no inference)", () => {
    expect(
      inferMode({ mode: "leaf", outputs: ["x.txt"], body: "" }),
    ).toBe("leaf");
    expect(
      inferMode({ mode: "spawner", body: "echo hi" }),
    ).toBe("spawner");
    expect(
      inferMode({ mode: "converger", body: "" }),
    ).toBe("converger");
    expect(
      inferMode({ mode: "gateway", body: "" }),
    ).toBe("gateway");
  });

  it("infers converger when seed: { mode: cli } is set", () => {
    expect(
      inferMode({
        seed: { mode: "cli" },
        passthrough: true,
        body: "echo wave",
      }),
    ).toBe("converger");
  });

  it("infers spawner when passthrough body mentions `converge apply`", () => {
    expect(
      inferMode({
        passthrough: true,
        body: 'converge apply "$CONVERGE_TASK_DIR/spawn.plan.jsonl"',
      }),
    ).toBe("spawner");
  });

  it("infers spawner when passthrough body mentions `converge spawn`", () => {
    expect(
      inferMode({
        passthrough: true,
        body: 'converge spawn task --id foo --task-file bar',
      }),
    ).toBe("spawner");
  });

  it("infers gateway when passthrough + empty body + no outputs", () => {
    expect(
      inferMode({ passthrough: true, body: "" }),
    ).toBe("gateway");
  });

  it("infers gateway when passthrough + whitespace body", () => {
    expect(
      inferMode({ passthrough: true, body: "  \n\t\n" }),
    ).toBe("gateway");
  });

  it("infers leaf when outputs are declared and no spawn markers", () => {
    expect(
      inferMode({
        outputs: ["lib/widgets/card.dart"],
        body: "echo hi",
      }),
    ).toBe("leaf");
  });

  it("infers leaf for a plain task with no signals", () => {
    expect(inferMode({ body: "echo hi" })).toBe("leaf");
  });

  it("seed cli wins over body keyword detection", () => {
    expect(
      inferMode({
        seed: { mode: "cli" },
        passthrough: true,
        body: "converge apply $CONVERGE_TASK_DIR/spawn.plan.jsonl",
      }),
    ).toBe("converger");
  });

  it("does not infer spawner when 'converge' appears in unrelated body text", () => {
    expect(
      inferMode({
        outputs: ["x.txt"],
        body: "// Note: when the team can converge on a design, ship it.",
      }),
    ).toBe("leaf");
  });
});
