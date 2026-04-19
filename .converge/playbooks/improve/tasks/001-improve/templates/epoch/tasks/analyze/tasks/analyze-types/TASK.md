---
id: "{{taskId}}"
title: "Analyze type errors — epoch {{epoch}}"
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/analyze-types/report.json"
    description: "Type analysis report exists"
---

# Analyze type errors

Run `cd {{projectDir}} && pnpm typecheck 2>&1` and catalog every type error.

## Output

Write `{{artifactsDir}}/analyze-types/report.json`:
```json
{
  "aspect": "type-errors",
  "issues": [
    { "id": "type-001", "file": "path/to/file.ts", "line": 42,
      "description": "...", "severity": "error",
      "effort": "small|medium|large" }
  ]
}
```

Include file path, line number, the exact error message, and estimated fix effort.
