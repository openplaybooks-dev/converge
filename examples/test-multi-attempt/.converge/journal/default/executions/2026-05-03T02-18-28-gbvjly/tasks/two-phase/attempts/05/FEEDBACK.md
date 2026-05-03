# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **phase-one**
- ❌ **phase-two**
- ❌ **second-attempt-gate**

## ❌ phase-one

**Command**: `test -f STEP1.txt && grep -q "phase-1-done" STEP1.txt`
**Exit code**: 1

## ❌ phase-two

**Command**: `test -f STEP2.txt && grep -q "phase-2-done" STEP2.txt`
**Exit code**: 1

## ❌ second-attempt-gate

**Command**: `find .converge/journal -path '*/attempts/01/FEEDBACK.md' 2>/dev/null | grep -q FEEDBACK`
**Exit code**: 1
