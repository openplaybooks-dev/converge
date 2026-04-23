---
title: Document Scaffold Workflow
outputs:
  - docs/scaffolding.md
checks:
  - id: scaffold-doc-exists
    cmd: test -f docs/scaffolding.md
    description: Scaffolding documentation exists
dependencies:
  - 003-cli-help
---

Document the playbook scaffolding workflow for new users.

**Context**: Users need a clear guide for creating new playbooks from
scratch or from templates. This may involve a CLI command (`converge init`)
or manual file creation.

**Process**:
1. Check if `converge init` or similar scaffold command exists in the CLI
2. If it exists: document its usage, options, and output
3. If it doesn't exist: document the manual scaffolding process

**Document structure** (`docs/scaffolding.md`):
1. **Quick scaffold** — fastest way to create a new playbook
2. **Playbook anatomy** — what each file does (playbook.yml, TASK.md, wbs.js, GOAL.md)
3. **Templates** — common playbook patterns:
   - Simple sequential (like hello-world)
   - Keyed/parameterized (like fix-issue)
   - WBS-driven (like continuous-app)
   - Planning pipeline (like plan)
4. **Customization** — how to add checks, goals, skills, inputs
5. **Validation** — how to verify a playbook is well-formed before running

**Reference**: Use `packages/core/examples/` as the source of truth for
file formats and patterns.
