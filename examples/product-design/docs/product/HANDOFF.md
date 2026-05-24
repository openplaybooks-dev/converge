# Handoff Document — Portfolio Page

## Executive Summary

A single-page personal portfolio site for a freelance designer. The site serves as a digital storefront — minimal, refined, and focused entirely on showcasing work samples and making it easy for potential clients to get in touch. Built as a static HTML+CSS file with no framework dependencies, delivering sub-2-second load times as a performance trust signal.

**Key facts:**
- Single-page architecture with anchor-based navigation (`#hero`, `#work`, `#about`, `#contact`)
- Static file delivery (no CMS, no server, no database)
- Target: desktop (1024px+) and mobile (375px+)
- No contact form — direct email only

---

## Design System

### Decisions made

| Decision | Rationale |
|---|---|
| Blue (500 scale) as brand color | Professional, not loud; lets work samples be the color |
| Inter for all text | Clean, widely available, excellent screen rendering |
| 8px spacing grid | Predictable rhythm; scales from tight to spacious |
| Spring easing for animations | Feels natural, not mechanical |
| Fixed nav bar with blur backdrop on scroll | Always accessible; doesn't compete with content |
| WCAG 2.1 AA contrast ratios | Accessible to Screening Client personas |

### Token structure

Three levels of CSS custom properties in `.design/tokens.css`:

1. **Primitive tokens** — raw values (e.g., `--color-blue-500: #3B82F6`)
2. **Semantic tokens** — purpose-named (e.g., `--color-brand: var(--color-blue-500)`)
3. **Component tokens** — specific to a component (e.g., `--button-bg`)

Components reference tokens, never raw values. This ensures any token change propagates correctly.

### CSS files

| File | Purpose |
|---|---|
| `tokens.css` | All CSS custom properties (imported first) |
| `base.css` | Reset, typography scale, spacing utilities |
| `components.css` | Component patterns (Button, Card, Nav, etc.) |

### Density modes

Three density modes via `data-density` attribute on any container:
- `compact` — reduced spacing (56px nav, tighter padding)
- `comfortable` — default (64px nav)
- `spacious` — generous whitespace (72px nav, larger section padding)

### Accessibility

- Focus rings: 2px solid `--color-border-focus`, 2px offset
- Reduced motion: respects `prefers-reduced-motion`, disables animations and smooth scroll
- Semantic HTML throughout; no div-soup
- All interactive elements keyboard-navigable

---

## Epics

### MVP (must — ship in v1)

| Epic | Description | Key deliverables |
|---|---|---|
| **Work Showcase** | Thumbnail grid of design samples | Project cards with image, category label, title, year; 3-column grid on desktop, 1 on mobile |
| **Hero & Identity** | Above-fold name, tagline, CTA | h1 with designer name; tagline paragraph; CTA link scrolling to `#work` |
| **Contact & Availability** | Visible email, availability signal | Email `mailto:` link; availability badge; no form |
| **Responsive Performance** | Fast load, stable layout | Static HTML+CSS; `<2s load; no layout shift after initial paint` |

### v2+ (should — defer until after launch)

| Epic | Description | Key deliverables |
|---|---|---|
| **About & Bio** | 2–3 paragraph bio with personality | Text section placed before Contact; optional process note |
| Project detail pages | Individual pages per portfolio item | Out of scope for v1; grid only |
| Blog / articles | Editorial content alongside work | Explicitly out of scope |
| Contact form + backend | Form with database | Email-only for v1 |

---

## Screens

Single page, four sections. Screen count = section count.

| Section | ID | Components used | Notes |
|---|---|---|---|
| Hero | `#hero` | Nav bar, h1, CTA button | Centered layout; full viewport height on desktop |
| Work | `#work` | Section heading, project grid, project cards | 3-col grid desktop, 1-col mobile |
| About | `#about` | Section heading, bio paragraphs | Placed before Contact; only appears if content exists |
| Contact | `#contact` | Section heading, availability badge, email link | Primary conversion point |

### Component usage by screen

| Component | Used in |
|---|---|
| `.nav-bar` | All screens (fixed header) |
| `.btn` | Hero (CTA), Contact (email link styled as button) |
| `.project-card` | Work grid only |
| `.badge` | Contact (availability status) |
| `.card` | Not used in final layout (design system only) |

### Responsive behavior

| Breakpoint | Columns | Nav behavior |
|---|---|---|
| Mobile (<640px) | 1 | Hamburger menu, collapsed nav |
| Tablet (640–1023px) | 2 | Full nav visible |
| Desktop (1024px+) | 3 | Full nav visible |

---

## Next Steps

### Before launch

1. **Replace placeholder content** — all text (name, tagline, bio, project titles) needs real content
2. **Add project images** — replace `picsum.photos` URLs with actual portfolio work; ensure alt text is descriptive
3. **Verify email address** — confirm `mailto:` link uses the correct email
4. **Test on target devices** — latest Chrome, Firefox, Safari, Edge; desktop and mobile physical devices if available
5. **Validate accessibility** — run Lighthouse or axe DevTools; fix any AA failures
6. **Deploy** — Netlify, Vercel, or GitHub Pages (all free for static files)

### File locations

| Asset | Path |
|---|---|
| Design tokens | `.design/tokens.css` |
| Base styles | `.design/base.css` |
| Component styles | `.design/components.css` |
| Component demo | `.design/component-archetypes.html` |
| Prototype viewer | `.design/prototype/index.html` |
| Product brief | `docs/product/PRODUCT_BRIEF.md` |
| Research report | `docs/product/research/RESEARCH_REPORT.md` |
| User personas | `docs/product/research/user-personas.md` |
| Epic definitions | `docs/product/epics.json` |
| Architecture | `docs/product/ARCHITECTURE.md` |
| Scope | `docs/product/SCOPE.md` |
| Sitemap | `docs/product/SITEMAP.md` |
| User journeys | `docs/product/USER_JOURNEYS.md` |

### Implementation order

1. Set up the HTML structure with all four sections and IDs
2. Apply `tokens.css` → `base.css` → `components.css` in order
3. Build the nav bar (fixed, blur on scroll)
4. Build Hero section (centered, h1, CTA)
5. Build Work grid (3-col desktop, responsive)
6. Build About section (bio text)
7. Build Contact section (email link, availability badge)
8. Add responsive breakpoint handling for mobile nav
9. Test and deploy

### Known constraints

- No JavaScript beyond smooth scroll (native CSS `scroll-behavior: smooth`)
- No build step — plain HTML+CSS, deploy directly
- No analytics or tracking in v1
- No contact form — email only