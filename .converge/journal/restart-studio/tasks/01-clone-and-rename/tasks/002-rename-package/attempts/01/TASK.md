# Task: 01-clone-and-rename/002-rename-package

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