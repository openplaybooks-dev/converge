---
id: 07-troubleshooting
title: Phase 07 — Troubleshooting (index + WBS-driven per-symptom pages)
description: |
  Symptom-indexed troubleshooting. Each symptom is its own page so the
  reader can scan the index, click through, and find the exact recipe
  in <30 seconds.

  The canonical source is skills/converge-control/troubleshooting/playbook.md
  in this repo — 13 documented symptoms with root cause + fix recipes
  + verification. The WBS reads that file, identifies symptom sections,
  and spawns one page per symptom.
seed:
  mode: cli
blocking: true
dependencies: [03-ia]
inputs:
  - skills/converge-control/troubleshooting/playbook.md
  - docs/_ia.json
outputs:
  - docs/troubleshooting/index.md
  - docs/troubleshooting/**/*.md
checks:
  - id: index-exists
    cmd: "test -f docs/troubleshooting/index.md"
    description: troubleshooting index exists
  - id: symptom-pages-generated
    cmd: "test $(find docs/troubleshooting -maxdepth 1 -name '*.md' | wc -l) -ge 10"
    description: troubleshooting index plus at least 9 symptom pages exist (canonical source has 13)
  - id: every-page-has-frontmatter
    cmd: "for f in docs/troubleshooting/*.md; do head -10 \"$f\" | grep -q '^title:' || { echo \"missing title: $f\"; exit 1; }; done"
    description: every troubleshooting page has a title in frontmatter
---

# Troubleshooting

Two parts:

1. **Index** (`docs/troubleshooting/index.md`) — a scannable landing page
   that lists every symptom with a one-line description and links to the
   detail page. Authored by the fixed leaf `001-troubleshooting-index`.

2. **Per-symptom pages** — one per symptom in
   `skills/converge-control/troubleshooting/playbook.md`. Each page
   answers: symptom (exact text) → root cause → fix recipe →
   verification.

   Spawned by explicit `converge spawn template` commands, written from
   `.converge/playbooks/generate-docs/seeds/troubleshooting/templates/symptom-page/tasks/{{slug}}/TASK.md`.

## Per-page contract

Every symptom page must have:

1. **Symptom (exact)** — the exact log line, error, or shape the reader
   matches against. Use the exact text from the source playbook.
2. **Root cause** — one paragraph.
3. **Fix recipe** — concrete commands, in order. Code blocks tagged
   `bash`.
4. **Verification** — how to confirm the fix worked.
5. **Prevention** (optional) — playbook authoring change that avoids
   the symptom in the future.

## Why mirror the source playbook

The source — `skills/converge-control/troubleshooting/playbook.md` — is
already the reference for the converge-control skill's debugging logic.
Mirroring it into docs/ lets:

- Human readers find symptoms via search / sidebar.
- The cross-validate phase (`10-cross-validate`) verify that each docs
  page still matches the source.

When the source playbook gains new symptoms, re-running this docs
playbook adds the corresponding pages automatically.

Before spawning, rebuild `docs/_troubleshooting.json` by running
`node .converge/playbooks/generate-docs/scripts/scan-troubleshooting.mjs docs/_troubleshooting.json`.
Then emit one `converge spawn template` command per symptom with vars
`prefix`, `slug`, `title`, `number`, `anchor`, `sourceLine`, and `pagePath`.
