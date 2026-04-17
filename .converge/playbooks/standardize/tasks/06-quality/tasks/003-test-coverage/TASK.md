---
title: Test Coverage Report
outputs:
  - .converge/standardize-state/quality/test-report.json
checks:
  - id: test-report-exists
    cmd: test -f .converge/standardize-state/quality/test-report.json
    description: Test report exists
dependencies:
  - 002-build-verify
---

Run the test suite with coverage reporting.

**Process**:

1. **Identify test framework** — check package.json for:
   - Jest, Vitest, Mocha, or similar
   - Test scripts in package.json

2. **Run tests with coverage**:
   - If Jest: `npx jest --coverage`
   - If Vitest: `npx vitest run --coverage`
   - Capture results

3. **Analyze coverage**:
   - Overall line/branch/function coverage percentages
   - Identify packages with low coverage
   - Identify critical files with no tests

4. **Write report** to `.converge/standardize-state/quality/test-report.json`:
```json
{
  "framework": "jest|vitest|mocha",
  "totalTests": 150,
  "passed": 148,
  "failed": 2,
  "skipped": 0,
  "coverage": {
    "lines": 85.5,
    "branches": 72.3,
    "functions": 90.1,
    "statements": 85.0
  },
  "lowCoverageFiles": [
    { "file": "src/cli/main.ts", "lines": 20.0 }
  ],
  "failedTests": [
    { "name": "test name", "error": "error message" }
  ]
}
```

Do NOT fix failing tests in this task — just report them.
Test fixes should be handled in separate tasks.
