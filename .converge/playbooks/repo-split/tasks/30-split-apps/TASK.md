---
description: >
  Create individual GitHub repos for 3 apps.
  landing and playbooks-to are clean Astro splits.
  planner needs workspace:* deps replaced with git references.
inputs:
  - apps/landing/
  - apps/playbooks-to/
  - apps/planner/
outputs:
  - github.com/minhlucvan/converge-landing
  - github.com/minhlucvan/playbooks-to
  - github.com/minhlucvan/converge-planner
checks:
  - id: all-3-repos-exist
    cmd: |
      for repo in converge-landing playbooks-to converge-planner; do
        gh repo view "minhlucvan/$repo" --json name >/dev/null 2>&1 || exit 1
      done
children:
  - 30a-landing
  - 30b-playbooks-to
  - 30c-planner
depends_on:
  - 10-strip-core
---

Create 3 GitHub repos for the deployable apps.

- `30a-landing`: Pure Astro app, no converge deps — clean split
- `30b-playbooks-to`: Pure Astro app with database, no converge deps — clean split
- `30c-planner`: Next.js app with `@converge/core` and `@converge/project-root` deps — replace `workspace:*` with `github:minhlucvan/converge`

Convergence: after all children complete, verify every repo exists and each app builds independently.
