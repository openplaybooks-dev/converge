---
id: 001-wipe
title: Wipe apps/landing/ to a clean slate (keep package.json + node_modules)
outputs:
  - apps/landing/.wiped
checks:
  - id: src-removed
    cmd: "test -d apps/landing && test ! -d apps/landing/src"
    description: apps/landing/src no longer exists (apps/landing dir intact, src wiped)
  - id: astro-config-removed
    cmd: "test -d apps/landing && test ! -f apps/landing/astro.config.mjs && test ! -f apps/landing/astro.config.ts && test ! -f apps/landing/astro.config.js"
    description: no astro.config remains (apps/landing dir intact, configs wiped)
  - id: package-json-kept
    cmd: "test -f apps/landing/package.json"
    description: package.json was preserved
  - id: package-name-correct
    cmd: "test -f apps/landing/package.json && node -e \"process.exit(require('./apps/landing/package.json').name === '@openplaybooks/landing' ? 0 : 1)\""
    description: package.json#name is still @openplaybooks/landing
  - id: wipe-marker
    cmd: "test -f apps/landing/.wiped"
    description: .wiped marker file exists (so the next task knows the wipe ran)
---

# Wipe

Delete everything under `apps/landing/` EXCEPT:

- `package.json` — already wired into the pnpm workspace; overlay deps in next task
- `node_modules/` — preserves install cache
- `LICENSE` — kept (project license)

Specifically delete:

- `apps/landing/src/` (entire tree — components, pages, layouts, data_files, etc.)
- `apps/landing/public/`
- `apps/landing/astro.config.*` (mjs, ts, js — any extension)
- `apps/landing/tsconfig.json`
- `apps/landing/.content/` (NOT to be confused with `apps/landing/.content/sections.json` from phase 01 — that lives at the repo root via `apps/landing/.content/`. **Important**: do NOT delete `.content/` if phase 01 already wrote files there. Verify by checking `test -d apps/landing/.content && ls apps/landing/.content/*.json` first; if phase-01 outputs are present, leave `.content/` alone.)
- Any leftover `LICENSE.upstream`, `NOTICE`, `VENDOR.md`, `wrangler.toml`, `pnpm-lock.yaml` (lockfile rebuilds), `process-html.mjs`, `vercel.json`, `AI_GUIDE.md`, `CODE_OF_CONDUCT.md`, `README.md` (the v1 fork's), `assets/`, `data_files/` — anything that's not in the keep list.

## Process

```bash
cd apps/landing

# Sanity: package.json must exist before we touch anything
test -f package.json || { echo "package.json missing — refusing to wipe"; exit 1; }

# Sanity: name must be ours
node -e "if(require('./package.json').name!=='@openplaybooks/landing'){process.exit(1)}" \
  || { echo "package.json#name wrong — refusing to wipe"; exit 1; }

# Save the keepers
cp package.json /tmp/converge-landing-package.json.bak

# Stash phase-01 outputs if present
HAS_CONTENT=0
if [ -d .content ] && ls .content/*.json >/dev/null 2>&1; then
  HAS_CONTENT=1
  cp -r .content /tmp/converge-landing-content.bak
fi

# Wipe everything except node_modules + .git + LICENSE
find . -maxdepth 1 -mindepth 1 \
  ! -name node_modules \
  ! -name .git \
  ! -name LICENSE \
  -exec rm -rf {} +

# Restore the keepers
cp /tmp/converge-landing-package.json.bak package.json
if [ "$HAS_CONTENT" = "1" ]; then
  cp -r /tmp/converge-landing-content.bak .content
fi

# Marker
touch .wiped
```

After running this, `ls apps/landing/` should show only:
`LICENSE`, `node_modules`, `package.json`, `.wiped`, and (if phase 01 wrote them) `.content/`.

## Banned

- Wiping `node_modules` or `package.json`. The workspace wiring depends on them. The next task overlays deps; it doesn't reinstall from scratch.
- Running `rm -rf` outside `apps/landing/`. The script must `cd apps/landing` first and verify package.json before deleting.
- Skipping the sanity checks. If `package.json` isn't ours, refuse to delete — that means we're in the wrong directory.
