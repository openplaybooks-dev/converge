/**
 * DoD (Definition of Done) Runner
 *
 * Provides a Jest-like describe/it/expect API for check scripts.
 * A single dod.js replaces both metric.js and report.js:
 *   - Metric value = count of failed `it` blocks (0 = all pass)
 *   - Report data = populated via ctx.data(key, value)
 */

import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DodTestResult {
  description: string;
  passed: boolean;
  error?: string;
}

export interface DodSuiteResult {
  description: string;
  tests: DodTestResult[];
}

export interface DodResult {
  /** Count of failed tests */
  value: number;
  /** Total test count */
  total: number;
  suites: DodSuiteResult[];
  /** Populated by ctx.data() calls */
  reportData: Record<string, unknown>;
  /** Formatted pass/fail summary */
  detail: string;
}

/* ------------------------------------------------------------------ */
/*  Assertion error                                                    */
/* ------------------------------------------------------------------ */

class DodAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DodAssertionError";
  }
}

/* ------------------------------------------------------------------ */
/*  Expect implementation                                              */
/* ------------------------------------------------------------------ */

interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toContain(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toMatch(pattern: RegExp | string): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  not: Matchers;
}

function createMatchers(actual: unknown, negated: boolean): Matchers {
  function assert(pass: boolean, msg: string): void {
    const effective = negated ? !pass : pass;
    if (!effective) {
      throw new DodAssertionError(negated ? `not: ${msg}` : msg);
    }
  }

  const matchers: Matchers = {
    toBe(expected: unknown) {
      assert(
        actual === expected,
        `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`,
      );
    },
    toEqual(expected: unknown) {
      assert(
        JSON.stringify(actual) === JSON.stringify(expected),
        `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
      );
    },
    toContain(expected: unknown) {
      if (typeof actual === "string") {
        assert(
          actual.includes(String(expected)),
          `Expected string to contain ${JSON.stringify(expected)}`,
        );
      } else if (Array.isArray(actual)) {
        assert(
          actual.includes(expected),
          `Expected array to contain ${JSON.stringify(expected)}`,
        );
      } else {
        assert(
          false,
          `toContain requires string or array, got ${typeof actual}`,
        );
      }
    },
    toBeTruthy() {
      assert(!!actual, `Expected ${JSON.stringify(actual)} to be truthy`);
    },
    toBeFalsy() {
      assert(!actual, `Expected ${JSON.stringify(actual)} to be falsy`);
    },
    toMatch(pattern: RegExp | string) {
      const re = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      assert(
        re.test(String(actual)),
        `Expected ${JSON.stringify(actual)} to match ${re}`,
      );
    },
    toBeGreaterThan(expected: number) {
      assert(
        (actual as number) > expected,
        `Expected ${actual} to be greater than ${expected}`,
      );
    },
    toBeLessThan(expected: number) {
      assert(
        (actual as number) < expected,
        `Expected ${actual} to be less than ${expected}`,
      );
    },
    get not(): Matchers {
      return createMatchers(actual, !negated);
    },
  };

  return matchers;
}

type ExpectFn = ((actual: unknown) => Matchers) & { fail(msg: string): void };

function createExpect(): ExpectFn {
  const fn = ((actual: unknown) => createMatchers(actual, false)) as ExpectFn;
  fn.fail = (msg: string) => {
    throw new DodAssertionError(msg);
  };
  return fn;
}

/* ------------------------------------------------------------------ */
/*  Runner                                                             */
/* ------------------------------------------------------------------ */

interface CollectedTest {
  suite: string;
  description: string;
  fn: () => Promise<void>;
}

export async function runDod(
  scriptPath: string,
  projectDir: string,
): Promise<DodResult> {
  const reportData: Record<string, unknown> = {};
  const tests: CollectedTest[] = [];
  let currentSuite = "(root)";

  const expect = createExpect();

  const ctx = {
    projectDir,
    expect,
    describe(name: string, fn: () => void | Promise<void>) {
      const prev = currentSuite;
      currentSuite = name;
      const result = fn();
      if (result && typeof (result as Promise<void>).then === "function") {
        return (result as Promise<void>).then(() => {
          currentSuite = prev;
        });
      }
      currentSuite = prev;
    },
    it(description: string, fn: () => void | Promise<void>) {
      const suite = currentSuite;
      tests.push({
        suite,
        description,
        fn: async () => {
          await fn();
        },
      });
    },
    data(key: string, value: unknown) {
      reportData[key] = value;
    },
    exec(cmd: string): string {
      return execSync(cmd, {
        cwd: projectDir,
        encoding: "utf8",
        timeout: 30_000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    },
  };

  // Load and run the dod.js module (collects tests + runs setup)
  const mod = await import(pathToFileURL(scriptPath).href);
  await mod.run(ctx);

  // Execute collected tests sequentially
  const suiteMap = new Map<string, DodTestResult[]>();
  let failCount = 0;

  for (const test of tests) {
    let passed = true;
    let error: string | undefined;

    try {
      await test.fn();
    } catch (err: any) {
      passed = false;
      error =
        err instanceof DodAssertionError
          ? err.message
          : (err.message ?? String(err));
      failCount++;
    }

    const results = suiteMap.get(test.suite) ?? [];
    results.push({ description: test.description, passed, error });
    suiteMap.set(test.suite, results);
  }

  // Build suites array
  const suites: DodSuiteResult[] = [];
  for (const [description, testResults] of suiteMap) {
    suites.push({ description, tests: testResults });
  }

  // Build detail string
  const lines: string[] = [];
  for (const suite of suites) {
    lines.push(suite.description);
    for (const t of suite.tests) {
      lines.push(
        `  ${t.passed ? "✓" : "✗"} ${t.description}${t.error ? ` — ${t.error}` : ""}`,
      );
    }
  }

  return {
    value: failCount,
    total: tests.length,
    suites,
    reportData,
    detail: lines.join("\n"),
  };
}
