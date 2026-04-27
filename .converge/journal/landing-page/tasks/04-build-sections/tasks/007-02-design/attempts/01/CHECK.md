# Checks: 04-build-sections/007-02-design

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-md-exists
**Description**: apps/landing/.content/sections/faq/DESIGN.md exists
**Command**: `test -f apps/landing/.content/sections/faq/DESIGN.md`

## design-has-content
**Description**: DESIGN.md has >=30 lines
**Command**: `test -f apps/landing/.content/sections/faq/DESIGN.md && test $(wc -l < apps/landing/.content/sections/faq/DESIGN.md) -ge 30`

## design-lists-imports
**Description**: DESIGN.md lists which UI/layout primitives to import
**Command**: `test -f apps/landing/.content/sections/faq/DESIGN.md && grep -qE 'import|components/ui|components/layout' apps/landing/.content/sections/faq/DESIGN.md`