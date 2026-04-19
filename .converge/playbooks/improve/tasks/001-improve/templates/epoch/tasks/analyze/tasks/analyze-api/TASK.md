---
id: "{{taskId}}"
title: "Analyze API surface — epoch {{epoch}}"
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/analyze-api/report.json"
    description: "API analysis report exists"
---

# Analyze API surface

Inspect `packages/core/src/index.ts` and public exports for issues.

## What to look for

1. **Dead exports** — exported symbols not imported anywhere else
2. **Missing exports** — public types/functions used externally but not exported
3. **Inconsistent naming** — exports that don't follow project conventions
4. **Leaky internals** — implementation details exposed in the public API

## Output

Write `{{artifactsDir}}/analyze-api/report.json`:
```json
{
  "aspect": "api-surface",
  "issues": [
    { "id": "api-001", "file": "path/to/file.ts",
      "description": "...", "severity": "warning",
      "effort": "small|medium|large" }
  ]
}
```
