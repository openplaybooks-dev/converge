# Checks: 01-vendor/002-package-rename

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## package-name
**Description**: package.json name is @converge/studio
**Command**: `node -e "process.exit(require('./packages/converge-studio/package.json').name === '@converge/studio' ? 0 : 1)"`

## workspace-deps
**Description**: Depends on @converge/core and @converge/project-root via workspace protocol
**Command**: `node -e "const p=require('./packages/converge-studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)"`

## type-module
**Description**: package.json has type=module
**Command**: `node -e "process.exit(require('./packages/converge-studio/package.json').type === 'module' ? 0 : 1)"`

## scripts-present
**Description**: dev, build, start, typecheck scripts defined
**Command**: `node -e "const s=require('./packages/converge-studio/package.json').scripts;process.exit(['dev','build','start','typecheck'].every(k=>s[k])?0:1)"`

## install-resolves
**Description**: pnpm install resolves the new workspace
**Command**: `pnpm install 2>&1 | tail -5`