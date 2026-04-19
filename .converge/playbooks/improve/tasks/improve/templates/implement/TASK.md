---
id: "{{taskId}}"
title: "Fix top issue — epoch {{epoch}}"
checks:
  - id: typecheck
    cmd: "cd {{projectDir}} && pnpm typecheck 2>&1 | grep -v 'error TS' | tail -1"
    description: "TypeScript compiles"
---

# Fix the highest-priority issue

Read the analysis at `{{analysisDir}}/epoch-{{epoch}}.json` and fix the #1 priority issue.

## Rules

- Fix only ONE issue per epoch — the top priority one
- Don't suppress errors with `any` or `@ts-ignore`
- Don't change public API signatures unless genuinely wrong
- Don't refactor unrelated code
- Run `pnpm typecheck` to verify
