---
id: 001-analyze-types
title: Analyze type errors — epoch 1
checks:
  - id: report-written
    description: Type analysis report exists
    cmd: test -f /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-types/report.json
vars:
  taskId: 001-analyze-types
  epoch: 1
  projectDir: /Users/minh/Documents/converge
  artifactsDir: /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001
---

# Analyze type errors

Run `cd /Users/minh/Documents/converge && pnpm typecheck 2>&1` and catalog every type error.

## Output

Write `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-types/report.json`:
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
