# Task: 10-verify/004-no-placeholders

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