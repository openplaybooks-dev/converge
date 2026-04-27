---
id: 006-05-verify
title: "Verify: From zero to converged in 60s"
description: Build the site and confirm the From zero to converged in 60s section renders + passes section-specific assertions.
dependencies:
  - 006-04-integrate
tags:
  - verify
  - section-quickstart
inputs:
  - apps/landing/src/pages/index.astro
  - apps/landing/src/components/sections/Quickstart.astro
outputs:
  - apps/landing/.content/sections/quickstart/PASSED
checks:
  - id: build-succeeds
    description: pnpm build succeeds with this section integrated
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing build"
  - id: rendered-output-exists
    description: dist/index.html was emitted
    cmd: test -f apps/landing/dist/client/index.html
  - id: section-id-rendered
    description: "<section id=quickstart> is in the rendered HTML"
    cmd: "test -f apps/landing/dist/client/index.html && grep -qE 'id=\"quickstart\"' apps/landing/dist/client/index.html"
  - id: passed-marker
    description: PASSED marker file written (signals next section can start)
    cmd: test -f apps/landing/.content/sections/quickstart/PASSED
vars:
  prefix: 006
  sectionId: quickstart
  title: From zero to converged in 60s
  componentName: Quickstart
  componentPath: apps/landing/src/components/sections/Quickstart.astro
  contentDir: apps/landing/.content/sections/quickstart
  intent: "Three-step terminal walkthrough mirroring README.md's quickstart block. Each step is a copy-button code block."
  specPath: apps/landing/.content/sections/quickstart/SPEC.md
  designPath: apps/landing/.content/sections/quickstart/DESIGN.md
  passedPath: apps/landing/.content/sections/quickstart/PASSED
  sectionTaskId: 006-quickstart
  prevLastId: 005-05-verify
  kebabName: quickstart
---

# Verify: From zero to converged in 60s

Build the site and confirm `quickstart` renders correctly. After this
step's `PASSED` marker is written, the next section's `01-spec` is
unblocked.

## Process

```bash
# 1. Build the site (server output → dist/)
pnpm --filter @converge/landing build

# 2. Confirm the section's id attribute is in the rendered HTML
grep -qE 'id="quickstart"' apps/landing/dist/index.html

# 3. Section-specific assertion (varies — see below)
# 4. Write the PASSED marker
mkdir -p apps/landing/.content/sections/quickstart
echo "PASSED at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > apps/landing/.content/sections/quickstart/PASSED
```

## Section-specific assertion

Pick the assertion that matches `quickstart`:

| Section ID | Assertion |
|---|---|
| hero            | `grep -q 'Define done. Converge gets there.' apps/landing/dist/index.html` |
| social-proof    | `grep -qE '(stars\|builders\|projects)' apps/landing/dist/index.html` |
| problem-solution | `grep -qiE '(define how\|define done\|step-driven\|graph)' apps/landing/dist/index.html` |
| feature-grid    | `grep -cE '<(article\|li\|div)[^>]+class="[^"]*card' apps/landing/dist/index.html \| awk '{exit ($1>=6?0:1)}'` (≥6 cards) |
| comparison      | `grep -qE '(LangGraph\|step-driven)' apps/landing/dist/index.html` |
| quickstart      | `grep -qE 'npm install -g @converge/core\|converge run' apps/landing/dist/index.html` |
| faq             | `grep -cE '<details\\b' apps/landing/dist/index.html \| awk '{exit ($1>=8?0:1)}'` (≥8 disclosures) |
| cta-banner      | `grep -cE 'Define done\\. Converge gets there\\.' apps/landing/dist/index.html \| awk '{exit ($1>=2?0:1)}'` (tagline appears at least twice on the page — hero + cta) |

The check `section-id-rendered` is the universal one (always required).
The section-specific assertion is what makes the section's content
actually verified, not just present.

## Banned

- Skipping the build step. Just having the source file isn't enough; the rendered HTML must contain the right marks.
- Writing `PASSED` before the build succeeds. The marker is the gate; if it's there, the WBS believes the section is done and unblocks the next.
- Catching only `id="quickstart"`. That confirms the section was mounted but not that its content is correct. The section-specific assertion is what makes verification real.
