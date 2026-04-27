---
id: 003-05-verify
title: "Verify: Define how vs. define done"
description: Build the site and confirm the Define how vs. define done section renders + passes section-specific assertions.
dependencies:
  - 003-04-integrate
tags:
  - verify
  - section-problem-solution
inputs:
  - apps/landing/src/pages/index.astro
  - apps/landing/src/components/sections/ProblemSolution.astro
outputs:
  - apps/landing/.content/sections/problem-solution/PASSED
checks:
  - id: build-succeeds
    description: pnpm build succeeds with this section integrated
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing build"
  - id: rendered-output-exists
    description: dist/index.html was emitted
    cmd: test -f apps/landing/dist/index.html
  - id: section-id-rendered
    description: "<section id=problem-solution> is in the rendered HTML"
    cmd: "test -f apps/landing/dist/index.html && grep -qE 'id=\"problem-solution\"' apps/landing/dist/index.html"
  - id: passed-marker
    description: PASSED marker file written (signals next section can start)
    cmd: test -f apps/landing/.content/sections/problem-solution/PASSED
vars:
  prefix: 003
  sectionId: problem-solution
  title: Define how vs. define done
  componentName: ProblemSolution
  componentPath: apps/landing/src/components/sections/ProblemSolution.astro
  contentDir: apps/landing/.content/sections/problem-solution
  intent: "Side-by-side: left shows imperative step-driven framework code; right shows declarative converge TASK.md. Visualizes the paradigm flip."
  specPath: apps/landing/.content/sections/problem-solution/SPEC.md
  designPath: apps/landing/.content/sections/problem-solution/DESIGN.md
  passedPath: apps/landing/.content/sections/problem-solution/PASSED
  sectionTaskId: 003-problem-solution
  prevLastId: 002-05-verify
  kebabName: problem-solution
---

# Verify: Define how vs. define done

Build the site and confirm `problem-solution` renders correctly. After this
step's `PASSED` marker is written, the next section's `01-spec` is
unblocked.

## Process

```bash
# 1. Build the site (server output → dist/)
pnpm --filter @converge/landing build

# 2. Confirm the section's id attribute is in the rendered HTML
grep -qE 'id="problem-solution"' apps/landing/dist/index.html

# 3. Section-specific assertion (varies — see below)
# 4. Write the PASSED marker
mkdir -p apps/landing/.content/sections/problem-solution
echo "PASSED at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > apps/landing/.content/sections/problem-solution/PASSED
```

## Section-specific assertion

Pick the assertion that matches `problem-solution`:

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
- Catching only `id="problem-solution"`. That confirms the section was mounted but not that its content is correct. The section-specific assertion is what makes verification real.
