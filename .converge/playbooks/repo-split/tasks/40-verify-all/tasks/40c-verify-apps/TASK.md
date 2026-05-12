---
description: >
  Verify all 3 apps exist under ../myanlabs/apps and are standalone.
  planner must have no workspace:* refs.
inputs:
  - ../myanlabs/apps/
outputs:
  - (none - verification only)
checks:
  - id: all-app-dirs-exist
    cmd: |
      for app in landing playbooks-to planner; do
        test -d "../myanlabs/apps/$app" || exit 1
      done
  - id: apps-have-package-json
    cmd: |
      for app in landing playbooks-to planner; do
        test -s "../myanlabs/apps/$app/package.json" || exit 1
      done
  - id: apps-have-licenses
    cmd: |
      for app in landing playbooks-to planner; do
        test -s "../myanlabs/apps/$app/LICENSE" || exit 1
      done
  - id: no-workspace-refs
    cmd: '! grep -R "workspace:" ../myanlabs/apps/*/package.json'
  - id: no-nested-git
    cmd: '! find ../myanlabs/apps -mindepth 2 -name .git -type d | grep .'
depends_on: []
---

Verify every extracted app under `../myanlabs/apps/`.

Required:
- Directory exists.
- `package.json` and `LICENSE` exist.
- No `workspace:*` dependency specs remain.
- No nested `.git` directories were copied.
- Generated app caches/builds such as `node_modules/`, `.next/`, `.astro/`,
  `.wrangler/`, and `dist/` are absent.

Do not modify source from this verification task. Report gaps to the specific
split child task.
