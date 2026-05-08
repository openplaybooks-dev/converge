---
title: Clean Build Artifacts and Large Files
dependencies:
  - purge
inputs:
  - .converge/security-cleanup/audit.json
outputs:
  - .converge/security-cleanup/clean-log.json
checks:
  - id: clean-log-exists
    cmd: test -f .converge/security-cleanup/clean-log.json
    description: Clean log file exists
  - id: no-build-artifacts-tracked
    cmd: "test -z \"$(git ls-files | grep -E '^\\.next/|^\\.wrangler/|^\\.astro/')\""
    description: No build artifacts tracked by git
  - id: no-large-brand-pngs
    cmd: "test -z \"$(git ls-files | grep 'assets/brand/explorations/')\""
    description: No brand exploration PNGs tracked by git
  - id: gitignore-updated
    cmd: "grep -q '\\.local-backup' .gitignore && grep -q '\\.wrangler/' .gitignore && grep -q '\\.next/' .gitignore"
    description: .gitignore covers build artifacts and local backup patterns
---

Remove generated artifacts from git tracking and harden `.gitignore`.
Run `scripts/clean.js`:

```bash
node .converge/playbooks/security-cleanup/tasks/04-clean/scripts/clean.cjs
```

Operations:
1. `git rm --cached -r` for build caches: `.next/`, `.wrangler/`, `.astro/`
2. Remove generated doc HTML: `.converge/playbooks/*/target/docs/`
3. Remove brand exploration PNGs (>1MB each, design artifacts)
4. Remove `apps/planner/.next/` build cache
5. Add missing patterns to `.gitignore`:
   - `*.local-backup` — local backup env files
   - `*.local` — local config files
   - `.wrangler/` — Cloudflare Wrangler state
   - `.next/` — Next.js build output
   - `.astro/` — Astro build cache
   - `**/target/docs/` — generated playbook documentation
   - `assets/brand/explorations/` — design explorations (use Git LFS if needed)

The `clean-log.json` records every file removed.
