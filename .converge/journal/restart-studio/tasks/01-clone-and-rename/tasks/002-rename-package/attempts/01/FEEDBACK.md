# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **package-name**
- ❌ **workspace-deps**

## ❌ package-name

**Command**: `node -e "process.exit(require('./packages/studio/package.json').name==='@converge/studio'?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: node -e "process.exit(require('./packages/studio/package.json').name==='@converge/studio'?0:1)"
```

## ❌ workspace-deps

**Command**: `node -e "const p=require('./packages/studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: node -e "const p=require('./packages/studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)"
```
