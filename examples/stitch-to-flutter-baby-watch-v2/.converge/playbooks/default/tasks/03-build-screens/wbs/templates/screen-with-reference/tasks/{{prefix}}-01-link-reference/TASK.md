---
id: "{{prefix}}-01-link-reference"
title: "Link reference: {{title}}"
description: "Verify the reference HTML for {{screenId}} exists and copy it to the canonical design path."
tags:
  - link-reference
  - screen-{{screenId}}
inputs:
  - "{{htmlReference}}"
outputs:
  - "{{linkedHtmlPath}}"
checks:
  - id: source-reference-exists
    cmd: "test -f {{htmlReference}}"
    description: "Source reference HTML exists at {{htmlReference}}"
  - id: linked-html-exists
    cmd: "test -f {{linkedHtmlPath}}"
    description: "Linked HTML copy exists at {{linkedHtmlPath}}"
  - id: linked-html-is-copy
    cmd: "diff -q {{htmlReference}} {{linkedHtmlPath}}"
    description: "Linked HTML is a verbatim copy of the reference"
---

# Link reference: {{title}}

Copy the reference HTML from `{{htmlReference}}` to the canonical design location `{{linkedHtmlPath}}`. Downstream steps read from the canonical location so they don't need to know which reference each screen came from.

## Steps

1. Ensure the parent directory exists:
   ```bash
   mkdir -p .stitch/designs/{{screenId}}
   ```
2. Copy verbatim:
   ```bash
   cp {{htmlReference}} {{linkedHtmlPath}}
   ```
3. Verify with `diff -q`.

## Why not a symlink

A hard copy means downstream steps can freely modify `{{linkedHtmlPath}}` (e.g., during normalization) without mutating the source-of-truth reference. The original stays pristine under `.stitch/references/`.

## Banned

- Editing the file during the copy (formatting, stripping, rewriting). 02-normalize-to-glossary does the rewriting.
- Skipping the copy because "the reference already exists" — downstream checks expect `{{linkedHtmlPath}}`.

## Success Criteria

- `{{linkedHtmlPath}}` exists
- `diff -q {{htmlReference}} {{linkedHtmlPath}}` reports no differences
