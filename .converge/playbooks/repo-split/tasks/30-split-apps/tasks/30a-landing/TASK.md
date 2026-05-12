---
description: >
  Extract landing into ../myanlabs/apps/landing.
  Astro + Tailwind + Cloudflare landing page with no converge deps.
inputs:
  - apps/landing/
outputs:
  - ../myanlabs/apps/landing/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/apps/landing
  - id: has-readme
    cmd: test -s ../myanlabs/apps/landing/README.md
  - id: has-license
    cmd: test -s ../myanlabs/apps/landing/LICENSE
  - id: has-package-json
    cmd: test -s ../myanlabs/apps/landing/package.json
  - id: no-workspace-refs
    cmd: '! grep -R "workspace:" ../myanlabs/apps/landing/package.json'
depends_on: []
---

Copy `apps/landing/` into `../myanlabs/apps/landing/`.

```bash
mkdir -p ../myanlabs/apps/landing
rsync -a --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude '.astro/' \
  --exclude '.wrangler/' \
  apps/landing/ ../myanlabs/apps/landing/
```

Add a LICENSE copied from the converge root if missing. Keep the app buildable
with its own `package.json`; it should not contain `workspace:*` dependencies.
