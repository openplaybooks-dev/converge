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
- `{{artifactsDir}}/analyze/report.md` — what was picked and why
- `{{artifactsDir}}/implement/plan.md` — what was planned
- `{{artifactsDir}}/review/report.md` — review outcome
- `{{projectDir}}/.converge/artifacts/improve/metrics.jsonl` — before/after scores for this epoch

Also run `cd {{projectDir}} && git diff HEAD~1 --stat` to see what files changed (if there are commits from this epoch).

## Output

Write `{{artifactsDir}}/CHANGELOG.md`:

```markdown
# Epoch {{epoch}} — <short title>

## Target Dimension
**<dimension name>**: <before score>/5 → <after score>/5

## What changed
One paragraph: what improvement was made and why.

## Files modified
- `path/to/file.ts` — what changed

## What was considered but skipped
Brief list of runner-up candidates.
```

Keep it concise — this is for a human scanning across epochs.
