# Checks: 01-brand/006-verification-audit

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## audit-clean
**Description**: Audit confirms zero stale references
**Command**: `node -e "const a=JSON.parse(require('fs').readFileSync('.converge/standardize-state/brand/006-audit.json','utf-8'));if(a.staleReferences>0)throw new Error(a.staleReferences+' stale refs remain')"`