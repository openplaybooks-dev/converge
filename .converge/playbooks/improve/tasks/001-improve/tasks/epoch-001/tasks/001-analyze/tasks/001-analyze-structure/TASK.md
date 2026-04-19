---
id: 001-analyze-structure
title: Analyze code structure — epoch 1
checks:
  - id: report-written
    description: Structure analysis report exists
    cmd: test -f /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-structure/report.json
vars:
  taskId: 001-analyze-structure
  epoch: 1
  projectDir: /Users/minh/Documents/converge
  artifactsDir: /Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001
---

# Analyze code structure

Scan `packages/core/src/` for structural issues.

## What to look for

1. **Large files** — over 500 lines, candidates for splitting
2. **Circular dependencies** — modules importing each other
3. **God modules** — files doing too many unrelated things
4. **Misplaced code** — functions in the wrong package/directory

## Output

Write `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze-structure/report.json`:
```json
{
  "aspect": "structure",
  "issues": [
    { "id": "struct-001", "file": "path/to/file.ts", "lines": 820,
      "description": "...", "severity": "warning",
      "effort": "small|medium|large" }
  ]
}
```
