# Checks: 09-concepts/001-gap-driven-model

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/concepts/gap-driven-model.md`

## defines-gap
**Description**: defines what a gap is
**Command**: `grep -qiE 'gap' docs/concepts/gap-driven-model.md`

## contrasts-with-step-driven
**Description**: contrasts with step/graph-driven systems
**Command**: `grep -qiE 'step|graph|node' docs/concepts/gap-driven-model.md`

## word-count
**Description**: 600-1200 words
**Command**: `test -f docs/concepts/gap-driven-model.md && wc -w docs/concepts/gap-driven-model.md | awk '{exit ($1>=600&&$1<=1200?0:1)}'`