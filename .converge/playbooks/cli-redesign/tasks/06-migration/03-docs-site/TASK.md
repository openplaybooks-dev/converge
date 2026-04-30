---
id: 03-docs-site
title: CLI reference docs site (new pages, retire old)
description: |
  Add new docs pages (build, test, compile, list, clean, debug, deps,
  retry, source, select). Update index.md to reflect the v2 grouping.
  Update the design doc's status banner from "proposal" to "shipped".

dependencies:
  - 02-deps-and-init-from-prompt

inputs:
  - "docs/design/cli-redesign.md"
  - "docs/reference/cli/index.md"
  - "docs/reference/cli/run.md"

outputs:
  - "docs/reference/cli/index.md"
  - "docs/reference/cli/build.md"
  - "docs/reference/cli/test.md"
  - "docs/reference/cli/compile.md"
  - "docs/reference/cli/list.md"
  - "docs/reference/cli/clean.md"
  - "docs/reference/cli/debug.md"
  - "docs/reference/cli/deps.md"
  - "docs/reference/cli/retry.md"
  - "docs/reference/cli/source.md"
  - "docs/reference/cli/select.md"
  - "docs/design/cli-redesign.md"

checks:
  - id: pages-exist
    cmd: |
      for f in docs/reference/cli/{index,run,build,test,compile,list,clean,debug,deps,retry,source,select,inspect,show,metrics}.md; do
        test -s "$f" || { echo "missing: $f"; exit 1; }
      done
    description: Every referenced page exists and is non-empty.
  - id: status-banner-updated
    cmd: grep -E 'Status:\s+\*\*shipped|Status:\s+\*\*shipping' docs/design/cli-redesign.md
    description: Design doc status banner updated.

tags:
  - migration
  - docs
---

# Docs site

Two TDD subtasks. Reference docs don't TDD cleanly, so the "test" is a
file-existence + link-resolution check; "implement" is writing the
prose.

References:
- Existing per-page template: `docs/reference/cli/run.md`.
- Spec doc to mirror: §3 (verbs), §4 (DSL — becomes select.md), §7 (staleness).
