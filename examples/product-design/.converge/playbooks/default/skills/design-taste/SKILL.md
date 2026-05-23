---
name: design-taste
description: Quality gate for design aesthetics — color harmony, typography pairing, spacing consistency, and industry-standard polish
---

# Design Taste

## When to Use This Skill

Apply this skill whenever creating or reviewing design artifacts (DESIGN.md, mockup.html, design.html, design.css). It ensures the output meets industry-standard visual quality.

## Core Principles

### 1. Color Harmony

- **Use a coherent palette**: Primary, secondary, neutral, and semantic colors must work together
- **50-900 scale**: Every color family should have at least 5 steps (50, 100, 300, 500, 700, 900)
- **Contrast ratios**: All text/background combinations must meet WCAG 2.1 AA (4.5:1 for normal text, 3:00 for large text)
- **Semantic colors**: Success (green), Warning (amber), Error (red), Info (blue) — no creative reinterpretations
- **Dark mode**: Every light color must have a dark counterpart
- **Banned**: Purple gradients, gradient text, gradient backgrounds, neon colors

### 2. Typography

- **Two-font maximum**: One for headings (distinctive personality), one for body + mono (readable)
- **Heading font**: Should have character (Geist, Space Grotesk, Inter, Manrope) — not Arial
- **Body font**: Must be highly readable (Inter, Source Sans, Noto Sans, system stack)
- **Mono font**: For all numbers, IDs, paths, code (Geist Mono, JetBrains Mono, IBM Plex Mono)
- **Scale**: Minimum 6 steps (display, h1-h6, body, caption, code)
- **Hierarchy**: Size + weight + color create hierarchy, not all three at once
- **Banned**: Default system fonts without overrides, Comic Sans, Papyrus, more than 3 font families

### 3. Spacing

- **8px grid system**: All spacing is a multiple of 4px (half-unit for tight spacing)
- **Scale**: xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px), 3xl (64px)
- **Consistency**: Same spacing token = same visual space everywhere
- **No magic numbers**: If you can't express it with a spacing token, the token system is incomplete

### 4. Visual Hierarchy

- **Size**: Important things are bigger
- **Weight**: Important things are bolder
- **Color**: Important things are more saturated
- **Whitespace**: Important things have more breathing room
- **Position**: Important things are higher in the visual field

### 5. Component Polish

- **Every interactive element** has hover, focus, active, and disabled states
- **Focus-visible rings** on every keyboard-navigable element (outline: 2px solid accent, outline-offset: 2px)
- **Border radius** is consistent across all rounded elements
- **Shadows** follow a scale (sm, md, lg) — no arbitrary shadow values
- **Transitions** use spring physics, not ease-out curves

### 6. Layout Discipline

- **Grid over flex** for proportional layouts (flex for alignment, grid for structure)
- **Content determines container**, not the reverse
- **Maximum width** for readability (65-75 characters per line)
- **Responsive breakpoints** at 640px (mobile), 1024px (tablet), 1440px (desktop)
- **No horizontal scroll** on any breakpoint

### 7. No-Ugly Rules

- No default browser styles (buttons, inputs, select elements must be styled)
- No system font without a deliberate font stack
- No unbalanced layouts (visual weight must be intentional)
- No placeholder images (use real content shapes or solid color blocks)
- No Lorem Ipsum (domain-specific content always)
- No rounded numbers (100, 1000) — use realistic values like 147, 1,023
- No emoji as icons (use SVG icons — Phosphor preferred)
- No "AI sparkle" or wand iconography
- No purple text or purple backgrounds

### 8. Density Modes

Every design supports three density levels via `data-density` attribute:

- **compact**: Information-dense, smaller spacing, tighter typography (power users)
- **comfortable**: Default balance (most users)
- **spacious**: More whitespace, larger touch targets (casual users, accessibility)

Density is controlled via CSS attribute selectors, not JavaScript:
```css
[data-density="compact"] .card { padding: var(--space-sm); }
[data-density="comfortable"] .card { padding: var(--space-md); }
[data-density="spacious"] .card { padding: var(--space-lg); }
```

### 9. Industry References

When in doubt, reference these products for quality benchmarks:
- **Linear**: Best-in-class SaaS design — clean, fast, information-dense
- **Stripe**: Best-in-class developer design — clear typography, generous whitespace
- **Vercel**: Best-in-class modern web design — bold typography, subtle animations
- **Notion**: Best-in-class productivity design — minimal, content-first, flexible

## Quality Checklist

Before any design artifact is considered "done", verify:

- [ ] All colors use design system tokens (no raw hex)
- [ ] All spacing uses the 8px grid scale
- [ ] All typography uses defined font scale
- [ ] All interactive elements have 4+ states (hover, focus, active, disabled)
- [ ] Focus-visible rings present on keyboard-navigable elements
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Layout works at all three breakpoints (mobile, tablet, desktop)
- [ ] No emoji, no placeholder images, no Lorem Ipsum
- [ ] Content is domain-specific and realistic
- [ ] Density modes supported
- [ ] Semantic HTML structure
- [ ] No purple, no gradients, no sparkles
