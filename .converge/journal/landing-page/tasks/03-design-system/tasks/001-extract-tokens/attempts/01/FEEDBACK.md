# FEEDBACK.md — Check Results

**Status**: ❌ 5/5 check(s) failed

- ❌ **tokens-json-exists**
- ❌ **tokens-css-exists**
- ❌ **palette-keys**
- ❌ **tokens-css-has-variables**
- ❌ **globals-imports-tokens**

## ❌ tokens-json-exists

**Command**: `test -f apps/landing/src/styles/tokens.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/src/styles/tokens.json','utf8'))"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/tokens.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/src/styles/tokens.json','utf8'))"
```

## ❌ tokens-css-exists

**Command**: `test -f apps/landing/src/styles/tokens.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/tokens.css
```

## ❌ palette-keys

**Command**: `test -f apps/landing/src/styles/tokens.json && node -e "const t=require('./apps/landing/src/styles/tokens.json');const ok=t.color&&['bg','indigo','text','accent'].every(k=>t.color[k]);process.exit(ok?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/tokens.json && node -e "const t=require('./apps/landing/src/styles/tokens.json');const ok=t.color&&['bg','indigo','text','accent'].every(k=>t.color[k]);process.exit(ok?0:1)"
```

## ❌ tokens-css-has-variables

**Command**: `test -f apps/landing/src/styles/tokens.css && grep -qE -- '--color-(bg|indigo|text)' apps/landing/src/styles/tokens.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/tokens.css && grep -qE -- '--color-(bg|indigo|text)' apps/landing/src/styles/tokens.css
```

## ❌ globals-imports-tokens

**Command**: `test -f apps/landing/src/styles/globals.css && grep -qE "@import.*tokens\.css|@import.*['\"]\./tokens" apps/landing/src/styles/globals.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/globals.css && grep -qE "@import.*tokens\.css|@import.*['\"]\./tokens" apps/landing/src/styles/globals.css
```
