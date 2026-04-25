---
id: 007-02-normalize-to-glossary
title: "Normalize to glossary: Co-guardians"
description: Rewrite the reference HTML for co-guardians-list into the Flutter HTML Glossary vocabulary. Constrained transformation — no creative changes.
dependencies:
  - 007-01-link-reference
tags:
  - normalize
  - glossary
  - screen-co-guardians-list
inputs:
  - .stitch/designs/co-guardians-list/code.html
  - .stitch/system/DESIGN.md
  - .stitch/system/tokens.json
outputs:
  - .stitch/designs/co-guardians-list/design.html
  - .stitch/designs/co-guardians-list/META.md
checks:
  - id: design-exists
    description: design.html exists
    cmd: test -f .stitch/designs/co-guardians-list/design.html
  - id: meta-exists
    description: META.md exists
    cmd: test -f .stitch/designs/co-guardians-list/META.md
  - id: design-uses-glossary
    description: design.html uses Flutter HTML Glossary vocabulary
    cmd: "grep -q 'class=\"scaffold\"' .stitch/designs/co-guardians-list/design.html"
  - id: design-has-data-attrs
    description: "design.html uses data-* attributes for Flutter conversion"
    cmd: "grep -q 'data-color=' .stitch/designs/co-guardians-list/design.html"
  - id: meta-names-source
    description: META.md names the normalization source
    cmd: "grep -qE 'Normalized from: `?\\.stitch/designs/co-guardians-list/code\\.html`?' .stitch/designs/co-guardians-list/META.md"
vars:
  skill: stitch-flutter
  references: ["flutter-building-layouts"]
  prefix: 007
  screenId: co-guardians-list
  title: Co-guardians
  widgetName: CoGuardiansList
  snakeName: co_guardians_list
  route: /devices/co-guardians
  screenPath: lib/screens/co_guardians_list/co_guardians_list_screen.dart
  widgetsJsonPath: .stitch/designs/co-guardians-list/widgets.jsonl
  localWidgetsDir: lib/screens/co_guardians_list/widgets
  screenTaskId: 007-co-guardians-list
  specPath: .stitch/designs/co-guardians-list/SPEC.md
  metaPath: .stitch/designs/co-guardians-list/META.md
  designPath: .stitch/designs/co-guardians-list/design.html
  linkedHtmlPath: .stitch/designs/co-guardians-list/code.html
  statesPath: lib/screens/co_guardians_list/co_guardians_list_states.dart
  htmlReference: .stitch/references/ch_p_nh_n_l_i_m_i/code.html
  htmlReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/code.html\"\n"
  screenshotReference: .stitch/references/ch_p_nh_n_l_i_m_i/screen.png
  screenshotReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/screen.png\"\n"
  prevScreenLastId: 006-07-states
  variant: 
  variantGroup: 
---

# Normalize to glossary: Co-guardians

Rewrite the reference HTML at `.stitch/designs/co-guardians-list/code.html` into the constrained Flutter HTML Glossary vocabulary at `.stitch/designs/co-guardians-list/design.html`. This is a **mechanical transformation**, not creative generation.

## Inputs

- `.stitch/designs/co-guardians-list/code.html` — the reference HTML (Tailwind + raw HTML, pixel-truth)
- `.stitch/system/DESIGN.md` — for design token names
- `.stitch/system/tokens.json` — for mapping hex color values to semantic token names

## Why normalize

The reference `code.html` was drawn with full Tailwind freedom. The Flutter glossary is a constrained subset where every element maps 1:1 to a Flutter widget. Normalization = rewrite tags/classes/attributes into glossary form while preserving:

- Section order
- Hierarchy (parent/child relationships)
- Visible text (copy, labels, icon names)
- Interactive elements (buttons, inputs, nav items)
- State variants implied by the markup

## Transformation rules

### Structure

| Source markup                                    | Glossary rewrite                         |
|--------------------------------------------------|-------------------------------------------|
| `<body>` / top-level container                   | `<div class="scaffold">`                 |
| `<header class="fixed top-0 …">`                 | `<div class="app-bar">`                  |
| `<main>` / main content                          | `<div class="body">`                     |
| `<nav class="fixed bottom-0 …">`                 | `<div class="bottom-nav">`               |
| Floating `<button>` with positioning             | `<div class="fab">`                      |
| Vertical flex (`flex-col`)                       | `<div class="column">`                   |
| Horizontal flex (`flex` w/ no `-col`)            | `<div class="row">`                      |
| Positioned stack / overlap                        | `<div class="stack">`                    |
| Card-like rounded container                      | `<div class="card">`                     |
| List row                                          | `<div class="list-tile">`                |
| Pill / chip                                       | `<span class="chip">`                    |
| Badge                                             | `<span class="badge">`                   |
| Avatar image                                      | `<img class="avatar">`                   |
| `<img src="http…">`                               | `<img class="network-image">`            |
| Inline icon (Material Symbol, SVG icon, emoji)   | `<svg class="icon" data-name="{name}" data-size="24">` |
| `<button>`                                        | `<button class="filled-btn">` or `elevated-btn` / `text-btn` / `icon-btn` — pick by visual prominence |

