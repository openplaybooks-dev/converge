---
id: 005-contributing
title: Create CONTRIBUTING.md
dependencies:
  - 003-root-readme
outputs:
  - CONTRIBUTING.md
checks:
  - id: contributing-exists
    description: CONTRIBUTING.md exists
    cmd: test -f CONTRIBUTING.md
---

Create CONTRIBUTING.md for open-source contributors.

**Sections**:
1. **Welcome** — brief, friendly intro
2. **Code of Conduct** — link to CODE_OF_CONDUCT.md
3. **Development Setup** — prerequisites, clone, install, build, test
4. **Project Structure** — monorepo layout, package purposes
5. **Making Changes** — branch naming, commit messages, PR process
6. **Testing** — how to run tests, coverage expectations
7. **Documentation** — how to update docs, doc standards
8. **Release Process** — versioning, changelog, npm publish
9. **Getting Help** — where to ask questions

**Tone**: Welcoming but professional. Make it easy for first-time contributors.
