# docs

Authoritative documentation generator for the Converge framework.

## What this owns

The `docs/` directory at the repo root, in its entirety. Every published
doc page comes from this playbook. Existing internal/marketing markdown
(brand-messaging, gtm, social-kit, comparisons) is archived to
`docs/_internal/` on first run.

## Pipeline

```
01-archive-existing  →  02-source-scan  →  03-ia  →
{04-getting-started, 05-examples, 06-guides, 07-troubleshooting,
 08-reference, 09-concepts}  →
10-cross-validate  →  11-index-and-redirects
```

## How accuracy is maintained

Every doc page declares its `sources:` (files in `packages/`, `examples/`,
`skills/converge-control/troubleshooting/playbook.md`, `README.md`,
`CHANGELOG.md`) in frontmatter. Phase `10-cross-validate` re-reads each
source on every run and fails the page if its claims drifted from the
code. This is the contract: **claims about behaviour must trace to a
source file the validator can re-read.**

## Single source of truth

`docs/_ia.json` is the IA manifest — group order, page order, sidebar labels.
The landing-page playbook reads this file directly to render `/docs`
sidebar; we never duplicate IA data.

## Run

```bash
converge run --playbook docs
```

Re-running is safe: pages are overwritten with fresh content, sources are
re-validated, the IA is rebuilt. Designed for this — every framework change
should trigger a docs re-run.