### Text

Every text node must sit inside one of these classes (Material 3 TextTheme roles):
- `.display-large`, `.display-medium`, `.display-small`
- `.headline-large`, `.headline-medium`, `.headline-small`
- `.title-large`, `.title-medium`, `.title-small`
- `.body-large`, `.body-medium`, `.body-small`
- `.label-large`, `.label-medium`, `.label-small`

Pick by visual weight: editorial headlines → `.headline-large` or `.title-large`; body copy → `.body-medium`; button/chip labels → `.label-small`. Match the source's font-size hierarchy, not exact px values.

### Colors

Every color-bearing element must use `data-color` / `data-bg` attributes, not literal hex. Map reference hex values to tokens.json keys:

```
style="color:#31332e"       → data-color="onSurface"
style="background:#fbf9f5"  → data-bg="surface"
class="text-primary"        → data-color="primary"
class="bg-mint"             → data-bg="mint"       (semantic extension color)
```

If a hex value doesn't map to any token, use the closest token and note it in META.md's `## Token deviations` section.

### Spacing

Replace Tailwind spacing classes with `data-p`, `data-m`, `data-gap`:

```
class="px-6 py-4"   → data-p="lg|md"    (horizontal px-6 ≈ lg=32? adjust to nearest token)
class="mt-8"        → data-mt="md"
class="gap-4"       → data-gap="sm"
```

Round to the nearest token from `tokens.json > spacing`. Consistent rounding across the file.

### Routes & markers

For every tappable element (buttons, inkwells, list rows that navigate, nav items):

- Wrap in `<div class="ink-well" data-route="/target" data-handler="...">` OR add `data-handler="..."` to an existing `.filled-btn` / `.icon-btn`.
- Pick a `data-handler` value per the element's purpose: `"navigate:beacon-detail"`, `"action:toggle-mute"`, `"form:submit"`, etc. Stable slugs — they become `@converge:element` marker IDs in 03-convert.

### Animations

Preserve any animations hinted by the reference (pulsing markers, fade-ins) as `data-animate="..."` / `data-animate-delay="..."`:
- `animate-pulse` → `data-animate="pulse"`
- CSS fade-in/slide → `data-animate="fade-in"` / `data-animate-delay="100"` (ms)

### Accessibility

Preserve `aria-label`, `aria-hidden`, `role` attributes. Add `aria-label` to icon-only buttons using the icon's semantic name.

### Font & style setup

Strip the source's Tailwind `<script>` and custom `<style>`. They're redundant — the glossary converter knows how to render tokens. Keep only:
- Google Fonts `<link>` tags for fonts listed in `tokens.json > typography.googleFonts`
- A single `<style>` tag setting `body { font-family: <body font>; background: var(--surface); }`

## META.md

Emit `.stitch/designs/co-guardians-list/META.md`:

```markdown
# Normalization: Co-guardians

Normalized from: `.stitch/designs/co-guardians-list/code.html`
Source reference: `.stitch/references/ch_p_nh_n_l_i_m_i/code.html`
Glossary: `stitch-flutter/references/flutter-html-glossary.md`

## Section mapping
| Source | Glossary |
|--------|----------|
| `<header class="fixed top-0 ...">` | `<div class="app-bar">` |
| ... | ... |

## Token deviations
(none, or list hex values that had no direct token and the closest token chosen)

## Handlers assigned
| data-handler | Source element |
|--------------|----------------|
| `navigate:beacon-detail` | beacon-row li |
| `action:toggle-mute` | mute pill button |
| ... |
```

## Banned

- Changing section order.
- Inventing new content not in the reference.
- Removing interactive elements.
- Emitting glossary classes that don't exist in the glossary file.
- Leaving Tailwind utility classes in `.stitch/designs/co-guardians-list/design.html` — everything must be glossary classes + `data-*`.

## Success Criteria

- `.stitch/designs/co-guardians-list/design.html` exists, uses `class="scaffold"` wrapper
- Uses `data-color="..."` attributes (not hex)
- `.stitch/designs/co-guardians-list/META.md` exists, cites the source
- Every tappable element has a `data-handler="..."`
