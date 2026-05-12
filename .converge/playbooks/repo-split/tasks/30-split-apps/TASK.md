---
description: >
  Copy 3 apps into the local ../myanlabs repo.
  landing and playbooks-to are clean Astro splits.
  planner needs workspace:* deps replaced with a standalone dependency spec.
inputs:
  - apps/landing/
  - apps/playbooks-to/
  - apps/planner/
outputs:
  - ../myanlabs/apps/landing/
  - ../myanlabs/apps/playbooks-to/
  - ../myanlabs/apps/planner/
checks:
  - id: all-3-apps-exist
    cmd: |
      for app in landing playbooks-to planner; do
        test -d "../myanlabs/apps/$app" || exit 1
      done
children:
  - 30a-landing
  - 30b-playbooks-to
  - 30c-planner
depends_on:
  - 05-prepare-target
---

Copy 3 deployable apps into `../myanlabs/apps/`.

- `30a-landing`: Pure Astro app, no converge deps — clean split
- `30b-playbooks-to`: Pure Astro app with database, no converge deps — clean split
- `30c-planner`: Next.js app with `@converge/core` and `@converge/project-root` deps — replace `workspace:*` with a standalone dependency spec and document it in README

Use `rsync -a --delete` and exclude nested `.git`, dependency caches, build
outputs, `.next`, `.astro`, `.wrangler`, and Converge runtime state.

Convergence: after all children complete, verify every app exists under
`../myanlabs/apps/` and each app builds independently where its dependencies
allow it.
