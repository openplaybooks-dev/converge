/**
 * RFC 0017 — Successor resolver tests.
 */
import { describe, it, expect } from "vitest";
import {
  resolveSuccessor,
  validateOnFail,
  type OnFailClause,
} from "../../src/orchestrator/successor-resolver.ts";

describe("resolveSuccessor", () => {
  const clauses: OnFailClause[] = [
    {
      if: "check_fail:dart-analysis-valid",
      spawn: "templates/fix-dart-errors/TASK.md",
      inherit_vars: ["screenPath"],
      inherit_outputs: true,
    },
    { if: "error_class:transient", retry: { strategy: "backoff", max: 5 } },
    { if: "error_class:authoring", abort_run: true },
    { default: true, spawn: "templates/generic-repair/TASK.md" },
  ];

  it("matches a check_fail clause first", () => {
    const a = resolveSuccessor(clauses, { failedCheck: "dart-analysis-valid" });
    expect(a).toEqual({
      kind: "spawn",
      templatePath: "templates/fix-dart-errors/TASK.md",
      inheritVars: ["screenPath"],
      inheritOutputs: true,
    });
  });

  it("matches error_class:transient as a retry", () => {
    expect(resolveSuccessor(clauses, { errorClass: "transient" }))
      .toEqual({ kind: "retry", strategy: "backoff", max: 5 });
  });

  it("matches error_class:authoring as an abort", () => {
    expect(resolveSuccessor(clauses, { errorClass: "authoring" }))
      .toEqual({ kind: "abort" });
  });

  it("falls through to default when nothing else matches", () => {
    expect(resolveSuccessor(clauses, { errorClass: "deterministic" }))
      .toEqual({ kind: "spawn", templatePath: "templates/generic-repair/TASK.md", inheritVars: [], inheritOutputs: false });
  });

  it("returns null when no clause matches and no default", () => {
    const noDefault: OnFailClause[] = [{ if: "error_class:transient", abort_run: true }];
    expect(resolveSuccessor(noDefault, { errorClass: "deterministic" })).toBeNull();
  });

  it("first match wins (top-down)", () => {
    const reorder: OnFailClause[] = [
      { default: true, spawn: "a.md" },
      { if: "error_class:transient", abort_run: true },
    ];
    // default matches first — abort clause never fires.
    expect(resolveSuccessor(reorder, { errorClass: "transient" }))
      .toEqual({ kind: "spawn", templatePath: "a.md", inheritVars: [], inheritOutputs: false });
  });

  it("output_missing matcher works", () => {
    const cls: OnFailClause[] = [
      { if: "output_missing:lib/foo.dart", spawn: "templates/fix-foo/TASK.md" },
    ];
    expect(resolveSuccessor(cls, { missingOutput: "lib/foo.dart" }))
      .toEqual({ kind: "spawn", templatePath: "templates/fix-foo/TASK.md", inheritVars: [], inheritOutputs: false });
  });

  it("ignores clauses with unknown match-kinds", () => {
    const cls: OnFailClause[] = [
      { if: "moon_phase:waxing", abort_run: true },
      { default: true, spawn: "fallback.md" },
    ];
    expect(resolveSuccessor(cls, { errorClass: "deterministic" }))
      .toEqual({ kind: "spawn", templatePath: "fallback.md", inheritVars: [], inheritOutputs: false });
  });
});

describe("validateOnFail", () => {
  it("returns no errors for a well-formed block", () => {
    const errors = validateOnFail({
      clauses: [
        { if: "check_fail:x", spawn: "a.md" },
        { default: true, spawn: "b.md" },
      ],
    });
    expect(errors).toEqual([]);
  });

  it("flags a default clause that isn't last", () => {
    const errors = validateOnFail({
      clauses: [
        { default: true, spawn: "b.md" },
        { if: "check_fail:x", spawn: "a.md" },
      ],
    });
    expect(errors[0]).toMatch(/default.*must be last/);
  });

  it("flags clauses missing both 'if:' and 'default:'", () => {
    const errors = validateOnFail({ clauses: [{ spawn: "a.md" }] });
    expect(errors[0]).toMatch(/missing 'if:' or 'default:'/);
  });

  it("flags unknown 'if:' match kinds", () => {
    const errors = validateOnFail({
      clauses: [{ if: "moon_phase:waxing", spawn: "a.md" }],
    });
    expect(errors[0]).toMatch(/unknown match kind 'moon_phase'/);
  });

  it("flags clauses with no action", () => {
    const errors = validateOnFail({
      clauses: [{ default: true }],
    });
    expect(errors[0]).toMatch(/must specify spawn \/ retry \/ abort_run/);
  });

  it("flags spawn-self cycles", () => {
    const errors = validateOnFail({
      ownTaskPath: "tasks/me/TASK.md",
      clauses: [{ default: true, spawn: "tasks/me/TASK.md" }],
    });
    expect(errors[0]).toMatch(/cycle/);
  });
});
