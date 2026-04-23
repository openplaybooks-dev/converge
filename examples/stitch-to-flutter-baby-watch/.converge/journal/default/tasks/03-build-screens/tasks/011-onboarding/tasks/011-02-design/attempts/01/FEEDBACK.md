# FEEDBACK.md — Check Results

**Status**: ❌ 2/4 check(s) failed

- ✅ **design-exists**
- ✅ **meta-exists**
- ❌ **uses-glossary**
- ❌ **has-data-attributes**

## ❌ uses-glossary

**Command**: `grep -q 'class="scaffold"' .stitch/designs/onboarding/design.html`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'class="scaffold"' .stitch/designs/onboarding/design.html
```

## ❌ has-data-attributes

**Command**: `grep -q 'data-color=' .stitch/designs/onboarding/design.html`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'data-color=' .stitch/designs/onboarding/design.html
```
