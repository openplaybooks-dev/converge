import { describe, it, expect } from "vitest";
import {
  expandTestRefs,
  UnresolvedTestRefError,
  TestArgTypeError,
  TestArgMissingError,
} from "../../src/config/test-expander.ts";
import type { TestDef } from "../../src/config/test-md-definition.ts";
import type { ParsedTask, InlineCheck, TestRefCheck } from "../../src/config/test-expander.ts";

function makeRegistry(defs: TestDef[]): Map<string, TestDef> {
  const m = new Map<string, TestDef>();
  for (const d of defs) m.set(d.name, d);
  return m;
}

const freshnessDef: TestDef = {
  name: "freshness",
  description: "Assert file is non-empty",
  type: "cmd",
  args: { path: { type: "string" } },
  script: "test -s {{ args.path }}",
};

const apiCheckDef: TestDef = {
  name: "api-check",
  type: "js",
  args: { endpoint: { type: "string" } },
  script: 'context.assert(context.inputs.length > 0, "No input files");',
};

const timeoutDef: TestDef = {
  name: "timeout-check",
  type: "cmd",
  args: {
    timeout: { type: "number", default: 5000 },
    path: { type: "string" },
  },
  script: "sleep {{ args.timeout }} && test -f {{ args.path }}",
};

describe("expandTestRefs", () => {
  it("expands a TestRefCheck into an InlineCheck", () => {
    const task: ParsedTask = {
      id: "my-task",
      checks: [{ type: "test", name: "freshness", args: { path: "out.txt" } }],
    };

    const result = expandTestRefs(task, makeRegistry([freshnessDef]));

    expect(result.checks).toHaveLength(1);
    const check = result.checks[0] as InlineCheck;
    expect(check.id).toBe("my-task--test-freshness");
    expect(check.cmd).toBe("test -s out.txt");
    expect(check.description).toBe("Assert file is non-empty");
    expect(result._testRefs).toEqual(["freshness"]);
  });

  it("throws UnresolvedTestRefError for unknown test name", () => {
    const task: ParsedTask = {
      id: "my-task",
      checks: [{ type: "test", name: "nonexistent" }],
    };

    expect(() => expandTestRefs(task, makeRegistry([freshnessDef]))).toThrow(
      UnresolvedTestRefError,
    );
  });

  it("throws TestArgTypeError when arg type mismatches", () => {
    const task: ParsedTask = {
      id: "my-task",
      checks: [
        { type: "test", name: "freshness", args: { path: "123" } },
        { type: "test", name: "timeout-check", args: { timeout: "abc", path: "f" } },
      ],
    };

    expect(() =>
      expandTestRefs(task, makeRegistry([freshnessDef, timeoutDef])),
    ).toThrow(TestArgTypeError);
  });

  it("throws TestArgMissingError when required arg is missing", () => {
    const task: ParsedTask = {
      id: "my-task",
      checks: [{ type: "test", name: "freshness" }],
    };

    expect(() => expandTestRefs(task, makeRegistry([freshnessDef]))).toThrow(
      TestArgMissingError,
    );
  });

  it("appends suffix on id collision", () => {
    const task: ParsedTask = {
      id: "my-task",
      checks: [
        { id: "my-task--test-freshness", cmd: "echo pre-existing" },
        { type: "test", name: "freshness", args: { path: "out.txt" } },
      ],
    };

    const result = expandTestRefs(task, makeRegistry([freshnessDef]));

    expect(result.checks).toHaveLength(2);
    const expanded = result.checks[1] as InlineCheck;
    expect(expanded.id).toBe("my-task--test-freshness-2");
  });

  it("preserves inline checks while expanding refs", () => {
    const task: ParsedTask = {
      id: "my-task",
      checks: [
        { id: "lint", cmd: "pnpm lint" },
        { type: "test", name: "freshness", args: { path: "out.txt" } },
        { id: "typecheck", cmd: "pnpm typecheck" },
      ],
    };

    const result = expandTestRefs(task, makeRegistry([freshnessDef]));

    expect(result.checks).toHaveLength(3);
    expect(result.checks[0]).toEqual({ id: "lint", cmd: "pnpm lint" });
    expect((result.checks[1] as InlineCheck).cmd).toBe("test -s out.txt");
    expect(result.checks[2]).toEqual({ id: "typecheck", cmd: "pnpm typecheck" });
  });

  it("wraps js tests in node -e with context", () => {
    const task: ParsedTask = {
      id: "my-task",
      checks: [
        { type: "test", name: "api-check", args: { endpoint: "https://api.example.com" } },
      ],
    };

    const result = expandTestRefs(task, makeRegistry([apiCheckDef]));

    const check = result.checks[0] as InlineCheck;
    expect(check.type).toBe("cmd");
    expect(check.cmd).toContain("node -e");
    expect(check.cmd).toContain("@converge/core/test-context");
    expect(check.cmd).toContain("context.assert");
  });

  it("uses default arg values when not provided", () => {
    const task: ParsedTask = {
      id: "my-task",
      checks: [
        { type: "test", name: "timeout-check", args: { path: "file.txt" } },
      ],
    };

    const result = expandTestRefs(task, makeRegistry([timeoutDef]));

    const check = result.checks[0] as InlineCheck;
    expect(check.cmd).toBe("sleep 5000 && test -f file.txt");
  });
});
