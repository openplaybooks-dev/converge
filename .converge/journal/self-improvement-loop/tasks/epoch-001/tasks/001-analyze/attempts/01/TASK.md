# Task: epoch-001/001-analyze

# Analyze codebase

Find the single most impactful improvement to make this epoch.

## Steps

1. Run `cd /Users/minh/Documents/converge && pnpm typecheck 2>&1` — note error count
2. Run `cd /Users/minh/Documents/converge && pnpm test 2>&1` — note pass/fail counts
3. Scan the codebase for structural issues, API problems, or DX gaps
4. Pick the **one best improvement** — highest impact, smallest effort, self-contained

## Output

Write `/Users/minh/Documents/converge/.converge/artifacts/improve/epochs/001/analyze/report.md`:

```markdown
# Analysis — Epoch 1

## Health snapshot
- Type errors: N
- Tests: N passed, N failed

## Picked improvement
- **Area:** what part of the codebase
- **Description:** what to improve and why
- **Rationale:** why this over other options

## Candidates considered
- candidate 1 — why skipped
- candidate 2 — why skipped
```