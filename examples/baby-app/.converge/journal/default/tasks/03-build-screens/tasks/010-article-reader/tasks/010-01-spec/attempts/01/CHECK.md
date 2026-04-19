# Checks: 03-build-screens/010-article-reader/010-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for article-reader
**Command**: `test -f .stitch/designs/article-reader/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >50 lines
**Command**: `test $(wc -l < .stitch/designs/article-reader/SPEC.md) -gt 50`