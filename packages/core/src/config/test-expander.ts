/**
 * Test Expander — resolves TestRefCheck entries to InlineCheck entries
 * by looking up test definitions in a registry.
 */

import type { TestDef, TestArg } from "./test-md-definition.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TestRefCheck {
  type: "test";
  name: string;
  args?: Record<string, string>;
}

export interface InlineCheck {
  id: string;
  description?: string;
  cmd?: string;
  type?: "cmd" | "ai";
}

export interface ParsedTask {
  id: string;
  checks: Array<InlineCheck | TestRefCheck>;
  _testRefs?: string[];
}

/* ------------------------------------------------------------------ */
/*  Errors                                                             */
/* ------------------------------------------------------------------ */

export class UnresolvedTestRefError extends Error {
  constructor(testName: string) {
    super(`Unresolved test reference: "${testName}"`);
    this.name = "UnresolvedTestRefError";
  }
}

export class TestArgTypeError extends Error {
  constructor(
    testName: string,
    argName: string,
    expected: string,
    got: string,
  ) {
    super(
      `Test "${testName}" arg "${argName}": expected ${expected}, got ${got}`,
    );
    this.name = "TestArgTypeError";
  }
}

export class TestArgMissingError extends Error {
  constructor(testName: string, argName: string) {
    super(`Test "${testName}" missing required arg: "${argName}"`);
    this.name = "TestArgMissingError";
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isTestRef(c: InlineCheck | TestRefCheck): c is TestRefCheck {
  return "name" in c && (c as TestRefCheck).type === "test";
}

/* ------------------------------------------------------------------ */
/*  Core function                                                      */
/* ------------------------------------------------------------------ */

export function expandTestRefs(
  task: ParsedTask,
  registry: Map<string, TestDef>,
): ParsedTask {
  const testRefs: string[] = [];
  const usedIds = new Set<string>();

  // Collect existing inline check ids to detect collisions
  for (const c of task.checks) {
    if (!isTestRef(c)) {
      usedIds.add((c as InlineCheck).id);
    }
  }

  const expanded: InlineCheck[] = [];

  for (const check of task.checks) {
    if (isTestRef(check)) {
      const ref = check;
      const def = registry.get(ref.name);
      if (!def) {
        throw new UnresolvedTestRefError(ref.name);
      }

      testRefs.push(ref.name);

      // Validate and resolve args
      const resolvedArgs = resolveArgs(ref.name, ref.args ?? {}, def.args);

      // Substitute {{ args.<key> }} in script
      const cmd = substituteArgs(def.script, resolvedArgs);

      // Generate unique id
      let id = `${task.id}--test-${ref.name}`;
      if (usedIds.has(id)) {
        let suffix = 2;
        while (usedIds.has(`${id}-${suffix}`)) suffix++;
        id = `${id}-${suffix}`;
      }
      usedIds.add(id);

      // Wrap JS / Python tests so the runner can execute them as a single
      // shell command. `cmd` tests run as plain shell.
      const finalCmd =
        def.type === "js"
          ? wrapJsScript(cmd, task.id)
          : def.type === "py"
            ? wrapPyScript(cmd)
            : cmd;

      expanded.push({
        id,
        description: def.description,
        cmd: finalCmd,
        // js / py tests run via the shell after wrapping, so they fold into "cmd"
        type: def.type === "js" || def.type === "py" ? "cmd" : def.type,
      });
    } else {
      expanded.push(check);
    }
  }

  return {
    ...task,
    checks: expanded,
    _testRefs: testRefs,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveArgs(
  testName: string,
  provided: Record<string, string>,
  schema: Record<string, TestArg>,
): Record<string, string> {
  const resolved: Record<string, string> = {};

  // Fill defaults and validate provided args
  for (const [key, argDef] of Object.entries(schema)) {
    if (key in provided) {
      resolved[key] = validateArg(testName, key, provided[key], argDef);
    } else if (argDef.default !== undefined) {
      resolved[key] = String(argDef.default);
    } else {
      throw new TestArgMissingError(testName, key);
    }
  }

  // Warn on unknown args? No — the spec doesn't mention it, skip.

  return resolved;
}

function validateArg(
  testName: string,
  argName: string,
  value: string,
  argDef: TestArg,
): string {
  switch (argDef.type) {
    case "number": {
      const n = Number(value);
      if (isNaN(n)) {
        throw new TestArgTypeError(testName, argName, "number", typeof value);
      }
      return value;
    }
    case "boolean": {
      if (value !== "true" && value !== "false") {
        throw new TestArgTypeError(testName, argName, "boolean", typeof value);
      }
      return value;
    }
    case "string":
      return value;
  }
}

function substituteArgs(script: string, args: Record<string, string>): string {
  return script.replace(/\{\{\s*args\.(\w+)\s*\}\}/g, (_, key) => {
    if (key in args) return args[key];
    return `{{ args.${key} }}`; // leave unresolved placeholders alone
  });
}

function wrapJsScript(script: string, taskId: string): string {
  // Escape only the characters that bash treats specially inside a
  // double-quoted string. Real newlines are preserved so multi-line JS
  // sources parse correctly.
  const escaped = script
    .replace(/\\/g, "\\\\")
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`")
    .replace(/"/g, '\\"');
  return (
    `node -e "const { createTestContext } = require('@openplaybooks/converge-core/test-context'); ` +
    `const context = createTestContext('${taskId}'); ${escaped}"`
  );
}

function wrapPyScript(script: string): string {
  // Escape only the characters that bash treats specially inside a
  // double-quoted string. Real newlines are preserved so the Python
  // parser sees a multi-line source as written.
  const escaped = script
    .replace(/\\/g, "\\\\")
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`")
    .replace(/"/g, '\\"');
  return `python -c "${escaped}"`;
}
