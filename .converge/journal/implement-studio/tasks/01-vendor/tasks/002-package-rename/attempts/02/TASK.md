# Task: 01-vendor/002-package-rename

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