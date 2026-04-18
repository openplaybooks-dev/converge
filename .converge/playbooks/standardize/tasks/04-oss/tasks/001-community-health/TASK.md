---
id: 001-community-health
title: Create community health files
outputs:
  - CODE_OF_CONDUCT.md
  - .github/ISSUE_TEMPLATE/bug_report.md
  - .github/ISSUE_TEMPLATE/feature_request.md
  - .github/PULL_REQUEST_TEMPLATE.md
checks:
  - id: coc-exists
    description: Code of Conduct exists
    cmd: test -f CODE_OF_CONDUCT.md
  - id: issue-templates-exist
    description: Issue templates directory exists
    cmd: test -d .github/ISSUE_TEMPLATE
  - id: pr-template-exists
    description: PR template exists
    cmd: test -f .github/PULL_REQUEST_TEMPLATE.md
---

Create GitHub community health files.

**CODE_OF_CONDUCT.md**:
- Use Contributor Covenant v2.1 (standard)
- Update contact email/method for enforcement

**Issue templates** (`.github/ISSUE_TEMPLATE/`):

`bug_report.md`:
- Title, description, steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, converge version)
- Playbook snippet (if applicable)

`feature_request.md`:
- Problem statement
- Proposed solution
- Alternatives considered
- Use case / motivation

**PR template** (`.github/PULL_REQUEST_TEMPLATE.md`):
- Summary of changes
- Related issue(s)
- Type: bug fix / feature / docs / refactor
- Testing done
- Checklist: tests pass, docs updated, no breaking changes
