# Checks: 04-build-sections/006-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-md-exists
**Description**: apps/landing/.content/sections/quickstart/SPEC.md exists
**Command**: `test -f apps/landing/.content/sections/quickstart/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >=40 lines (substantive)
**Command**: `test -f apps/landing/.content/sections/quickstart/SPEC.md && test $(wc -l < apps/landing/.content/sections/quickstart/SPEC.md) -ge 40`

## spec-references-brand
**Description**: SPEC references brand spec or tokens
**Command**: `test -f apps/landing/.content/sections/quickstart/SPEC.md && grep -qE '(palette|tagline|brand|tokens)' apps/landing/.content/sections/quickstart/SPEC.md`