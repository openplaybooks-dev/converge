# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **package-name**
- ❌ **workspace-deps**
- ❌ **type-module**
- ✅ **scripts-present**
- ❌ **install-resolves**

## ❌ package-name

**Command**: `node -e "process.exit(require('./packages/converge-studio/package.json').name === '@converge/studio' ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
Command failed: node -e "process.exit(require('./packages/converge-studio/package.json').name === '@converge/studio' ? 0 : 1)"
```

## ❌ workspace-deps

**Command**: `node -e "const p=require('./packages/converge-studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: node -e "const p=require('./packages/converge-studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)"
```

## ❌ type-module

**Command**: `node -e "process.exit(require('./packages/converge-studio/package.json').type === 'module' ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
Command failed: node -e "process.exit(require('./packages/converge-studio/package.json').type === 'module' ? 0 : 1)"
```

## ❌ install-resolves

**Command**: `pnpm install --frozen-lockfile=false 2>&1 | tail -3 | grep -qE 'Done|+|installed' || pnpm install 2>&1 | tail -3`
**Exit code**: 124
**Output**:
```
grep: repetition-operator operand invalid
```
