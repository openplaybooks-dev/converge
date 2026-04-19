---
id: "{{taskId}}"
title: "Analyze codebase — epoch {{epoch}}"
checks:
  - id: analysis-written
    cmd: "test -f {{analysisDir}}/epoch-{{epoch}}.json"
    description: "Analysis JSON exists"
---

# Analyze codebase

Scan the converge framework for quality issues. Write a JSON report.

## What to scan

1. Type errors: `cd {{projectDir}} && pnpm typecheck 2>&1`
2. Large files (>500 lines) in `packages/core/src/`
3. Dead exports from `packages/core/src/index.ts`
4. Missing test directories in `packages/core/src/*/`
5. Any other code quality issues you find

## Output

Write a JSON file to `{{analysisDir}}/epoch-{{epoch}}.json`:
```json
{
  "issues": [
    { "id": "unique-id", "category": "type-error|large-file|dead-export|missing-tests|other",
      "priority": 1, "file": "path/to/file", "description": "..." }
  ]
}
```

Sort by priority (1 = highest). Be specific — include file paths and line numbers.
