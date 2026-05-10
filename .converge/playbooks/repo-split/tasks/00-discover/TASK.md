---
description: >
  Audit all examples and apps before splitting. Verify the 10 split candidates
  and 3 apps are ready to extract. Confirm the 16 staying examples are playbook
  demos or superseded versions that belong with the framework.
inputs: []
outputs:
  - .converge/playbooks/repo-split/tasks/00-discover/tasks/00a-audit-split-candidates/audit.json
  - .converge/playbooks/repo-split/tasks/00-discover/tasks/00b-audit-stay-examples/stay-audit.json
checks:
  - id: split-audit-exists
    cmd: test -s .converge/playbooks/repo-split/tasks/00-discover/tasks/00a-audit-split-candidates/audit.json
  - id: stay-audit-exists
    cmd: test -s .converge/playbooks/repo-split/tasks/00-discover/tasks/00b-audit-stay-examples/stay-audit.json
children:
  - 00a-audit-split-candidates
  - 00b-audit-stay-examples
---

Audit all examples and apps before any changes are made.

Children produce two audit files:
- `audit.json` — each of the 13 split candidates (10 examples + 3 apps) with path, type, hasReadme, hasLicense, hasGitignore, size
- `stay-audit.json` — each of the 16 staying examples with path and reason

Convergence: read both audit files and confirm counts match (13 split candidates, 16 staying). If any candidate is missing critical files (README, etc.), that becomes a gap the child task for that repo must fill.
