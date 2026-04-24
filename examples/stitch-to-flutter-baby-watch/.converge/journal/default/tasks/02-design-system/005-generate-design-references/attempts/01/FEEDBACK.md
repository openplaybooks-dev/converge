# FEEDBACK.md — Check Results

**Status**: ❌ 5/5 check(s) failed

- ❌ **meta-md-exists**
- ❌ **single-screen-exists**
- ❌ **multi-state-exists**
- ❌ **celebration-exists**
- ❌ **html-has-tokens**

## ❌ meta-md-exists

**Command**: `test -f .stitch/system/META.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/system/META.md
```

## ❌ single-screen-exists

**Command**: `test -f .stitch/system/single-screen.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/system/single-screen.html
```

## ❌ multi-state-exists

**Command**: `test -f .stitch/system/multi-state-screen.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/system/multi-state-screen.html
```

## ❌ celebration-exists

**Command**: `test -f .stitch/system/celebration-screen.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/system/celebration-screen.html
```

## ❌ html-has-tokens

**Command**: `grep -q ':root' .stitch/system/single-screen.html`
**Exit code**: 2
**Output**:
```
grep: .stitch/system/single-screen.html: No such file or directory
```
