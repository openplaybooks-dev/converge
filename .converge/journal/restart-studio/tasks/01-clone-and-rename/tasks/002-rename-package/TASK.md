---
id: 002-rename-package
title: Rename package to @converge/studio with workspace deps
dependencies:
  - 001-clone-mc
outputs:
  - packages/studio/package.json
checks:
  - id: package-name
    description: package.json name is @converge/studio
    cmd: "node -e \"process.exit(require('./packages/studio/package.json').name==='@converge/studio'?0:1)\""
  - id: workspace-deps
    description: Has @converge/core and @converge/project-root as workspace deps
    cmd: "node -e \"const p=require('./packages/studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)\""
---

Edit `packages/studio/package.json`:
- `name` → `"@converge/studio"`
- `version` → `"0.1.0"`
- `private` → `true`
- `type` → `"module"`
- Ensure scripts: `dev`, `build`, `start`, `typecheck`
- Add to `dependencies`:
  - `"@converge/core": "workspace:*"`
  - `"@converge/project-root": "workspace:*"`
  - `"chokidar": "^4.0.0"`
  - `"gray-matter": "^4.0.3"`
  - `"yaml": "^2.7.0"`
  - `"uuid": "^11.0.3"`
  - `"@monaco-editor/react": "^4.6.0"`

Keep upstream's existing deps (next, react, etc.).
