# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **supporting-libs-present**

## ❌ supporting-libs-present

**Command**: `for f in use-converge-events use-view-mode watcher-singleton schedule-parser run-supervisor ring-buffer session-correlator; do test -f packages/studio/src/lib/$f.ts || exit 1; done`
**Exit code**: 1
**Output**:
```
Command failed: for f in use-converge-events use-view-mode watcher-singleton schedule-parser run-supervisor ring-buffer session-correlator; do test -f packages/studio/src/lib/$f.ts || exit 1; done
```
