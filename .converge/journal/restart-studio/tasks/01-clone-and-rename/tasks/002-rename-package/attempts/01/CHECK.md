# Checks: 01-clone-and-rename/002-rename-package

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## package-name
**Description**: package.json name is @converge/studio
**Command**: `node -e "process.exit(require('./packages/studio/package.json').name==='@converge/studio'?0:1)"`

## workspace-deps
**Description**: Has @converge/core and @converge/project-root as workspace deps
**Command**: `node -e "const p=require('./packages/studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)"`