---
id: 05-design-system
title: Design System
description: Generate complete design system with tokens, component archetypes, and HTML demos
blocking: true
depends_on:
  - 03-epics
inputs:
  - docs/product/PRODUCT_BRIEF.md
  - docs/product/research/user-personas.md
  - docs/product/epics.json
outputs:
  - .design/system/DESIGN.md
  - .design/system/tokens.css
  - .design/system/tokens.json
  - .design/system/base.css
  - .design/system/components.css
  - .design/system/component-archetypes.html
  - .design/system/page-patterns.html
  - .design/system/token-reference.html
checks:
  - id: design-doc-exists
    cmd: test -f .design/system/DESIGN.md
    description: Design system spec exists
  - id: design-has-required-sections
    cmd: python3 -c "
content = open('.design/system/DESIGN.md').read()
for section in ['## Color Palette', '## Typography', '## Spacing', '## Components', '## Layout Patterns', '## Accessibility']:
    assert section in content, f'Missing section: {section}'
"
    description: Design doc has all required sections
  - id: tokens-css-exists
    cmd: test -f .design/system/tokens.css
    description: CSS tokens file exists
  - id: min-css-vars
    cmd: python3 -c "
import re
content = open('.design/system/tokens.css').read()
vars_found = re.findall(r'--\w[\w-]*:', content)
assert len(vars_found) >= 20, f'Expected ≥20 CSS vars, found {len(vars_found)}'
print(f'Found {len(vars_found)} CSS variables')
"
    description: At least 20 CSS variables defined
  - id: tokens-json-valid
    cmd: test -f .design/system/tokens.json && python3 -c "import json; json.load(open('.design/system/tokens.json'))"
    description: tokens.json is valid JSON
  - id: html-demos-exist
    cmd: test -f .design/system/component-archetypes.html && test -f .design/system/page-patterns.html && test -f .design/system/token-reference.html
    description: All three HTML demo files exist
  - id: base-css-exists
    cmd: test -f .design/system/base.css
    description: Shared base.css foundation exists
  - id: components-css-exists
    cmd: test -f .design/system/components.css
    description: Shared components.css exists
  - id: design-taste-passes
    cmd: python3 -c "
content = open('.design/system/DESIGN.md').read()
assert 'anti-pattern' in content.lower() or 'banned' in content.lower() or 'avoid' in content.lower(), 'Missing anti-patterns section'
assert 'density' in content.lower() or 'responsive' in content.lower(), 'Missing responsive/density guidance'
"
    description: Design system includes taste guidelines
skills:
  - design-system-tokens
  - design-taste
---

# Design System

Generate the complete design system that will be referenced by all view designs. Use `design-system-tokens` for token architecture and `design-taste` for quality standards.

## Inputs

Read `docs/product/PRODUCT_BRIEF.md` for product context, `user-personas.md` for audience understanding, and `epics.json` for capability scope.

## Tasks

1. **Define color palette** with 50-900 scale:
   - Primary, secondary, neutral colors
   - Semantic colors (success, warning, error, info)
   - Dark mode variants
   - All combinations must meet WCAG 2.1 AA contrast ratios

2. **Define typography** with responsive scale:
   - Font family stack (heading + body + mono)
   - Heading hierarchy (h1-h6) with size, weight, line-height
   - Body text styles (body, caption, code)
   - Responsive sizing per breakpoint

3. **Define spacing system** on 8px grid:
   - xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px), 3xl (64px)

4. **Define component archetypes**:
   - Button (variants, sizes, states)
   - Input (text, select, checkbox, radio, textarea)
   - Card, Modal, Navigation, Badge, Avatar, Tooltip, Alert, Dropdown
   - For each: anatomy, variants, states, usage guidelines

5. **Define layout patterns**:
   - Page-level layouts (single column, sidebar, dashboard, split)
   - Grid systems and responsive breakpoints
   - Density modes (compact, comfortable, spacious)

6. **Write DESIGN.md** — industry-standard format with all sections above
7. **Write tokens.css** — CSS custom properties for all design values
8. **Write tokens.json** — structured token data for programmatic access
9. **Write base.css** — shared foundation: reset, typography scale, spacing utilities, layout utilities, focus/a11y styles, density modes
10. **Write components.css** — reusable component patterns: card, button, form, nav, modal, badge, avatar, alert, table, list, empty-state, skeleton, toast, tab-bar, dropdown
11. **Write component-archetypes.html** — visual component library demo
12. **Write page-patterns.html** — layout pattern demos
13. **Write token-reference.html** — interactive token explorer

## Design Taste Rules (from design-taste skill)

- **No emoji** — use proper icon SVGs
- **No purple** — no gradient text, no gradient backgrounds
- **No default system fonts** — specify a deliberate font stack
- **No spinners** — use skeleton loaders
- **No ease-out animations** — use spring physics
- **Grid over flex** for proportional layouts
- **Mono font for all numbers, IDs, paths**
- **Color is never the only signal** — pair with text or icon

## Output

Complete design system in `.design/system/` that all view designs will reference. Three HTML demos that serve as visual baselines for screen-level designs.
