---
id: 004-no-placeholders
title: Zero Lorem / placeholder / TBD / FIXME / TODO strings in dist/
dependencies: [001-build-clean]
checks:
  - id: no-placeholders
    cmd: "node .converge/playbooks/landing-page/scripts/check-no-placeholders.mjs"
    description: zero placeholder strings in built site
---

# No placeholders

Catches the failure mode where a section component shipped but its
copy file was a stub. The phase 04 verify steps catch this per-section,
but this is the final gate covering the whole built site.

```bash
node .converge/playbooks/landing-page/scripts/check-no-placeholders.mjs
```

Exit 0 = clean. Exit 1 = at least one placeholder found.

If something is flagged but is intentional (e.g. a legitimate "TODO"
in code documentation that surfaces in a doc page), update the script's
exclusion list rather than silencing the check.
