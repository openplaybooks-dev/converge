#!/usr/bin/env node
// Classify test/build outcome into pass | fail_recoverable | fail_blocked.
//
// Usage:
//   classify-test-result.mjs --build-log <path> --test-log <path>
//                            --diff-stats <path> --out <path>

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const LOAD_BEARING_PATHS = [
  "packages/core/src/orchestrator/",
  "packages/core/src/seed/",
  "packages/core/src/run/",
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

function readSafe(path) {
  if (!path || !existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function tail(s, n) {
  const lines = s.split("\n");
  return lines.slice(-n).join("\n");
}

function buildFailed(buildLog) {
  if (!buildLog) return false;
  // pnpm/tsc errors typically print "error TS" or "ERR" lines
  if (/error TS\d+/.test(buildLog)) return true;
  if (/\bELIFECYCLE\b/.test(buildLog)) return true;
  if (/ERR_PNPM_/.test(buildLog)) return true;
  return false;
}

function extractFailedTests(testLog) {
  if (!testLog) return [];
  // vitest reports "FAIL  tests/foo.test.ts" or "× tests/foo.test.ts > ..."
  const failed = new Set();
  for (const line of testLog.split("\n")) {
    let m;
    if ((m = line.match(/^\s*FAIL\s+(\S+\.test\.[jt]sx?)/))) failed.add(m[1]);
    else if ((m = line.match(/^\s*×\s+(\S+\.test\.[jt]sx?)/))) failed.add(m[1]);
    else if ((m = line.match(/❯\s+(\S+\.test\.[jt]sx?)/))) failed.add(m[1]);
  }
  return [...failed];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(dirname(args.out), { recursive: true });

  const buildLog = readSafe(args.buildLog ?? args["build-log"]);
  const testLog = readSafe(args.testLog ?? args["test-log"]);

  const build_failed = buildFailed(buildLog);
  const failed_tests = extractFailedTests(testLog);

  const load_bearing_failures = failed_tests.filter((f) =>
    LOAD_BEARING_PATHS.some((p) => f.includes(p))
  );

  let outcome;
  if (!build_failed && failed_tests.length === 0) {
    outcome = "pass";
  } else if (build_failed) {
    outcome = "fail_blocked";
  } else if (load_bearing_failures.length > 0) {
    outcome = "fail_blocked";
  } else if (failed_tests.length === 1) {
    outcome = "fail_recoverable";
  } else {
    outcome = "fail_blocked";
  }

  writeFileSync(
    args.out,
    JSON.stringify(
      {
        outcome,
        build_failed,
        failed_tests,
        load_bearing_failures,
        evidence: {
          build_log_tail: tail(buildLog, 50),
          test_log_tail: tail(testLog, 50),
        },
      },
      null,
      2
    )
  );
}

main();
