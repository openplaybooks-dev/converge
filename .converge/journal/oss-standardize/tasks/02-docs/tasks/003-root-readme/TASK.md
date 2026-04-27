---
id: 003-root-readme
title: Enhance root README.md
dependencies:
  - 002-generate-banner
outputs:
  - README.md
checks:
  - id: readme-exists
    description: README.md exists
    cmd: test -f README.md
  - id: readme-has-quickstart
    description: README has quick start section
    cmd: "grep -q 'Quick Start\\|Getting Started\\|quickstart' README.md"
  - id: readme-has-badges
    description: README has badges
    cmd: "grep -q '\\[!\\[' README.md || grep -q 'badge' README.md"
  - id: readme-has-banner-ref
    description: README references banner.svg
    cmd: "grep -q 'banner.svg' README.md"
---

Enhance the root README.md (moved from packages/core in task 001) for public release.

**The README already has good content** from the move. This task adds/verifies:

**Reference**: Read `docs/converge-gtm.md` for positioning, messaging, and comparison data.

**Verify/add these sections**:
1. **Banner** — `![Converge](./banner.svg)` (generated in task 002)
2. **Tagline** — "Define done. Converge gets there."
3. **Badges** — npm version, license, build status, test coverage
4. **One-paragraph description** — gap-driven convergence framework for AI agent orchestration
5. **Why Converge** — 3-4 bullet points from GTM positioning
6. **Quick Start** — install, create playbook, run (< 5 minutes)
7. **How It Works** — brief explanation of the convergence loop
8. **Comparison Table** — vs LangChain, CrewAI, AutoGen, Mastra (from GTM doc)
9. **Packages** — monorepo package list with descriptions
10. **Documentation Links** — link to core package, contributing, examples
11. **License** — Apache 2.0

**Fix any relative paths** that broke during the move from packages/core/.

**Voice**: Professional, concise, technically precise. No hype words.
Draw messaging from `docs/converge-gtm.md` sections 1 (Product Positioning)
and 11 (Differentiation Messaging).
