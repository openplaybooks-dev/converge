---
name: html-mockup
description: Methodology for creating production-ready HTML/CSS from design specifications with state-stacked variants
---

# HTML Mockup Skill

## When to Use This Skill

Use this skill when creating visual mockups (state-stacked) or production-ready HTML/CSS from view specifications.

## Two Output Modes

### Mode 1: State-Stacked Mockup (mockup.html)

A single self-contained HTML file showing ALL state variants for QA review:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>[View Title] — mockup</title>
  <link rel="stylesheet" href="../../system/tokens.css">
  <link rel="stylesheet" href="../../system/base.css">
  <link rel="stylesheet" href="../../system/components.css">
  <style>
    :root {
      /* Mirror .design/system/tokens.css — keep in sync */
      --color-bg-paper: #...;
      --color-fg-ink: #...;
      --color-primary-500: #...;
    }
    body {
      background: var(--color-bg-paper);
      color: var(--color-fg-ink);
      font-family: var(--font-body, -apple-system, sans-serif);
      margin: 0;
      padding: var(--space-lg, 24px);
    }
  </style>
</head>
<body data-density="comfortable">

  <!-- ═══ DEFAULT STATE ═══ -->
  <section class="state state--default">
    <h2>Default — Populated</h2>
    <!-- Full screen UI with realistic domain data -->
  </section>

  <!-- ═══ EMPTY STATE ═══ -->
  <section class="state state--empty">
    <h2>Empty — No Data</h2>
    <!-- EmptyState with domain-specific icon, heading, body, CTA -->
  </section>

  <!-- ═══ LOADING STATE ═══ -->
  <section class="state state--loading">
    <h2>Loading</h2>
    <!-- Skeleton rows matching default layout structure -->
  </section>

  <!-- ═══ ERROR STATE ═══ -->
  <section class="state state--error">
    <h2>Error</h2>
    <!-- ErrorBoundary fallback with retry action -->
  </section>

</body>
</html>
```

### Mode 2: Production HTML/CSS (design.html + design.css)

Separate files with only the DEFAULT state, ready for developer handoff.

**design.html**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[View Title] — [Product Name]</title>
  <link rel="stylesheet" href="../../system/tokens.css">
  <link rel="stylesheet" href="../../system/base.css">
  <link rel="stylesheet" href="../../system/components.css">
  <link rel="stylesheet" href="design.css">
  <meta name="description" content="[View description]">
</head>
<body data-density="comfortable">
  <!-- Semantic HTML structure -->
</body>
</html>
```

**design.css**:
```css
/* === View: [View Title] === */
/* === Epic: [epic-id] / Feature: [feature-id] / View: [view-id] === */

/* === Layout === */
/* === Components === */
/* === States === */
/* === Responsive === */
/* === Animations === */
```

## Hard Rules

1. **Tokens via `var(--...)`** — never paste raw hex into element styles
2. **Density attribute on body** — set `data-density="comfortable"` (or compact/spacious)
3. **Phosphor icons as inline SVG** — no emoji substitutes
4. **Motion as HTML comments** — the HTML is static, note animations as comments
5. **Semantic HTML5** — `header`, `main`, `nav`, `section`, `article`, `aside`, `footer`
6. **BEM or similar naming** — consistent class methodology
7. **No inline `style=""`** — everything in CSS
8. **No placeholder images** — use real content shapes
9. **No Lorem Ipsum** — domain-specific realistic content
10. **No Tailwind CDN** — self-contained CSS only

## State Variant Guidelines

### Default State
- Full populated layout with realistic domain data
- All interactive elements visible and functional-looking
- Proper information hierarchy per SPEC.md

### Empty State
- Domain-specific heading and body copy (no "Nothing here")
- Clear CTA explaining what to do next
- Icon (inline SVG) that relates to content type

### Loading State
- Skeleton rows/blocks matching the default layout structure
- Shimmer animation is the ONLY ease transition allowed
- No spinners — ever

### Error State
- Quiet "Something went wrong" message (not a screaming red banner)
- Retry action available
- ErrorBoundary pattern from DESIGN.md

## Reference Documents

Before writing HTML, read:
1. **SPEC.md** — what the screen should look like and do
2. **META.md** — why these design decisions were made
3. **views.json** — sections, tabs, modals for this view
4. **.design/system/DESIGN.md** — design system rules and component archetypes
5. **.design/system/tokens.css** — CSS custom properties to reference
6. **.design/system/base.css** — reset, typography, spacing, layout utilities (ALREADY IMPORTED — do NOT redefine)
7. **.design/system/components.css** — card, button, form, nav, modal, badge, etc. (ALREADY IMPORTED — do NOT redefine)
8. **.design/system/component-archetypes.html** — how primitives render
9. **.design/system/page-patterns.html** — layout patterns to follow

## Anti-Patterns

- No `<img src="via.placeholder.com">`
- No `class="text-blue-500"` Tailwind utilities
- No `cdn.tailwindcss.com` script
- No purple, no gradient backgrounds, no glow, no AI-sparkle iconography
- No banking-domain leftovers
- No generic names (John Doe, Jane Smith)
- No round numbers (100, 1000, 10000)
- No redefining components that exist in `components.css` (buttons, cards, forms, modals, badges, avatars, alerts, tables, lists, empty-state, skeleton, toast, tab-bar, dropdown)
- No redefining base styles that exist in `base.css` (reset, typography scale, spacing utilities, density modes)