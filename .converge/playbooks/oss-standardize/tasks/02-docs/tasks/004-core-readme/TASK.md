---
id: 004-core-readme
title: Finalize packages/core/README.md
dependencies:
  - 003-root-readme
outputs:
  - packages/core/README.md
checks:
  - id: core-readme-exists
    description: Core README exists
    cmd: test -f packages/core/README.md
  - id: core-readme-has-api
    description: Core README has API or usage documentation
    cmd: "grep -q 'API\\|Configuration\\|Usage\\|Install' packages/core/README.md"
---

Finalize the packages/core/README.md as a focused package-level README.

**Context**: The full documentation now lives at the root README.md.
packages/core/README.md should be a concise package README for npm.

**Ensure it contains**:
1. Package name and one-line description
2. Installation instructions (`npm install @openplaybooks/converge-core`)
3. Quick usage example (minimal playbook)
4. Link to root README for full documentation
5. Link to API reference / core concepts
6. License

**Also ensure**:
- Banner SVG reference points to `./banner.svg` (copied in task 002)
- No broken relative links
- No content duplicated from root README — cross-reference instead

**Do NOT** make this a duplicate of the root README. Keep it short and npm-focused.
