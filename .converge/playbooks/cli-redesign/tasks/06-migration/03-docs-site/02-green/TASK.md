---
id: 02-green
title: Green — write the new docs pages and update index
description: |
  Hand-write each new reference page. Update docs/reference/cli/index.md
  to the new command grouping. Flip the design doc status banner. Make
  01-red green.

dependencies:
  - 01-red

inputs:
  - "docs/design/cli-redesign.md"
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
  - id: existence-test-passes
    cmd: cd packages/cli && pnpm test -- tests/integration/docs-pages-exist.test.ts
    description: Existence test passes (GREEN).

tags:
  - tdd
  - green
---

# Green — write the docs

Each page mirrors the structure of `docs/reference/cli/run.md`:
frontmatter (title, description, sidebar.order), one-paragraph intro,
Usage block, Options table, Examples block, "When to use" section.

`select.md` is special — it documents the DSL, mirroring §4 of the
design doc. Treat the design doc as the source-of-truth and abridge.

`index.md` — the table of commands by intent, but rebuilt around the v2
verb set.

Update the design doc: change the Status banner from "Proposal — not
yet implemented" to "Status: shipped" with a date. Don't rewrite the
proposal body — let the proposal stand as the design record.

Refactor while green (i.e., copy-edit prose while the existence check
keeps passing).
