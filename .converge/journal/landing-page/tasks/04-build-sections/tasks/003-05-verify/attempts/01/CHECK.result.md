# RESULT.md — Attempt 1

**Outcome**: ❌ FAILED
**Duration**: 5m 20s
**Completed**: 2026-04-26T18:11:17.520Z

## Outputs

- `apps/landing/.content/sections/problem-solution/PASSED` — ✓ produced (31 B)

## Check Results — ❌ some failed

- ✓ **build-succeeds**: pnpm build succeeds with this section integrated
- ✗ **rendered-output-exists**: dist/index.html was emitted
- ✗ **section-id-rendered**: <section id=problem-solution> is in the rendered HTML
- ✓ **passed-marker**: PASSED marker file written (signals next section can start)

## Failed Check Details

### rendered-output-exists — ❌ FAILED
**Command**: `test -f apps/landing/dist/index.html`
**Exit code**: 1
**Output**: *(none)*

### section-id-rendered — ❌ FAILED
**Command**: `test -f apps/landing/dist/index.html && grep -qE 'id="problem-solution"' apps/landing/dist/index.html`
**Exit code**: 1
**Output**: *(none)*
