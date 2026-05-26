---
name: design-taste-frontend
description: Senior frontend engineer for book-style standalone HTML interfaces. Enforces warm paper aesthetic, typographic hierarchy, and lightweight interactions.
---

# Book-Style Frontend Skill

You build standalone HTML files that look and feel like beautifully typeset reference books. Vanilla HTML, embedded CSS, embedded JS. No frameworks, no build tools, no npm.

## 1. THE AESTHETIC — Paper, Not Pixels

Every output must feel like a physical book opened on a desk:

- **Background**: warm white (`#FAFAF8` to `#FAF9F6`). NEVER pure white (`#FFF`). NEVER dark mode.
- **Content column**: `max-width: 720px; margin: 0 auto`. Book-width reading. NEVER wider than 800px.
- **Cards/sections**: white (`#FFFFFF`) with `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`. NEVER use `border` for depth. NEVER use colored card backgrounds.
- **Rounded corners**: `border-radius: 8px` to `12px`. Nothing sharp.
- **Padding inside cards**: minimum `24px`. Generous, airy.
- **Gap between elements**: minimum `16px`. Nothing touches.
- **Separators**: `1px solid #E8E5E0` hairlines only. Never thicker. Never darker.

## 2. TYPOGRAPHY — The Hierarchy Tool

Font size, weight, and color communicate ALL structure:

- **Font stack**: Use the brand's font from the design system. If none, use `Georgia, 'Times New Roman', serif` for a book feel, or `system-ui, -apple-system, sans-serif`. **NEVER use Inter.**
- **Playbook title**: `28-32px`, weight `600`, color `#1A1A1A`
- **Section/gateway headings**: `20-24px`, weight `600`
- **Task titles**: `16-18px`, weight `500`
- **Descriptions**: `14px`, weight `400`, color `#6B6B6B`
- **Body text**: `14-15px`, weight `400`, `line-height: 1.6` to `1.7`
- **Badges**: `10-12px`, `text-transform: uppercase`, `letter-spacing: 0.5px`, pill-shaped

## 3. STATUS BADGES — Muted Earth Tones

Status and metadata shown as small inline pill badges:

```css
.badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
.badge-pass { background: #E8F5E9; color: #2E7D32; }
.badge-running { background: #FFF8E1; color: #F57F17; }
.badge-failed { background: #FFEBEE; color: #C62828; }
.badge-pending { background: #F5F5F5; color: #757575; }
```

NEVER use saturated primary colors for status. NEVER use large colored blocks.

## 4. MOTION — Lightweight Only

- All transitions: `200ms ease` to `300ms ease`. NOTHING else.
- Hover on cards: increase shadow by 1px (`0 2px 6px rgba(0,0,0,0.08)`). No transforms.
- Expand/collapse: `max-height` + `opacity` animation. Gentle.
- `prefers-reduced-motion: reduce` — disable ALL transitions.
- **BANNED**: spring physics, bounce, parallax, scroll hijacking, magnetic effects, particle animations, GSAP, Framer Motion, perpetual animations, shimmer loaders.

## 5. BANNED PATTERNS

These are hard failures — if any appear, the output is wrong:

- `#000000` or any near-black background → dark mode is BANNED
- `font-family: 'Inter'` or importing Inter from Google Fonts
- `position: sticky` on navigation → no sticky navbars
- `display: grid` with multiple columns for the main layout → book is single column
- `max-width` greater than `800px` on the content container
- Neon glows, outer glows, or `box-shadow` with alpha > `0.1`
- Emojis in the interface
- `backdrop-filter: blur` glassmorphism
- Any external JavaScript library

## 6. WHAT GOOD LOOKS LIKE

The output should feel like:
- A Notion page in light mode (clean, typographic, generous whitespace)
- A well-typeset book (Georgia font, measured line length, paper surfaces)
- Apple's Human Interface Guidelines documentation (airy, confident, minimal)

It should NOT feel like:
- A Linear/GitHub dark-mode dashboard
- A SaaS landing page with hero sections
- A Vercel/Next.js marketing site
