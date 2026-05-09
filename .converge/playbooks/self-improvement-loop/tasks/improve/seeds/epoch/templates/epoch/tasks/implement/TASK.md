---
id: "{{taskId}}"
title: "Implement fix — epoch {{epoch}}"
---

# Implement fix

Read the analysis report and apply the single improvement it picked.

## Input

Read `{{artifactsDir}}/analyze/report.md` — specifically the "Picked improvement" section with the target file(s) and what to change.

## Rules

- Fix ONLY the one issue identified in the analysis report
- Minimal change — touch only the file(s) and lines needed
- No `any` / `@ts-ignore` / type escapes
- No unrelated refactoring
- Match existing code style and conventions
- If the fix requires changing a public API, note it but proceed

## Output

The code changes themselves are the output. No separate plan or todo files needed — this is a single focused change.
