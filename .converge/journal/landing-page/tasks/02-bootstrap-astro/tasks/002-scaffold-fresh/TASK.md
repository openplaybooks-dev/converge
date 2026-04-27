---
id: 002-scaffold-fresh
title: Scaffold a fresh Astro project (minimal template) into apps/landing/
dependencies: [001-wipe]
inputs:
  - apps/landing/.wiped
outputs:
  - apps/landing/src
  - apps/landing/astro.config.mjs
  - apps/landing/tsconfig.json
checks:
  - id: src-pages-exists
    cmd: "test -d apps/landing/src/pages"
    description: src/pages directory exists
  - id: index-astro-exists
    cmd: "test -f apps/landing/src/pages/index.astro"
    description: index.astro exists
  - id: astro-config-exists
    cmd: "test -f apps/landing/astro.config.mjs"
    description: astro.config.mjs exists
  - id: tsconfig-exists
    cmd: "test -f apps/landing/tsconfig.json"
    description: tsconfig.json exists
  - id: no-upstream-brand
    cmd: "test -d apps/landing/src && ! grep -rIqE 'ScrewFast|AstroWind|Foxi|AstroPaper|Astroship' apps/landing/src/"
    description: no forked-theme brand strings anywhere in src/
  - id: package-name-still-ours
    cmd: "test -f apps/landing/package.json && node -e \"process.exit(require('./apps/landing/package.json').name === '@converge/landing' ? 0 : 1)\""
    description: package.json#name is still @converge/landing (overlay didn't clobber)
---

# Scaffold fresh Astro

Run `npm create astro@latest` with the **minimal** template into a temp
directory, then move the scaffolded files into `apps/landing/` while
preserving our existing `package.json`#name.

## Process

```bash
TMP=$(mktemp -d)
cd "$TMP"

# Create a minimal Astro project. --template minimal gives us:
#   src/pages/index.astro (placeholder)
#   src/layouts/Layout.astro
#   astro.config.mjs
#   tsconfig.json
#   package.json (with astro + typescript deps)
#   public/favicon.svg
npm create astro@latest -- new-landing \
  --template minimal \
  --typescript strict \
  --no-git \
  --skip-install \
  --no-houston

# Move scaffolded files into apps/landing/, preserving our package.json
cd "$OLDPWD"
LANDING="$(pwd)/apps/landing"

# Save our existing package.json (already has @converge/landing name + workspace wiring)
cp "$LANDING/package.json" /tmp/converge-landing-package.json.preserve

# Copy scaffold artifacts in
cp -r "$TMP/new-landing/src" "$LANDING/src"
cp -r "$TMP/new-landing/public" "$LANDING/public"
cp "$TMP/new-landing/astro.config.mjs" "$LANDING/astro.config.mjs"
cp "$TMP/new-landing/tsconfig.json" "$LANDING/tsconfig.json"

# Merge dependencies from scaffold into our package.json (we keep our name + scripts)
node <<'EOF'
const fs = require('node:fs');
const ours = JSON.parse(fs.readFileSync('/tmp/converge-landing-package.json.preserve', 'utf8'));
const scaffold = JSON.parse(fs.readFileSync(process.env.SCAFFOLD_PKG, 'utf8'));
ours.dependencies = { ...(ours.dependencies ?? {}), ...(scaffold.dependencies ?? {}) };
ours.devDependencies = { ...(ours.devDependencies ?? {}), ...(scaffold.devDependencies ?? {}) };
fs.writeFileSync('apps/landing/package.json', JSON.stringify(ours, null, 2) + '\n');
EOF

# Cleanup
rm -rf "$TMP" /tmp/converge-landing-package.json.preserve
```

(In practice, set `SCAFFOLD_PKG=$TMP/new-landing/package.json` before the
node block, or inline the path.)

## Banned

- Copying the scaffold's `package.json` over ours. Our `package.json` is the source of truth for `name`, `scripts`, and any project-specific config. Only deps merge in.
- Letting the scaffolder install dependencies (`--skip-install`). The workspace runs `pnpm install` once at the workspace root in the next task.
- Templates other than `minimal`. Other templates (`blog`, `starlight`) ship demo content we'd have to delete — exactly the v1 mistake.
- Adding any non-Astro-default file in this task. Tailwind, MDX, etc. are added in 003-install-integrations. This task ONLY produces the bare Astro skeleton.
