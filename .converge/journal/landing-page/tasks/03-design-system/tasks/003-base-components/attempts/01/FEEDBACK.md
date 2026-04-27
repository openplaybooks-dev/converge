# FEEDBACK.md — Check Results

**Status**: ❌ 5/5 check(s) failed

- ❌ **components-exist**
- ❌ **components-typecheck**
- ❌ **button-supports-variants**
- ❌ **codeblock-uses-shiki**
- ❌ **no-react-no-vue**

## ❌ components-exist

**Command**: `for f in Button Badge Card CodeBlock Pill Disclosure; do test -f apps/landing/src/components/ui/$f.astro || exit 1; done`
**Exit code**: 1
**Output**:
```
Command failed: for f in Button Badge Card CodeBlock Pill Disclosure; do test -f apps/landing/src/components/ui/$f.astro || exit 1; done
```

## ❌ components-typecheck

**Command**: `test -d apps/landing/src/components/ui && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*components/ui')`
**Exit code**: 1
**Output**:
```
Command failed: test -d apps/landing/src/components/ui && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*components/ui')
```

## ❌ button-supports-variants

**Command**: `test -f apps/landing/src/components/ui/Button.astro && grep -qE 'primary|secondary|ghost' apps/landing/src/components/ui/Button.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/ui/Button.astro && grep -qE 'primary|secondary|ghost' apps/landing/src/components/ui/Button.astro
```

## ❌ codeblock-uses-shiki

**Command**: `test -f apps/landing/src/components/ui/CodeBlock.astro && grep -qE 'shiki|astro-code|language-' apps/landing/src/components/ui/CodeBlock.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/ui/CodeBlock.astro && grep -qE 'shiki|astro-code|language-' apps/landing/src/components/ui/CodeBlock.astro
```

## ❌ no-react-no-vue

**Command**: `test -d apps/landing/src/components/ui && test -z "$(find apps/landing/src/components/ui -name '*.tsx' -o -name '*.jsx' -o -name '*.vue' -o -name '*.svelte' 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -d apps/landing/src/components/ui && test -z "$(find apps/landing/src/components/ui -name '*.tsx' -o -name '*.jsx' -o -name '*.vue' -o -name '*.svelte' 2>/dev/null)"
```
