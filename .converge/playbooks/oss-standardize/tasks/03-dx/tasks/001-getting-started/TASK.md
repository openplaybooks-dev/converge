---
title: Create Getting Started Guide
outputs:
  - docs/getting-started.md
checks:
  - id: guide-exists
    cmd: test -f docs/getting-started.md
    description: Getting started guide exists
  - id: guide-has-sections
    cmd: "grep -c '^##' docs/getting-started.md | xargs test 3 -le"
    description: Guide has at least 3 sections
---

Create a comprehensive getting-started guide for new Converge users.

**Target audience**: Developer who has never used Converge, wants to
create and run their first playbook in under 10 minutes.

**Structure**:

1. **Prerequisites** — Node.js 18+, npm/pnpm, basic terminal knowledge
2. **Installation** — `npm install -g @converge/core` (or local install)
3. **Your First Playbook** — step-by-step:
   - Create `.converge/playbooks/hello/playbook.yml`
   - Create a simple task with checks
   - Run `converge run --playbook=hello`
   - Observe the convergence loop
4. **Understanding the Output** — what the logs mean, how to read task status
5. **Adding a Second Task** — dependencies, sequential execution
6. **Adding a Goal** — define "done" with a GOAL.md
7. **Adding Checks** — deterministic verification
8. **Next Steps** — links to examples, core README, WBS guide

**Reference**: Read existing examples in `packages/core/examples/` for
accurate CLI commands and file formats.

**Voice**: Tutorial style — "you will" not "one should". Direct, practical.
