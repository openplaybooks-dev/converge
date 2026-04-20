---
id: "{{taskId}}"
title: "Changelog — epoch {{epoch}}"
checks:
  - id: changelog-written
    cmd: "test -f {{artifactsDir}}/CHANGELOG.md"
    description: "Changelog exists"
---

# Write changelog

Summarize what this epoch accomplished so a human can quickly review it.

## Inputs

Read these artifacts:
- `{{artifactsDir}}/prioritize/report.md` — what was picked and why
- `{{artifactsDir}}/implement/plan.md` — what was planned
- `{{artifactsDir}}/review/report.md` — review outcome

Also run `cd {{projectDir}} && git diff HEAD~1 --stat` to see what files changed (if there are commits from this epoch).

## Output

Write `{{artifactsDir}}/CHANGELOG.md`:

```markdown
# Epoch {{epoch}} — <short title>

## What changed
One paragraph: what improvement was made and why.

## Files modified
- `path/to/file.ts` — what changed

## Analysis summary
- **Health:** one-line summary of findings
- **Architecture:** one-line summary of findings
- **DX:** one-line summary of findings

## What was considered but skipped
Brief list of runner-up candidates from prioritize report.
```

Keep it concise — this is for a human scanning across epochs.
