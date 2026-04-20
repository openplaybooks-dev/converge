# Task: 001-improve/epoch-001/001-analyze/001-analyze-tests

# Analyze test coverage

Scan for gaps in test coverage across the project.

## What to look for

1. **Missing test files** — source directories with no corresponding tests
2. **Untested public functions** — exported functions with no test coverage
3. **Fragile tests** — tests that depend on implementation details
4. **Missing edge cases** — error paths, boundary conditions not tested

## Output

Write `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-tests/report.json`:
```json
{
  "aspect": "test-coverage",
  "issues": [
    { "id": "test-001", "file": "path/to/file.ts",
      "description": "...", "severity": "warning",
      "effort": "small|medium|large" }
  ]
}
```