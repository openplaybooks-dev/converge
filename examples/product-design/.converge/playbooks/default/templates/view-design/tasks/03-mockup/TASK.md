---
id: 03-mockup
title: State-Stacked Mockup — {{viewTitle}}
description: Create visual design mockup showing all state variants for view {{viewId}}
blocking: true
depends_on:
  - 02-meta
inputs:
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md
  - .design/system/DESIGN.md
  - .design/system/tokens.css
  - .design/system/component-archetypes.html
  - .design/system/page-patterns.html
outputs:
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html
checks:
  - id: mockup-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html
    description: Mockup HTML file exists
  - id: mockup-uses-tokens
    cmd: python3 -c "
import re
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html').read()
vars_found = re.findall(r'var\(--\w[\w-]*\)', content)
assert len(vars_found) >= 5, f'Expected ≥5 token references, found {len(vars_found)}'
print(f'Found {len(vars_found)} token references')
"
    description: Mockup uses design system tokens (≥5 references)
  - id: mockup-valid-html
    cmd: grep -q '<!DOCTYPE html>' .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html
    description: Valid HTML5 structure
  - id: mockup-all-states
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html').read()
for state in ['state--default', 'state--empty', 'state--loading', 'state--error']:
    assert state in content, f'Missing state variant: {state}'
print('All 4 state variants present')
"
    description: All 4 state variants (default, empty, loading, error) present
  - id: mockup-no-generic-content
    cmd: '! grep -qiE "lorem ipsum|john doe|jane doe|via\.placeholder\.com" .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html'
    description: No generic placeholder content or placeholder images
  - id: mockup-no-emoji
    cmd: '! grep -qP "[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}]" .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html'
    description: No emoji in mockup
  - id: mockup-imports-shared-css
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html').read()
for css_file in ['base.css', 'components.css', 'tokens.css']:
    assert css_file in content, f'mockup.html does not import {css_file}'
print('Mockup imports all shared CSS files')
"
    description: Mockup imports base.css, components.css, and tokens.css
skills:
  - html-mockup
---

# State-Stacked Visual Mockup

Create a standalone HTML mockup that visualizes ALL state variants for {{viewTitle}} in a single file. This is a QA tool — stakeholders open it in a browser to see every possible state the screen can be in.

## Rules

1. **ALL state variants stacked** in one file, separated by visible section headings
2. **Tokens via `var(--...)`** — never paste raw hex into element styles
3. **Density attribute on body** — `data-density="comfortable"` (or compact/spacious)
4. **Domain-specific content** — realistic data, no Lorem Ipsum, no placeholder images
5. **Phosphor icons as inline SVG** — no emoji substitutes
6. **Motion as HTML comments** — the HTML is static, note animations as comments
7. **Reference system demos** — use `.design/system/component-archetypes.html` and `.design/system/page-patterns.html` as visual baselines

## File Shape

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{viewTitle}} — {{epicId}}/{{featureId}}/{{viewId}} — mockup</title>
  <link rel="stylesheet" href="../../system/tokens.css">
  <link rel="stylesheet" href="../../system/base.css">
  <link rel="stylesheet" href="../../system/components.css">
  <style>
    /* Screen-specific overrides — all tokens from tokens.css */
    :root { /* screen-specific token overrides if needed */ }
    body { background: var(--color-bg-paper); color: var(--color-fg-ink); }
  </style>
</head>
<body data-density="comfortable">

  <!-- ═══ DEFAULT STATE ═══ -->
  <section class="state state--default">
    <h2>Default — Populated</h2>
    <!-- Screen UI with realistic domain data -->
  </section>

  <!-- ═══ EMPTY STATE ═══ -->
  <section class="state state--empty">
    <h2>Empty — No Data</h2>
    <!-- EmptyState with icon, heading, body, CTA -->
  </section>

  <!-- ═══ LOADING STATE ═══ -->
  <section class="state state--loading">
    <h2>Loading</h2>
    <!-- Skeleton rows matching the default layout -->
    <!-- Shimmer is the ONLY ease animation -->
  </section>

  <!-- ═══ ERROR STATE ═══ -->
  <section class="state state--error">
    <h2>Error</h2>
    <!-- ErrorBoundary fallback with retry action -->
  </section>

</body>
</html>
```

## State Variant Guidelines

### Default State
- Full populated layout with realistic data
- All interactive elements visible and functional-looking
- Proper information hierarchy

### Empty State
- No generic "Nothing here" messages
- Domain-specific heading and body copy
- Clear call-to-action that explains what to do next
- Icon (inline SVG) that relates to the content type

### Loading State
- Skeleton rows/blocks that match the default layout structure
- Shimmer animation is the ONLY ease transition allowed
- No spinners — ever

### Error State
- Quiet "Something went wrong" message
- Retry action
- No screaming red banners — errors should be informative, not alarming
- ErrorBoundary pattern from DESIGN.md

## Anti-Patterns

- No `<img src="via.placeholder.com">` — use real content shapes
- No Tailwind utility classes — pure CSS with tokens
- No `cdn.tailwindcss.com` script — self-contained CSS only
- No purple, no gradient backgrounds, no glow, no AI-sparkle iconography
- No `class="text-blue-500"` — use semantic class names
- No inline `style=""` attributes — everything in CSS
- No banking-domain leftovers (BCTC, Vinamilk, etc.) — use the product's domain

## Output

Write `.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html` — a single file that can be opened in any browser to preview all state variants.
