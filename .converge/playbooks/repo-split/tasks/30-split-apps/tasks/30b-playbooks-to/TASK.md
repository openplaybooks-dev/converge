---
description: >
  Extract playbooks-to into ../myanlabs/apps/playbooks-to.
  Astro + Tailwind + Cloudflare playbooks directory site.
inputs:
  - apps/playbooks-to/
outputs:
  - ../myanlabs/apps/playbooks-to/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/apps/playbooks-to
  - id: has-readme
    cmd: test -s ../myanlabs/apps/playbooks-to/README.md
  - id: has-license
    cmd: test -s ../myanlabs/apps/playbooks-to/LICENSE
  - id: has-package-json
    cmd: test -s ../myanlabs/apps/playbooks-to/package.json
  - id: no-workspace-refs
    cmd: '! grep -R "workspace:" ../myanlabs/apps/playbooks-to/package.json'
depends_on: []
---

Copy `apps/playbooks-to/` into `../myanlabs/apps/playbooks-to/`.

```bash
mkdir -p ../myanlabs/apps/playbooks-to
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude '.astro/' \
  --exclude '.wrangler/' \
  apps/playbooks-to/ ../myanlabs/apps/playbooks-to/
```

Preserve `db/`, source content, and app config. Add a LICENSE copied from the
converge root if missing. It should not contain `workspace:*` dependencies.
