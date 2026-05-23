---
name: design-system-tokens
description: Methodology for creating industry-standard design tokens, CSS variables, and system documentation
---

# Design System Tokens Skill

## When to Use This Skill

Use this skill when creating or updating the design system foundation for a product.

## Token Architecture

### Level 1: Primitive Tokens
Raw design values — the source of truth:
```css
--color-blue-50: #E3F2FD;
--color-blue-500: #3B82F6;
--color-blue-900: #0D47A1;
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
--shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
```

### Level 2: Semantic Tokens
Named by use case, reference primitives:
```css
--color-bg-primary: var(--color-neutral-50);
--color-bg-surface: var(--color-neutral-0);
--color-text-primary: var(--color-neutral-900);
--color-text-secondary: var(--color-neutral-600);
--color-border-default: var(--color-neutral-200);
--color-brand-primary: var(--color-blue-500);
--color-action-primary: var(--color-blue-600);
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
```

### Level 3: Component Tokens
Component-specific, reference semantic tokens:
```css
--button-bg: var(--color-action-primary);
--button-text: var(--color-neutral-0);
--button-radius: var(--radius-md);
--input-border: var(--color-border-default);
--input-focus-ring: var(--color-brand-primary);
```

## Typography Scale

```css
--text-display: 48px;   /* Hero text */
--text-h1: 40px;        /* Page titles */
--text-h2: 32px;        /* Section titles */
--text-h3: 24px;        /* Sub-sections */
--text-h4: 20px;        /* Card titles */
--text-h5: 16px;        /* Group titles */
--text-h6: 14px;        /* Small headers */
--text-body: 16px;      /* Default text */
--text-body-sm: 14px;   /* Secondary text */
--text-caption: 12px;   /* Labels, hints */
--text-code: 14px;      /* Inline code */
```

## Color Palette Rules

- **Primary**: Brand color (500 scale) — used for CTAs, links, active states
- **Secondary**: Accent color — used sparingly for emphasis
- **Neutral**: Grays (50-900) — backgrounds, borders, text
- **Semantic**: Success (green), Warning (amber), Error (red), Info (blue)
- **All combinations** must meet WCAG 2.1 AA contrast (4.5:1 normal text, 3:00 large text)
- **Dark mode**: Every light color has a dark counterpart

## Output Format

### DESIGN.md Structure
```markdown
# Design System — [Product Name]

## Brand
- Primary color, Secondary color, Logo guidelines, Brand voice

## Color Palette
### Primary (50-900 scale)
| Token | Value | Usage |
|-------|-------|-------|

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|

## Typography
### Font Stack
### Scale (display through caption)

## Spacing
### 8px Grid Scale

## Components
### [Component Name]
- Anatomy, Variants, States, Usage examples, Accessibility notes

## Layout Patterns
### Page layouts (single column, sidebar, dashboard, split)
### Grid system
### Responsive breakpoints

## Density Modes
- Compact, Comfortable, Spacious

## Accessibility
- WCAG 2.1 AA compliance, Keyboard navigation, Screen reader support

## Animation
- Spring physics only (no ease-out), Duration scale

## Anti-Patterns
- What NOT to do (no emoji, no purple gradients, no spinners, etc.)
```

### tokens.css
All CSS custom properties organized by category.

### tokens.json
Structured JSON for programmatic access by other tools.

### base.css
Shared foundation CSS imported by all view designs. Contains:
- CSS reset (`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`)
- Typography scale (body, h1-h6, caption, code) using design system tokens
- Spacing utilities (`.space-xs` through `.space-3xl`)
- Layout utilities (`.container`, `.grid-2col`, `.grid-3col`, `.flex-row`, `.flex-col`)
- Accessibility styles (`:focus-visible`, `.sr-only`)
- Density mode selectors (`[data-density="compact|comfortable|spacious"]`)

### components.css
Reusable component patterns imported by all view designs. Contains:
- `.card` (default, clickable, selected variants)
- `.btn` (primary, secondary, ghost, danger variants + disabled state)
- `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-checkbox`
- `.nav-bar`, `.nav-sidebar`, `.nav-item`
- `.modal`, `.modal__overlay`, `.modal__header`, `.modal__body`
- `.badge` (success, warning, error, info)
- `.avatar`, `.avatar-group`
- `.alert` (info, success, warning, error)
- `.table`, `.table__row`, `.table__cell`
- `.list`, `.list__item`
- `.empty-state`, `.skeleton`, `.skeleton-line`
- `.toast`, `.tab-bar`, `.dropdown`, `.tooltip`

### component-archetypes.html
Visual component library demo — every component in every variant and state.

### page-patterns.html
Layout pattern demos — common page structures using the design system.

### token-reference.html
Interactive token explorer — all colors, typography, spacing values visualized.

## Quality Checklist

- [ ] Every primitive token has a semantic alias
- [ ] All color combinations meet WCAG 2.1 AA contrast
- [ ] Typography scale covers all text sizes needed
- [ ] Spacing follows 8px grid (4px half-unit for tight spacing)
- [ ] Component docs include anatomy, variants, states, accessibility
- [ ] HTML demos render correctly in browser
- [ ] tokens.css and tokens.json are in sync
- [ ] No hardcoded values in demos (all use tokens)
- [ ] Anti-patterns section exists and is comprehensive
- [ ] Density modes documented
- [ ] Responsive breakpoints defined
- [ ] base.css includes: reset, typography scale, spacing utilities, layout utilities, focus/a11y, density modes
- [ ] components.css includes: card, button, form, nav, modal, badge, avatar, alert, table, list, empty-state, skeleton, toast, tab-bar, dropdown
- [ ] All component styles use design system tokens (no raw hex)
- [ ] base.css and components.css are importable by any HTML file
