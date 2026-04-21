# RESULT.md — Attempt 1

**Outcome**: ✅ SUCCESS
**Duration**: 228ms
**Completed**: 2026-04-21T10:49:00.779Z

## Outputs

- `synopsis.md` — ✓ produced (2.7 KB)

## Check Results — ❌ some failed

- ✓ **synopsis-exists**: Synopsis file written and non-empty
- ✗ **synopsis-has-acts**: Synopsis covers all three acts

## Failed Check Details

### synopsis-has-acts — ❌ FAILED
**Command**: `grep -E '^##? (Act|ACT) [1-3]' synopsis.md`
**Exit code**: 255
**Output**:
```
'ACT)' is not recognized as an internal or external command,
operable program or batch file.
```
