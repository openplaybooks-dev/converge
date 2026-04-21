# Task: epoch-001/005-changelog

# Write changelog

Summarize what this epoch accomplished so a human can quickly review it.

## Inputs

Read these artifacts:
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze/report.md` — what was picked and why
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/implement/plan.md` — what was planned
- `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/review/report.md` — review outcome

Also run `cd /Users/minh/Documents/converge && git diff HEAD~1 --stat` to see what files changed (if there are commits from this epoch).

## Output

Write `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/CHANGELOG.md`:

```markdown
# Epoch 1 — <short title>

## What changed
One paragraph: what improvement was made and why.

## Files modified
- `path/to/file.ts` — what changed

## What was considered but skipped
Brief list of runner-up candidates.
```

Keep it concise — this is for a human scanning across epochs.