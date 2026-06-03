/**
 * Patch validator — applies patches and runs pytest inside the container
 * to determine if the agent's fix resolves the issue.
 *
 * Validation flow:
 * 1. Apply the test patch (adds/modifies tests from SWE-bench gold data)
 * 2. Run FAIL_TO_PASS tests — these must now pass with the agent's fix
 * 3. Run PASS_TO_PASS tests — these must still pass (no regressions)
 */

import type { DockerContainer } from "../docker/container.ts";
import type { SWEBenchInstance } from "../dataset/types.ts";

export interface PatchValidationResult {
  /** Whether all FAIL_TO_PASS tests now pass */
  failToPassResolved: boolean;
  /** Whether all PASS_TO_PASS tests still pass */
  passToPassMaintained: boolean;
  /** Overall: both conditions met */
  resolved: boolean;
  /** FAIL_TO_PASS test results */
  failToPass: TestResult[];
  /** PASS_TO_PASS test results */
  passToPass: TestResult[];
  /** Raw pytest output */
  rawOutput: string;
}

export interface TestResult {
  testName: string;
  passed: boolean;
}

/**
 * Parse test names from the comma/bracket-separated SWE-bench format.
 * Handles both JSON array strings and plain comma-separated values.
 */
function parseTestList(raw: string): string[] {
  if (!raw || raw.trim() === "") return [];

  const trimmed = raw.trim();
  // Try JSON array first (e.g. '["test_foo", "test_bar"]')
  if (trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as string[];
    } catch {
      // Fall through to comma splitting
    }
  }

  return trimmed
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Extract the agent's patch as a git diff from the container.
 */
export async function extractAgentPatch(
  container: DockerContainer,
): Promise<string> {
  const result = await container.exec("git diff", { workDir: "/workspace" });
  return result.stdout;
}

/**
 * Apply a patch (git diff) inside the container.
 */
async function applyPatch(
  container: DockerContainer,
  patch: string,
): Promise<{ success: boolean; output: string }> {
  // Write the patch to a temp file
  const escaped = patch.replace(/'/g, "'\\''");
  const writeResult = await container.exec(
    `printf '%s' '${escaped}' > /tmp/patch.diff`,
  );
  if (writeResult.exitCode !== 0) {
    return { success: false, output: writeResult.stderr };
  }

  const result = await container.exec("git apply /tmp/patch.diff", {
    workDir: "/workspace",
  });
  return {
    success: result.exitCode === 0,
    output: result.stdout + result.stderr,
  };
}

/**
 * Run specific pytest tests and parse pass/fail per test.
 */
async function runTests(
  container: DockerContainer,
  testNames: string[],
  timeoutMs: number = 300_000,
): Promise<{ results: TestResult[]; rawOutput: string }> {
  if (testNames.length === 0) {
    return { results: [], rawOutput: "" };
  }

  // Run pytest with verbose output for parsing
  const testArgs = testNames.join(" ");
  const result = await container.exec(
    `python -m pytest ${testArgs} -v --tb=short 2>&1 || true`,
    { workDir: "/workspace", timeoutMs },
  );

  const rawOutput = result.stdout + result.stderr;
  const results: TestResult[] = [];

  // Parse pytest verbose output for PASSED/FAILED lines
  for (const testName of testNames) {
    // Check for explicit PASSED or FAILED markers in pytest output
    const shortName = testName.split("::").pop() ?? testName;
    const passed =
      rawOutput.includes(`${testName} PASSED`) ||
      rawOutput.includes(`${shortName} PASSED`);
    const failed =
      rawOutput.includes(`${testName} FAILED`) ||
      rawOutput.includes(`${shortName} FAILED`) ||
      rawOutput.includes(`${testName} ERROR`) ||
      rawOutput.includes(`${shortName} ERROR`);

    results.push({
      testName,
      passed: passed && !failed,
    });
  }

  return { results, rawOutput };
}

/**
 * Validate the agent's patch against the SWE-bench instance.
 *
 * Steps:
 * 1. Apply the test patch (gold test modifications from SWE-bench)
 * 2. Run FAIL_TO_PASS tests — should now pass if the agent's fix is correct
 * 3. Run PASS_TO_PASS tests — should still pass (no regressions)
 */
export async function validatePatch(
  container: DockerContainer,
  instance: SWEBenchInstance,
  opts?: { testTimeoutMs?: number },
): Promise<PatchValidationResult> {
  const testTimeout = opts?.testTimeoutMs ?? 300_000;

  // Apply the test patch (adds/modifies test files)
  if (instance.test_patch) {
    const patchResult = await applyPatch(container, instance.test_patch);
    if (!patchResult.success) {
      return {
        failToPassResolved: false,
        passToPassMaintained: false,
        resolved: false,
        failToPass: [],
        passToPass: [],
        rawOutput: `Failed to apply test patch: ${patchResult.output}`,
      };
    }
  }

  const failToPassTests = parseTestList(instance.FAIL_TO_PASS);
  const passToPassTests = parseTestList(instance.PASS_TO_PASS);

  // Run FAIL_TO_PASS tests
  const f2p = await runTests(container, failToPassTests, testTimeout);
  const failToPassResolved =
    f2p.results.length > 0 && f2p.results.every((r) => r.passed);

  // Run PASS_TO_PASS tests
  const p2p = await runTests(container, passToPassTests, testTimeout);
  const passToPassMaintained =
    p2p.results.length === 0 || p2p.results.every((r) => r.passed);

  return {
    failToPassResolved,
    passToPassMaintained,
    resolved: failToPassResolved && passToPassMaintained,
    failToPass: f2p.results,
    passToPass: p2p.results,
    rawOutput: [f2p.rawOutput, p2p.rawOutput].filter(Boolean).join("\n---\n"),
  };
}
