# Checks: 01-brand/001-source-rename

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-harness-in-ts
**Description**: No harness references in .ts source files
**Command**: `test -z "$(grep -ri 'harness' --include='*.ts' packages/core/src/ packages/agentfn/src/ packages/claudefn/src/ packages/acpfn/src/ packages/codets/src/ 2>/dev/null | grep -v node_modules | grep -v auto-verify | grep -v '.converge/')"`

## no-crew-in-ts
**Description**: No crew/crewadd/sheetsrun references in .ts source files
**Command**: `test -z "$(grep -ri 'crew\|crewadd\|sheetsrun' --include='*.ts' packages/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"`