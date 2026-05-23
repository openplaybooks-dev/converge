---
id: 04-wire
title: Production HTML/CSS — {{viewTitle}}
description: Generate production-ready HTML and CSS for view {{viewId}}
blocking: true
depends_on:
  - 03-mockup
inputs:
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/SPEC.md
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/META.md
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/mockup.html
  - .design/system/tokens.css
  - .design/system/DESIGN.md
outputs:
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html
  - .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.css
checks:
  - id: design-html-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html
    description: Production HTML exists
  - id: design-css-exists
    cmd: test -f .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.css
    description: Production CSS exists
  - id: css-uses-tokens
    cmd: python3 -c "
import re
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.css').read()
vars_found = re.findall(r'var\(--\w[\w-]*\)', content)
assert len(vars_found) >= 5, f'Expected ≥5 token references, found {len(vars_found)}'
print(f'Found {len(vars_found)} token references')
"
    description: CSS uses design system tokens (≥5 references)
  - id: html-valid-structure
    cmd: grep -q '<!DOCTYPE html>' .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html
    description: Valid HTML5 structure
  - id: html-semantic
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html').read()
for tag in ['<header', '<main', '<footer']:
    assert tag in content, f'Missing semantic element: {tag}'
print('All semantic elements present')
"
    description: HTML uses semantic elements (header, main, footer)
  - id: css-organized
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.css').read()
assert '/*' in content, 'CSS should have section comments'
assert '@media' in content, 'CSS should have responsive breakpoints'
print('CSS is organized with comments and breakpoints')
"
    description: CSS has comments and responsive breakpoints
  - id: no-generic-content
    cmd: '! grep -qiE "lorem ipsum|john doe|jane doe|via\.placeholder\.com" .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html'
    description: No generic placeholder content
  - id: no-emoji
    cmd: '! grep -qP "[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}]" .design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html'
    description: No emoji in design
  - id: imports-shared-css
    cmd: python3 -c "
content = open('.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html').read()
for css_file in ['base.css', 'components.css', 'tokens.css']:
    assert css_file in content, f'design.html does not import {css_file}'
print('design.html imports all shared CSS files')
"
    description: design.html imports base.css, components.css, and tokens.css
skills:
  - html-mockup
---

# Production-Ready HTML/CSS

Convert the state-stacked mockup into production-ready HTML and CSS files that developers can use as implementation reference. This is the final, polished deliverable for {{viewTitle}}.

## Rules

1. **Separate HTML and CSS** — `design.html` references `design.css` (no inline styles)
2. **Tokens via `var(--...)`** — all colors, spacing, typography from design system
3. **Semantic HTML5** — proper use of `header`, `main`, `nav`, `section`, `article`, `aside`, `footer`
4. **BEM naming** — consistent class naming methodology
5. **Responsive** — mobile-first media queries at 640px, 1024px breakpoints
6. **Accessible** — ARIA labels, roles, focus states, color contrast
7. **Domain-specific content** — realistic data, no Lorem Ipsum, no placeholder images
8. **Comments** — section organization, purpose documentation
9. **State variants** — show the DEFAULT state only (other states are in mockup.html)

## design.html Requirements

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{viewTitle}} — {{epicId}}/{{featureId}}/{{viewId}}</title>
  <link rel="stylesheet" href="../../system/tokens.css">
  <link rel="stylesheet" href="../../system/base.css">
  <link rel="stylesheet" href="../../system/components.css">
  <link rel="stylesheet" href="design.css">
  <meta name="description" content="[View description for SEO/accessibility]">
</head>
<body data-density="comfortable">
  <header class="header">
    <nav class="nav" aria-label="Main navigation">
      <!-- Navigation -->
    </nav>
  </header>

  <main class="main" role="main">
    <!-- Primary content with realistic domain data -->
  </main>

  <aside class="sidebar" aria-label="Secondary content">
    <!-- Secondary content -->
  </aside>

  <footer class="footer">
    <!-- Footer -->
  </footer>
</body>
</html>
```

## design.css Requirements

**View-specific layout only.** Do NOT redefine buttons, cards, forms, modals, badges, avatars, alerts, tables, lists, or any other component — those come from `.design/system/components.css`. Do NOT redefine reset, typography scale, spacing utilities, or density modes — those come from `.design/system/base.css`.

```css
/* === View: {{viewTitle}} === */
/* === Epic: {{epicId}} / Feature: {{featureId}} / View: {{viewId}} === */

/* === Page Layout === */
/* Grid/flexbox layout for THIS view's structure using tokens */
/* Example: .find-mentors-page { display: grid; grid-template-columns: 280px 1fr; } */

/* === Component Arrangement === */
/* How components from components.css are positioned on THIS view */
/* Example: .mentor-cards__grid { @apply card-grid pattern from page-patterns.html } */

/* === States === */
/* Hover, focus, active, disabled styles for view-specific elements */

/* === Responsive === */
/* @media (max-width: 640px) and (max-width: 1024px) breakpoints */

/* === Animations === */
/* Spring-based transitions only, no ease-out */
```

## Anti-Patterns

- No inline `style=""` attributes
- No raw hex values (use `var(--...)` tokens)
- No `class="text-blue-500"` utility classes
- No Tailwind CDN script
- No emoji
- No placeholder images
- No banking-domain leftovers

## Output

Two files:
- `.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.html` — Production-ready HTML
- `.design/screens/{{epicId}}/{{featureId}}/{{viewId}}/design.css` — Production-ready CSS

These files should be directly usable by developers as reference for implementation.
