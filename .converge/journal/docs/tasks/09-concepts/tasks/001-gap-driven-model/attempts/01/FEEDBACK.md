# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **page-exists**
- ❌ **defines-gap**
- ❌ **contrasts-with-step-driven**
- ❌ **word-count**

## ❌ page-exists

**Command**: `test -f docs/concepts/gap-driven-model.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/concepts/gap-driven-model.md
```

## ❌ defines-gap

**Command**: `grep -qiE 'gap' docs/concepts/gap-driven-model.md`
**Exit code**: 2
**Output**:
```
grep: docs/concepts/gap-driven-model.md: No such file or directory
```

## ❌ contrasts-with-step-driven

**Command**: `grep -qiE 'step|graph|node' docs/concepts/gap-driven-model.md`
**Exit code**: 2
**Output**:
```
grep: docs/concepts/gap-driven-model.md: No such file or directory
```

## ❌ word-count

**Command**: `test -f docs/concepts/gap-driven-model.md && wc -w docs/concepts/gap-driven-model.md | awk '{exit ($1>=600&&$1<=1200?0:1)}'`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/concepts/gap-driven-model.md && wc -w docs/concepts/gap-driven-model.md | awk '{exit ($1>=600&&$1<=1200?0:1)}'
```
