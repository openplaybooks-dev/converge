# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **design-md-exists**
- ❌ **design-has-content**
- ❌ **design-lists-imports**

## ❌ design-md-exists

**Command**: `test -f apps/landing/.content/sections/feature-grid/DESIGN.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections/feature-grid/DESIGN.md
```

## ❌ design-has-content

**Command**: `test -f apps/landing/.content/sections/feature-grid/DESIGN.md && test $(wc -l < apps/landing/.content/sections/feature-grid/DESIGN.md) -ge 30`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections/feature-grid/DESIGN.md && test $(wc -l < apps/landing/.content/sections/feature-grid/DESIGN.md) -ge 30
```

## ❌ design-lists-imports

**Command**: `test -f apps/landing/.content/sections/feature-grid/DESIGN.md && grep -qE 'import|components/ui|components/layout' apps/landing/.content/sections/feature-grid/DESIGN.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections/feature-grid/DESIGN.md && grep -qE 'import|components/ui|components/layout' apps/landing/.content/sections/feature-grid/DESIGN.md
```
