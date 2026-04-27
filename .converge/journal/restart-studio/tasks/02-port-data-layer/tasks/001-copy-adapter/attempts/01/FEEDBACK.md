# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **adapter-files-present**

## ❌ adapter-files-present

**Command**: `for f in paths playbooks tasks sessions watcher frontmatter schedule index; do test -f packages/studio/src/lib/converge-adapter/$f.ts || exit 1; done`
**Exit code**: 1
**Output**:
```
Command failed: for f in paths playbooks tasks sessions watcher frontmatter schedule index; do test -f packages/studio/src/lib/converge-adapter/$f.ts || exit 1; done
```
