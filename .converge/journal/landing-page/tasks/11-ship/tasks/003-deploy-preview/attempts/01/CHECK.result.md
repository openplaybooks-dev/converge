# RESULT.md — Attempt 1

**Outcome**: ❌ FAILED
**Duration**: 2m 12s
**Completed**: 2026-04-27T00:57:57.045Z

## Outputs

- `apps/landing/.preview-deploy-url` — ✗ missing

## Check Results — ❌ some failed

- ✗ **preview-deployed**: preview deploy succeeded and URL is captured

## Failed Check Details

### preview-deployed — ❌ FAILED
**Command**: `test -f apps/landing/.preview-deploy-url && grep -qE 'pages\.dev|workers\.dev' apps/landing/.preview-deploy-url`
**Exit code**: 1
**Output**: *(none)*
