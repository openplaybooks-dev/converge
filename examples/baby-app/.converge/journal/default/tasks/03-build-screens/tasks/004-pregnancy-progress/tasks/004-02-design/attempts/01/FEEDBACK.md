# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **design-exists**
- ❌ **meta-exists**
- ❌ **uses-glossary**
- ❌ **has-data-attributes**

## ❌ design-exists

**Command**: `test -f .stitch/designs/pregnancy-progress/design.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/designs/pregnancy-progress/design.html
```

## ❌ meta-exists

**Command**: `test -f .stitch/designs/pregnancy-progress/META.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/designs/pregnancy-progress/META.md
```

## ❌ uses-glossary

**Command**: `grep -q 'class="scaffold"' .stitch/designs/pregnancy-progress/design.html`
**Exit code**: 2
**Output**:
```
grep: .stitch/designs/pregnancy-progress/design.html: No such file or directory
```

## ❌ has-data-attributes

**Command**: `grep -q 'data-color=' .stitch/designs/pregnancy-progress/design.html`
**Exit code**: 2
**Output**:
```
grep: .stitch/designs/pregnancy-progress/design.html: No such file or directory
```
