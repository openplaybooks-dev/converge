# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **design-exists**
- ❌ **meta-exists**
- ❌ **uses-glossary**
- ❌ **has-data-attributes**

## ❌ design-exists

**Command**: `test -f .stitch/designs/weight-nutrition/design.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/designs/weight-nutrition/design.html
```

## ❌ meta-exists

**Command**: `test -f .stitch/designs/weight-nutrition/META.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/designs/weight-nutrition/META.md
```

## ❌ uses-glossary

**Command**: `grep -q 'class="scaffold"' .stitch/designs/weight-nutrition/design.html`
**Exit code**: 2
**Output**:
```
grep: .stitch/designs/weight-nutrition/design.html: No such file or directory
```

## ❌ has-data-attributes

**Command**: `grep -q 'data-color=' .stitch/designs/weight-nutrition/design.html`
**Exit code**: 2
**Output**:
```
grep: .stitch/designs/weight-nutrition/design.html: No such file or directory
```
