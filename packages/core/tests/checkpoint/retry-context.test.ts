/**
 * RFC 0009 — Retry-context aggregator tests.
 */
import { describe, it, expect } from "vitest";
import {
  buildRetryContext,
  RETRY_CONTEXT_SCHEMA_VERSION,
  type RetryEvent,
} from "../../src/checkpoint/retry-context.ts";

const TASK = "001-test";
function ev(eventType: string, payload: Record<string, unknown>, ts = 0): RetryEvent {
  return { ts, taskId: TASK, eventType, payload };
}

describe("buildRetryContext", () => {
  it("returns empty priorAttempts when no events match", () => {
    const ctx = buildRetryContext({ events: [], attempt: 2, maxAttempts: 3 });
    expect(ctx).toEqual({
      schemaVersion: RETRY_CONTEXT_SCHEMA_VERSION,
      attempt: 2,
      maxAttempts: 3,
      priorAttempts: [],
    });
  });

  it("captures failed checks for the prior attempt", () => {
    const events: RetryEvent[] = [
      ev("TASK_ATTEMPT_START", { attempt: 1 }),
      ev("CHECK_FAIL", {
        attempt: 1,
        id: "uses-glossary",
        command: "grep -q 'scaffold' design.html",
        stdout: "",
        exitCode: 1,
        interpretation: "design.html missing .scaffold class",
      }),
      ev("CHECK_PASS", { attempt: 1, id: "design-exists" }),
      ev("TASK_ATTEMPT_END", { attempt: 1, outcome: "check_fail", durationMs: 87421 }),
    ];
    const ctx = buildRetryContext({ events, attempt: 2, maxAttempts: 3 });
    expect(ctx.priorAttempts).toHaveLength(1);
    const a = ctx.priorAttempts[0];
    expect(a.outcome).toBe("check_fail");
    expect(a.durationMs).toBe(87421);
    expect(a.failedChecks).toEqual([{
      id: "uses-glossary",
      command: "grep -q 'scaffold' design.html",
      actualStdout: "",
      actualExitCode: 1,
      interpretation: "design.html missing .scaffold class",
    }]);
    expect(a.passedChecks).toEqual(["design-exists"]);
  });

  it("aggregates files produced/modified separately", () => {
    const events: RetryEvent[] = [
      ev("FILE_PRODUCED", { attempt: 1, path: "lib/screen.dart" }),
      ev("FILE_MODIFIED", { attempt: 1, path: "lib/router.dart" }),
      ev("TASK_ATTEMPT_END", { attempt: 1, outcome: "success", durationMs: 1000 }),
    ];
    const ctx = buildRetryContext({ events, attempt: 2, maxAttempts: 3 });
    expect(ctx.priorAttempts[0].filesProduced).toEqual(["lib/screen.dart"]);
    expect(ctx.priorAttempts[0].filesModified).toEqual(["lib/router.dart"]);
  });

  it("collects tool calls with name / target / result", () => {
    const events: RetryEvent[] = [
      ev("TOOL_CALL", { attempt: 1, name: "Edit", target: "design.html", result: "success" }),
      ev("TOOL_CALL", { attempt: 1, name: "Write", result: "failure" }),
    ];
    const ctx = buildRetryContext({ events, attempt: 2, maxAttempts: 3 });
    expect(ctx.priorAttempts[0].toolCalls).toEqual([
      { name: "Edit", target: "design.html", result: "success" },
      { name: "Write", target: undefined, result: "failure" },
    ]);
  });

  it("excludes events from the current and future attempts", () => {
    const events: RetryEvent[] = [
      ev("TASK_ATTEMPT_END", { attempt: 1, outcome: "check_fail", durationMs: 10 }),
      ev("TASK_ATTEMPT_END", { attempt: 2, outcome: "success", durationMs: 20 }),
      ev("TASK_ATTEMPT_END", { attempt: 3, outcome: "success", durationMs: 30 }),
    ];
    // attempt=2 means we're about to start attempt 2, so only attempt 1 is prior.
    const ctx = buildRetryContext({ events, attempt: 2, maxAttempts: 3 });
    expect(ctx.priorAttempts.map((a) => a.attempt)).toEqual([1]);
  });

  it("sorts priorAttempts ascending by attempt number", () => {
    const events: RetryEvent[] = [
      ev("TASK_ATTEMPT_END", { attempt: 2, outcome: "check_fail", durationMs: 1 }),
      ev("TASK_ATTEMPT_END", { attempt: 1, outcome: "transient", durationMs: 2 }),
    ];
    const ctx = buildRetryContext({ events, attempt: 3, maxAttempts: 3 });
    expect(ctx.priorAttempts.map((a) => a.attempt)).toEqual([1, 2]);
  });

  it("ignores events without an attempt field", () => {
    const events: RetryEvent[] = [
      ev("CHECK_FAIL", { id: "x", command: "y" }), // no attempt
    ];
    const ctx = buildRetryContext({ events, attempt: 2, maxAttempts: 3 });
    expect(ctx.priorAttempts).toEqual([]);
  });

  it("ignores unknown outcome values (defaults to deterministic)", () => {
    const events: RetryEvent[] = [
      ev("TASK_ATTEMPT_END", { attempt: 1, outcome: "garbage", durationMs: 100 }),
    ];
    const ctx = buildRetryContext({ events, attempt: 2, maxAttempts: 3 });
    expect(ctx.priorAttempts[0].outcome).toBe("deterministic");
    expect(ctx.priorAttempts[0].durationMs).toBe(100);
  });
});
