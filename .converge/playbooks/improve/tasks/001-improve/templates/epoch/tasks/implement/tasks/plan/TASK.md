---
id: "{{taskId}}"
title: "Implementation plan — epoch {{epoch}}"
checks:
  - id: plan-written
    cmd: "test -f {{artifactsDir}}/implement/plan.json"
    description: "Implementation plan JSON exists"
---

# Create implementation plan

Read the prioritized issue at `{{artifactsDir}}/prioritize/report.json` and create a step-by-step implementation plan.

## Rules

- Fix only the ONE picked issue — nothing else
- Don't suppress errors with `any` or `@ts-ignore`
- Don't change public API signatures unless genuinely wrong
- Don't refactor unrelated code
- Each step should be small and self-contained

## Output

Write `{{artifactsDir}}/implement/plan.json`:
```json
{
  "issue": {
    "id": "type-003",
    "source": "types",
    "file": "path/to/file.ts",
    "description": "..."
  },
  "steps": [
    {
      "id": "step-001",
      "description": "What to do",
      "file": "path/to/file.ts",
      "details": "Specific changes to make"
    }
  ]
}
```

Each step becomes a separate todo task. Keep steps small — one logical change per step.
