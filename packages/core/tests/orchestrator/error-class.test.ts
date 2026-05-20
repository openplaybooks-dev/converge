/**
 * RFC 0003 — Tests for the three-tier error classifier and retry policy.
 *
 * Covers the 10-case test plan from the RFC plus boundary tests for
 * the backoff math and AuthoringError construction.
 */
import { describe, it, expect } from "vitest";
import {
  classifyError,
  computeBackoffMs,
  AuthoringError,
  EX_AUTHORING,
} from "../../src/orchestrator/error-class.ts";

describe("classifyError — transient class", () => {
  it("(1) idle timeout → transient with retry hint", () => {
    const c = classifyError(new Error("claudefn idle-timed out after 600000ms of inactivity"));
    expect(c.class).toBe("transient");
    expect(c.reason).toBe("Idle timeout");
    expect(c.retryAfterMs).toBeGreaterThan(0);
  });

  it("(2) 429 → transient", () => {
    const c = classifyError(new Error("HTTP 429 rate limited"));
    expect(c.class).toBe("transient");
    expect(c.reason).toBe("Rate limit");
  });

  it("(2b) `rate-limited` text alone → transient", () => {
    const c = classifyError(new Error("anthropic: rate-limited, please retry"));
    expect(c.class).toBe("transient");
  });

  it("(3) HTTP 5xx → transient", () => {
    expect(classifyError(new Error("HTTP 503 service unavailable")).class).toBe("transient");
    expect(classifyError(new Error("HTTP 502 bad gateway")).class).toBe("transient");
    expect(classifyError(new Error("overloaded_error")).class).toBe("transient");
  });

  it("network blips → transient", () => {
    expect(classifyError(new Error("ECONNRESET")).class).toBe("transient");
    expect(classifyError(new Error("ETIMEDOUT")).class).toBe("transient");
    expect(classifyError(new Error("ENOTFOUND api.anthropic.com")).class).toBe("transient");
    expect(classifyError(new Error("socket hang up")).class).toBe("transient");
  });

  it("billing/quota → transient (Credits depleted)", () => {
    const c = classifyError(new Error("Your credits are depleted"));
    expect(c.class).toBe("transient");
    expect(c.reason).toBe("Credits depleted");
  });
});

describe("classifyError — authoring class", () => {
  it("(6) cycle detected → authoring", () => {
    expect(classifyError(new Error("Cycle detected: a → b → a")).class).toBe("authoring");
  });

  it("(7) Unknown flag for spawn template → authoring", () => {
    const c = classifyError(new Error("Unknown flag for spawn template: Tracking"));
    expect(c.class).toBe("authoring");
    expect(c.reason).toBe("Spawn syntax error");
  });

  it("(7b) Unknown flag for spawn task → authoring", () => {
    expect(classifyError(new Error("Unknown flag for spawn task: --garbage")).class).toBe("authoring");
  });

  it("(8) template var mismatch → authoring", () => {
    const c = classifyError(new Error("Template '...' references undefined variable '{{widgetPath}}'"));
    expect(c.class).toBe("authoring");
    expect(c.reason).toBe("Template var mismatch");
  });

  it("malformed TASK.md → authoring", () => {
    expect(classifyError(new Error("Invalid frontmatter at TASK.md")).class).toBe("authoring");
    expect(classifyError(new Error("Missing required field: id")).class).toBe("authoring");
  });

  it("duplicate node id → authoring", () => {
    expect(classifyError(new Error("Duplicate node id: parent")).class).toBe("authoring");
  });

  it("extracts a source path:line from the stack when available", () => {
    const err = new Error("Cycle detected");
    err.stack = "Error: Cycle detected\n    at fn (D:/converge/packages/core/src/dag/task-dag.ts:42:10)";
    const c = classifyError(err);
    expect(c.class).toBe("authoring");
    expect(c.sourcePath).toBe("D:/converge/packages/core/src/dag/task-dag.ts");
    expect(c.sourceLine).toBe(42);
  });
});

describe("classifyError — deterministic class (fallthrough)", () => {
  it("(4) check fail → deterministic (default fallthrough)", () => {
    const c = classifyError(new Error("check `lint` failed with exit code 1"));
    expect(c.class).toBe("deterministic");
  });

  it("(5) missing input → deterministic", () => {
    // No specific authoring or transient pattern; fall through.
    expect(classifyError(new Error("Required input not found: lib/foo.dart")).class)
      .toBe("deterministic");
  });

  it("captures the first non-empty line as reason", () => {
    const c = classifyError(new Error("first line\nsecond line\nthird"));
    expect(c.reason).toBe("first line");
  });

  it("handles non-Error inputs gracefully", () => {
    expect(classifyError("plain string error").class).toBe("deterministic");
    expect(classifyError({ message: "object-shaped" }).class).toBe("deterministic");
    expect(classifyError(null).reason).toBe("Unknown error");
    expect(classifyError(undefined).reason).toBe("Unknown error");
  });
});

describe("classifyError — precedence", () => {
  it("authoring wins over transient when both phrases appear", () => {
    const err = new Error("Cycle detected after HTTP 429 retry");
    expect(classifyError(err).class).toBe("authoring");
  });
});

describe("computeBackoffMs", () => {
  it("doubles per attempt starting from baseMs", () => {
    const opts = { baseMs: 1000, capMs: 300_000 };
    expect(computeBackoffMs(1, opts)).toBe(1000);
    expect(computeBackoffMs(2, opts)).toBe(2000);
    expect(computeBackoffMs(3, opts)).toBe(4000);
    expect(computeBackoffMs(4, opts)).toBe(8000);
    expect(computeBackoffMs(5, opts)).toBe(16_000);
  });

  it("caps at capMs (default 5 min)", () => {
    expect(computeBackoffMs(20, { baseMs: 1000 })).toBe(300_000);
    expect(computeBackoffMs(20, { baseMs: 1000, capMs: 60_000 })).toBe(60_000);
  });

  it("coerces attempt <= 0 to 1", () => {
    expect(computeBackoffMs(0, { baseMs: 500 })).toBe(500);
    expect(computeBackoffMs(-3, { baseMs: 500 })).toBe(500);
  });

  it("returns capMs if the math overflows", () => {
    expect(computeBackoffMs(10_000, { baseMs: 1000, capMs: 9_999 })).toBe(9_999);
  });
});

describe("AuthoringError + EX_AUTHORING", () => {
  it("reserves exit code 64", () => {
    expect(EX_AUTHORING).toBe(64);
  });

  it("captures sourcePath + sourceLine when supplied", () => {
    const e = new AuthoringError("var mismatch", "/abs/parent/TASK.md", 12);
    expect(e.name).toBe("AuthoringError");
    expect(e.message).toBe("var mismatch");
    expect(e.sourcePath).toBe("/abs/parent/TASK.md");
    expect(e.sourceLine).toBe(12);
  });

  it("is an instance of Error", () => {
    expect(new AuthoringError("x") instanceof Error).toBe(true);
  });
});
