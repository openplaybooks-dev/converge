---
id: 01-detect-drift
title: Detect doc drift for changed source files

inputs:
  - ".converge/inputs/changed-source-files.txt"

outputs:
  - ".converge/playbooks/ci-docs-drift/output/drift-report.md"

checks:
  - id: report-exists
    cmd: "test -s .converge/playbooks/ci-docs-drift/output/drift-report.md"
    description: drift-report.md exists and is non-empty
---

Read `.converge/inputs/changed-source-files.txt` — one source-file path per
line, filtered upstream to `packages/**/*.ts` and `packages/**/*.md`.

For each changed file:

1. Search `docs/` for any markdown page whose frontmatter `sources:` list
   includes that path (the convention used by `.converge/playbooks/generate-docs/`).
2. If a doc page lists it, read the current source file and the current doc
   page. Decide whether the documented behaviour still matches what the
   code actually does.
3. If it doesn't match, write a one-paragraph description of the drift and
   a concrete suggested fix (specific paragraph or code block to update).

Write `.converge/playbooks/ci-docs-drift/output/drift-report.md` with this
shape:

```
## Files Checked

- <path> — <doc pages that reference it, or "no documented sources">

## Drift Detected

### <doc path>
- **Source:** <source path>
- **Drift:** <one paragraph>
- **Suggested fix:** <concrete edit>

## No Drift

- <doc paths that still match their sources>
```

If none of the changed files appear in any doc's `sources:`, the entire
body should be the single line `No documented sources affected.`
