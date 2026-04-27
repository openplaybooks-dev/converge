---
id: 002-package-rename
title: Rename package to @converge/studio with workspace deps
dependencies:
  - 001-clone-prune
outputs:
  - packages/converge-studio/package.json
  - packages/converge-studio/tsconfig.json
checks:
  - id: package-name
    description: package.json name is @converge/studio
    cmd: "node -e \"process.exit(require('./packages/converge-studio/package.json').name === '@converge/studio' ? 0 : 1)\""
  - id: workspace-deps
    description: Depends on @converge/core and @converge/project-root via workspace protocol
    cmd: "node -e \"const p=require('./packages/converge-studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)\""
  - id: type-module
    description: package.json has type=module
    cmd: "node -e \"process.exit(require('./packages/converge-studio/package.json').type === 'module' ? 0 : 1)\""
  - id: scripts-present
    description: dev, build, start, typecheck scripts defined
    cmd: "node -e \"const s=require('./packages/converge-studio/package.json').scripts;process.exit(['dev','build','start','typecheck'].every(k=>s[k])?0:1)\""
  - id: install-resolves
    description: pnpm install resolves the new workspace
    cmd: "pnpm install --silent >/dev/null 2>&1 && test -L node_modules/@converge/studio || test -d node_modules/@converge/studio"
---

Rewrite `packages/converge-studio/package.json` so the package is part of the converge workspace.

**Required fields**:

```jsonc
{
  "name": "@converge/studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Web UI for managing converge playbooks, tasks, and runs",
  "scripts": {
    "dev": "next dev -p ${PORT:-4000}",
    "build": "next build",
    "start": "next start -p ${PORT:-4000}",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "@converge/core": "workspace:*",
    "@converge/project-root": "workspace:*",
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "chokidar": "^4.0.0",
    "gray-matter": "^4.0.3",
    "yaml": "^2.7.0",
    "zod": "^3.24.1",
    "@monaco-editor/react": "^4.6.0",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

**Merge upstream deps**: keep upstream's UI/component dependencies (Radix/shadcn/etc). **Remove** any deps tied to pruned code: `@prisma/client`, `prisma`, `next-auth`, framework SDKs (`@openclaw/*`, `crewai`, `langgraph`, `autogen`).

Adjust `tsconfig.json` if needed (extends a workspace base, paths for `@converge/*`).

After writing the file, run `pnpm install` from the repo root.

**Verify**: all four manifest checks pass.
