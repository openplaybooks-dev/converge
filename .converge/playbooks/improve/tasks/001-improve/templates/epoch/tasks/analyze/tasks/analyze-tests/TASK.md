---
id: "{{taskId}}"
title: "Analyze test coverage — epoch {{epoch}}"
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/analyze-tests/report.json"
    description: "Test analysis report exists"
---

# Analyze test coverage

Scan for gaps in test coverage across the project.

## What to look for

1. **Missing test files** — source directories with no corresponding tests
2. **Untested public functions** — exported functions with no test coverage
3. **Fragile tests** — tests that depend on implementation details
4. **Missing edge cases** — error paths, boundary conditions not tested

## Output

Write `{{artifactsDir}}/analyze-tests/report.json`:
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
