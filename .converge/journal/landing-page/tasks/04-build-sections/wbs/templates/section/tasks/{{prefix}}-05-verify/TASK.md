---
id: "{{prefix}}-05-verify"
title: "Verify: {{title}}"
description: "Build the site and confirm the {{title}} section renders + passes section-specific assertions."
dependencies: ["{{prefix}}-04-integrate"]
tags: [verify, "section-{{sectionId}}"]
inputs:
  - apps/landing/src/pages/index.astro
  - "{{componentPath}}"
outputs:
  - "{{passedPath}}"
checks:
  - id: build-succeeds
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing build"
    description: pnpm build succeeds with this section integrated
  - id: rendered-output-exists
    cmd: "test -f apps/landing/dist/index.html"
    description: dist/index.html was emitted
  - id: section-id-rendered
    cmd: "test -f apps/landing/dist/index.html && grep -qE 'id=\"{{sectionId}}\"' apps/landing/dist/index.html"
    description: <section id={{sectionId}}> is in the rendered HTML
  - id: passed-marker
    cmd: "test -f {{passedPath}}"
    description: PASSED marker file written (signals next section can start)
---

# Verify: {{title}}

Build the site and confirm `{{sectionId}}` renders correctly. After this
step's `PASSED` marker is written, the next section's `01-spec` is
unblocked.

## Process

```bash
# 1. Build the site (server output → dist/)
pnpm --filter @converge/landing build

# 2. Confirm the section's id attribute is in the rendered HTML
grep -qE 'id="{{sectionId}}"' apps/landing/dist/index.html

# 3. Section-specific assertion (varies — see below)
# 4. Write the PASSED marker
mkdir -p {{contentDir}}
echo "PASSED at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > {{passedPath}}
```

## Section-specific assertion

Pick the assertion that matches `{{sectionId}}`:

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
- Catching only `id="{{sectionId}}"`. That confirms the section was mounted but not that its content is correct. The section-specific assertion is what makes verification real.
